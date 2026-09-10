// Persistenz im LocalStorage (F-04 · features/F-04-persistenz.md, Abschnitt „Umfang").
//
// Repository-Adapter: kennt das Aggregat, das Aggregat kennt ihn nicht. Abonnent des
// Kartenstores aus F-03 — die Anwendungsschicht ruft ihn nicht aktiv auf
// (features/F-04-persistenz.md, Abschnitt „DDD-Einordnung").
//
// Der gespeicherte Bestand wird beim Lesen nicht blind übernommen, sondern über dieselben
// Aggregatsoperationen wie ein Import aufgebaut (addFeature, addRelation aus
// src/lib/model/validation.ts). Damit lebt jede Fachregel weiterhin nur an einer Stelle im
// Aggregat, statt hier ein zweites Mal — abgeschwächt oder abweichend — nachgebildet zu
// werden (features/README.md, Leitplanke 3).

import { writable, type Readable } from 'svelte/store';
import { addFeature, addRelation, emptyMap } from '../model/validation';
import { SCHEMA_VERSION } from '../model/types';
import type { Feature, FeatureMap, Relation } from '../model/types';
import { loadMap, map } from './mapStore';

const STORAGE_KEY = 'featuremap.map';
const DEBOUNCE_MS = 400;

/** Zustand des Speichervorgangs (F-04, Abschnitt „Umfang"). */
export type StorageState = 'ready' | 'unavailable' | 'quotaExceeded' | 'recovered';

const storageStateStore = writable<StorageState>('ready');

/**
 * Aktueller Speicherzustand. Wird von F-23 in der Fußleiste angezeigt (hier nicht Teil des
 * Umfangs, siehe „Nicht Teil dieses Features").
 */
export const storageState: Readable<StorageState> = { subscribe: storageStateStore.subscribe };

const lastSavedAtStore = writable<Date | null>(null);

/** Zeitpunkt des letzten erfolgreichen Schreibvorgangs, oder `null`, wenn noch keiner stattfand. */
export const lastSavedAt: Readable<Date | null> = { subscribe: lastSavedAtStore.subscribe };

const savingStore = writable<boolean>(false);

/**
 * `true`, solange der zuletzt geänderte Bestand noch nicht geschrieben wurde — also während der
 * Bündelungsfrist (F-04, `DEBOUNCE_MS`). Von F-23 in der Fußleiste angezeigt
 * (statusText.ts, `SaveStatusInput.saving`; hier nicht Teil des Umfangs, siehe „Nicht Teil
 * dieses Features", das die Anzeige ausdrücklich F-23 zuweist, ohne dass F-04 dafür bereits ein
 * Signal bereitstellt — features/F-23-statuszeile.md, Kopfkommentar von statusText.ts).
 */
export const saving: Readable<boolean> = { subscribe: savingStore.subscribe };

/**
 * Liefert das reale `localStorage`-Objekt oder `null`, wenn schon der Zugriff darauf
 * fehlschlägt (NFR-32, z. B. mancher privater Modus).
 */
function getStorage(): Storage | null {
	try {
		return globalThis.localStorage;
	} catch {
		return null;
	}
}

/**
 * Baut aus rohem, ungeprüftem JSON eine gültige Karte auf, indem jedes Feature und jede
 * Beziehung über dieselben Aggregatsoperationen eingefügt wird, die auch der Store benutzt.
 * Liefert `null`, sobald die Struktur nicht passt, ein Pflichtfeld fehlt, die Schemaversion zu
 * neu ist oder eine Invariante verletzt wäre — jeder dieser Fälle gilt als beschädigt (FR-74).
 */
