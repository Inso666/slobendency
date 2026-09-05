// F-04 · Persistenz im LocalStorage — Unit-Tests (features/F-04-persistenz.md).
//
// Arbeitet gegen einen gefälschten Speicher (das reale, von jsdom bereitgestellte
// `localStorage`, dessen Methoden pro Test gespäht bzw. überschrieben werden) und lädt die
// Store-Module vor jedem Test frisch, damit die Store-Singletons aus F-03
// (src/lib/store/mapStore.ts) und der hier zu prüfende Persistenz-Adapter nicht über
// Testfälle hinweg Abonnenten ansammeln.
//
// Zuordnung der Tests zu den Akzeptanzkriterien aus F-04-persistenz.md folgt der Reihenfolge
// der dortigen Checkbox-Liste (F-04-AK1 … F-04-AK6); AK-02 ist zusätzlich die einzige von der
// PRD benannte Kennung und bekommt hier den Restaurierungs-Teil, den Kern des Kriteriums
// („nach F5 unverändert vorhanden") prüft der E2E-Test in e2e/F-04-persistenz.spec.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { emptyMap } from '../model/validation';
import { SCHEMA_VERSION } from '../model/types';

const STORAGE_KEY = 'featuremap.map';

/**
 * Lädt mapStore.ts und persistence.ts als frische Modulinstanzen. Nötig, weil beide Module
 * modul-scope Singletons halten (den Kartenstore bzw. seine Abonnements); ohne Reset würden
 * sich über mehrere Tests hinweg Abonnenten der vorherigen Testläufe ansammeln.
 */
async function freshModules() {
	vi.resetModules();
	const mapStore = await import('./mapStore');
	const persistence = await import('./persistence');
	return { mapStore, persistence };
}

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('F-04 · Persistenz im LocalStorage', () => {
	// FR-70, Basisfall: kein gespeicherter Bestand beim allerersten Start ist kein
	// Beschädigungsfall — die Karte bleibt leer, der Zustand ist „ready".
	it('startet ohne gespeicherten Bestand mit leerer Karte und Zustand ready', async () => {
		const { mapStore, persistence } = await freshModules();

		expect(() => persistence.initPersistence()).not.toThrow();

		expect(get(mapStore.map)).toEqual(emptyMap());
		expect(get(persistence.storageState)).toBe('ready');
	});

	// F-04-AK1 / FR-71: „Nach einer Änderung und 400 ms Ruhe steht der neue Stand im
	// LocalStorage; zehn Änderungen in schneller Folge erzeugen einen einzigen Schreibvorgang."
	it('bündelt zehn schnelle Änderungen in genau einen Schreibvorgang nach 400 ms Ruhe', async () => {
		const { mapStore, persistence } = await freshModules();
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

		persistence.initPersistence();
		setItemSpy.mockClear();

		for (let i = 0; i < 10; i++) {
			const result = mapStore.createFeature({ id: `f${i}`, impact: 1, effort: 1 });
			expect(result.ok).toBe(true);
		}

		// Vor Ablauf der Ruhezeit ist noch nichts geschrieben.
		vi.advanceTimersByTime(399);
		expect(setItemSpy).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(setItemSpy).toHaveBeenCalledTimes(1);

		const written = JSON.parse(setItemSpy.mock.calls[0][1] as string);
		expect(written.features).toHaveLength(10);
	});

	// F-04-AK1 / FR-71, Fortsetzung: „ein noch offener Schreibvorgang wird verworfen, nicht
	// angehängt" — eine Änderung während der Ruhezeit setzt die 400 ms neu an, statt einen
	// zweiten Schreibvorgang zusätzlich auszulösen.
	it('verwirft einen noch offenen Schreibvorgang, statt ihn anzuhängen', async () => {
		const { mapStore, persistence } = await freshModules();
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

		persistence.initPersistence();
		setItemSpy.mockClear();

		mapStore.createFeature({ id: 'a', impact: 1, effort: 1 });
		vi.advanceTimersByTime(200);
		expect(setItemSpy).not.toHaveBeenCalled();

		mapStore.createFeature({ id: 'b', impact: 2, effort: 2 });
		vi.advanceTimersByTime(200);
		// Erst 200 ms seit der zweiten Änderung vergangen — noch keine 400 ms Ruhe.
		expect(setItemSpy).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(setItemSpy).toHaveBeenCalledTimes(1);

		const written = JSON.parse(setItemSpy.mock.calls[0][1] as string);
		expect(written.features.map((f: { id: string }) => f.id).sort()).toEqual(['a', 'b']);
	});

	// FR-70: fester Schlüssel, Wert ist das JSON des Aggregats inklusive schemaVersion.
	it('schreibt unter dem Schlüssel featuremap.map das JSON des kompletten Aggregats', async () => {
		const { mapStore, persistence } = await freshModules();

		persistence.initPersistence();
		mapStore.createFeature({ id: 'a', label: 'Beispiel', impact: 5, effort: 3 });
		vi.advanceTimersByTime(400);

		const raw = localStorage.getItem(STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw as string)).toEqual(get(mapStore.map));
		expect(JSON.parse(raw as string).schemaVersion).toBe(SCHEMA_VERSION);
	});

	// FR-73: genau eine Karte, ein einziger Schlüssel, kein Namensraum für mehrere Karten.
	it('verwendet genau einen Schlüssel im LocalStorage', async () => {
		const { mapStore, persistence } = await freshModules();

		persistence.initPersistence();
		mapStore.createFeature({ id: 'a', impact: 1, effort: 1 });
		vi.advanceTimersByTime(400);

		expect(localStorage.length).toBe(1);
		expect(localStorage.key(0)).toBe(STORAGE_KEY);
	});

	// AK-02 (Restaurierungsteil) / FR-72: der gespeicherte Stand wird beim Start
	// zurückgeschrieben, bevor die Karte das erste Mal gerendert wird — also synchron
	// innerhalb von initPersistence, ohne dass Zeit vergehen muss.
	it('stellt beim Start den zuletzt gespeicherten Bestand sofort wieder her', async () => {
		const gespeichert = {
			schemaVersion: SCHEMA_VERSION,
			features: [
				{ id: 'a', label: 'Erstes Feature', impact: 8, effort: 3 },
				{ id: 'b', impact: 2, effort: 5 }
			],
			relations: [{ from: 'a', to: 'b', type: 'requires' as const }]
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(gespeichert));

		const { mapStore, persistence } = await freshModules();
		persistence.initPersistence();

		expect(get(mapStore.map)).toEqual(gespeichert);
		expect(get(persistence.storageState)).toBe('ready');
	});

	// F-04-AK3 / FR-74: ungültiges JSON führt zu leerer Karte, Zustand recovered — nicht zum
	// Absturz.
	it('behandelt ungültiges JSON als beschädigt: leere Karte, Zustand recovered', async () => {
		localStorage.setItem(STORAGE_KEY, '{kaputt');

		const { mapStore, persistence } = await freshModules();

		expect(() => persistence.initPersistence()).not.toThrow();
		expect(get(mapStore.map)).toEqual(emptyMap());
		expect(get(persistence.storageState)).toBe('recovered');
	});

	// FR-74: fehlende Pflichtfelder (hier: Feature ohne id) gelten ebenfalls als beschädigt.
	it('behandelt einen Bestand mit fehlendem Pflichtfeld als beschädigt', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				schemaVersion: SCHEMA_VERSION,
				features: [{ label: 'Ohne Kennung', impact: 1, effort: 1 }],
				relations: []
			})
		);

		const { mapStore, persistence } = await freshModules();

		expect(() => persistence.initPersistence()).not.toThrow();
		expect(get(mapStore.map)).toEqual(emptyMap());
		expect(get(persistence.storageState)).toBe('recovered');
	});

	// FR-74: eine verletzte Invarianz (hier: INT-02, Beziehung verweist auf unbekanntes
	// Feature) gilt ebenfalls als beschädigt, nicht als silently-akzeptierter Zustand.
	it('behandelt einen Bestand mit verletzter Invariante als beschädigt', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				schemaVersion: SCHEMA_VERSION,
				features: [{ id: 'a', impact: 1, effort: 1 }],
				relations: [{ from: 'a', to: 'unbekannt', type: 'requires' }]
			})
		);

		const { mapStore, persistence } = await freshModules();

		expect(() => persistence.initPersistence()).not.toThrow();
		expect(get(mapStore.map)).toEqual(emptyMap());
		expect(get(persistence.storageState)).toBe('recovered');
	});

	// F-04-AK4: eine höhere als die unterstützte Schemaversion wird wie beschädigt behandelt
	// (DSL-07 sinngemäß), nicht stillschweigend geladen.
	it('behandelt eine zu neue Schemaversion als beschädigt', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, features: [], relations: [] })
		);

		const { mapStore, persistence } = await freshModules();

		expect(() => persistence.initPersistence()).not.toThrow();
		expect(get(mapStore.map)).toEqual(emptyMap());
		expect(get(persistence.storageState)).toBe('recovered');
	});

	// F-04-AK5 / NFR-31: QuotaExceededError beim Schreiben darf die im Speicher (RAM)
	// gehaltene Karte nicht zurückrollen; der Zustand wechselt auf quotaExceeded.
	it('behält die Karte im Speicher, wenn das Schreiben mit QuotaExceededError scheitert', async () => {
		const { mapStore, persistence } = await freshModules();

		persistence.initPersistence();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('Kontingent überschritten', 'QuotaExceededError');
		});

		const result = mapStore.createFeature({ id: 'a', impact: 1, effort: 1 });
		expect(result.ok).toBe(true);

		expect(() => vi.advanceTimersByTime(400)).not.toThrow();

		expect(get(mapStore.map).features.map((f) => f.id)).toEqual(['a']);
		expect(get(persistence.storageState)).toBe('quotaExceeded');
	});

	// F-04-AK6 / NFR-32: ist localStorage nicht erreichbar (z. B. privater Modus mancher
	// Browser wirft beim Zugriff selbst), läuft die Anwendung im Sitzungsmodus weiter.
	it('startet im Sitzungsmodus mit leerer Karte, wenn localStorage nicht erreichbar ist', async () => {
		const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get(): Storage {
				throw new DOMException('Zugriff verweigert', 'SecurityError');
			}
		});

		try {
			const { mapStore, persistence } = await freshModules();

			expect(() => persistence.initPersistence()).not.toThrow();
			expect(get(mapStore.map)).toEqual(emptyMap());
			expect(get(persistence.storageState)).toBe('unavailable');
		} finally {
			if (original) {
				Object.defineProperty(globalThis, 'localStorage', original);
			}
		}
	});

	// lastSavedAt: leer, bis der erste erfolgreiche Schreibvorgang stattgefunden hat.
	it('lastSavedAt ist zu Beginn leer', async () => {
		const { persistence } = await freshModules();
		expect(get(persistence.lastSavedAt)).toBeNull();
	});

	// lastSavedAt: wird nach einem erfolgreichen, gebündelten Schreibvorgang gesetzt.
	it('lastSavedAt wird nach einem erfolgreichen Schreibvorgang gesetzt', async () => {
		const { mapStore, persistence } = await freshModules();

		persistence.initPersistence();
		mapStore.createFeature({ id: 'a', impact: 1, effort: 1 });
		vi.advanceTimersByTime(400);

		expect(get(persistence.lastSavedAt)).toBeInstanceOf(Date);
	});
});