function rebuildMap(parsed: unknown): FeatureMap | null {
	try {
		if (typeof parsed !== 'object' || parsed === null) return null;

		const candidate = parsed as {
			schemaVersion?: unknown;
			features?: unknown;
			relations?: unknown;
		};

		if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion > SCHEMA_VERSION) {
			return null;
		}
		if (!Array.isArray(candidate.features) || !Array.isArray(candidate.relations)) {
			return null;
		}

		let built = emptyMap();

		for (const feature of candidate.features as unknown[]) {
			const result = addFeature(built, feature as Feature);
			if (!result.ok) return null;
			built = result.value;
		}

		for (const relation of candidate.relations as unknown[]) {
			const result = addRelation(built, relation as Relation);
			if (!result.ok) return null;
			built = result.value;
		}

		return built;
	} catch {
		// Jede unerwartete Form (z. B. ein Feature-Eintrag ohne id) führt zu einer Ausnahme in
		// den Feldprüfungen des Aggregats — auch das ist ein beschädigter Bestand, kein Absturz.
		return null;
	}
}

/**
 * Liest den gespeicherten Bestand und validiert ihn; setzt `storageState` entsprechend
 * („ready" ohne oder mit gültigem Bestand, „recovered" bei beschädigtem Inhalt, FR-74).
 */
function restoreFromStorage(storage: Storage): FeatureMap {
	const raw = storage.getItem(STORAGE_KEY);
	if (raw === null) {
		storageStateStore.set('ready');
		return emptyMap();
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		storageStateStore.set('recovered');
		return emptyMap();
	}

	const rebuilt = rebuildMap(parsed);
	if (rebuilt === null) {
		storageStateStore.set('recovered');
		return emptyMap();
	}

	storageStateStore.set('ready');
	return rebuilt;
}

/** Erkennt `QuotaExceededError` unabhängig davon, ob sie als `DOMException` auftritt (NFR-31). */
function isQuotaExceededError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		(error as { name?: unknown }).name === 'QuotaExceededError'
	);
}

let pendingWrite: ReturnType<typeof setTimeout> | null = null;

/**
 * Setzt den gebündelten Schreibvorgang neu an (FR-71): ein noch offener Timer wird verworfen,
 * nicht angehängt — zehn Änderungen in schneller Folge erzeugen so genau einen Schreibvorgang,
 * ausgelöst 400 ms nach der jeweils letzten Änderung.
 */
function scheduleWrite(storage: Storage, next: FeatureMap): void {
	if (pendingWrite !== null) {
		clearTimeout(pendingWrite);
	}

	savingStore.set(true);

	pendingWrite = setTimeout(() => {
		pendingWrite = null;
		savingStore.set(false);
		try {
			storage.setItem(STORAGE_KEY, JSON.stringify(next));
			lastSavedAtStore.set(new Date());
			storageStateStore.set('ready');
		} catch (error) {
			if (isQuotaExceededError(error)) {
				// Die Karte im Speicher (RAM) bleibt unverändert bestehen — es wird nur der
				// Schreibvorgang selbst als gescheitert markiert (NFR-31).
				storageStateStore.set('quotaExceeded');
			}
		}
	}, DEBOUNCE_MS);
}

/**
 * Liest den gespeicherten Stand, übergibt ihn per `loadMap` an den Store und abonniert danach
 * jede Änderung, um sie gebündelt zurückzuschreiben (FR-70 bis FR-74, NFR-31, NFR-32). Einmal
 * beim App-Start aufzurufen, vor dem ersten Rendern der Karte (FR-72).
 */
export function initPersistence(): void {
	const storage = getStorage();
	if (storage === null) {
		storageStateStore.set('unavailable');
		loadMap(emptyMap());
		return;
	}

	loadMap(restoreFromStorage(storage));

	// Svelte-Stores rufen den Subscriber sofort beim Abonnieren mit dem aktuellen Wert auf —
	// das ist hier ausdrücklich erwünscht: FR-70 verlangt, dass der komplette Datenbestand
	// automatisch gespeichert wird, auch wenn er (mangels vorherigem Bestand oder wegen eines
	// beschädigten Rohwerts) nur aus der gerade wiederhergestellten leeren Karte besteht. Ohne
	// diesen ersten Schreibvorgang bliebe ein beschädigter Speicherwert bestehen, obwohl die
	// Karte im Speicher (RAM) längst die gültige, leere Fassung zeigt.
	map.subscribe((current) => {
		scheduleWrite(storage, current);
	});
}
