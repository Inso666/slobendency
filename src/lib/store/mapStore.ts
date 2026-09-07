// Kartenstore und Kommandos (F-03 · features/F-03-kartenstore.md, Abschnitt „Umfang").
//
// Anwendungsschicht zwischen Oberfläche und Aggregat: hält die eine aktive Karte (PRD FR-73)
// und bietet Kommandos, die ausschließlich die Aggregatsoperationen aus
// src/lib/model/validation.ts anstoßen und deren Ergebnis übernehmen oder deren Fehler
// unverändert weiterreichen (features/README.md, Leitplanke 3). Anders als model/, graph/
// und dsl/ darf diese Schicht Framework (Svelte-Stores) referenzieren — sie ist die
// Anwendungsschicht, nicht die Domäne.
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import { derived, get, writable, type Readable } from 'svelte/store';
import {
	addFeature,
	addRelation,
	emptyMap,
	removeFeature,
	removeRelation,
	renameFeature,
	updateFeature,
	updateRelation
} from '../model/validation';
import type { Result } from '../model/validation';
import type { Feature, FeatureId, FeatureMap, Relation } from '../model/types';
import { clearSelection, connectSource, connectTarget, selectedId } from './selection';

const store = writable<FeatureMap>(emptyMap());

/** Die eine aktive Karte (PRD FR-73). Nur über die Kommandos dieses Moduls veränderbar. */
export const map: Readable<FeatureMap> = { subscribe: store.subscribe };

/**
 * Übernimmt das Ergebnis einer Aggregatsoperation: bei Erfolg wird die neue Karte in den Store
 * übernommen (ein einziges `set`, also eine einzige Benachrichtigung je Kommando, FR-24); bei
 * Misserfolg wird die Fehlerliste unverändert weitergereicht und der Store bleibt unberührt.
 * Setzt selbst keine Fachregel durch (features/README.md, Leitplanke 3).
 */
function applyResult(result: Result<FeatureMap>): Result<void> {
	if (!result.ok) return result;
	store.set(result.value);
	return { ok: true, value: undefined };
}

/**
 * Ersetzt die Karte vollständig (Import, Wiederherstellung) und hebt Selektion sowie einen
 * laufenden Verbindungsvorgang auf.
 */
export function loadMap(next: FeatureMap): void {
	store.set(next);
	clearSelection();
}

/** Leert die Karte. */
export function resetMap(): void {
	store.set(emptyMap());
}

/** Legt ein Feature an (INT-01, INT-07, Feldregeln aus src/lib/model/validation.ts). */
export function createFeature(input: Feature): Result<void> {
	return applyResult(addFeature(get(store), input));
}

/** Ändert ein bestehendes Feature. */
export function editFeature(id: FeatureId, patch: Partial<Feature>): Result<void> {
	return applyResult(updateFeature(get(store), id, patch));
}

/**
 * Benennt die Kennung eines Features um (INT-06, zieht Referenzen in relations nach) und
 * zieht die Selektion auf die neue Kennung nach, falls das umbenannte Feature selektiert war.
 */
export function renameFeatureId(from: FeatureId, to: FeatureId): Result<void> {
	const result = renameFeature(get(store), from, to);
	if (!result.ok) return result;

	store.set(result.value);
	if (get(selectedId) === from) {
		selectedId.set(to);
	}
	return { ok: true, value: undefined };
}

/**
 * Entfernt ein Feature samt seiner Beziehungen (INT-02) und hebt eine betroffene Selektion
 * bzw. einen betroffenen Verbindungsvorgang auf (PRD FR-46, FR-13). Ein laufender
 * Verbindungsvorgang endet dabei vollständig (Start *und* Ziel, F-16), nicht nur die Hälfte, die
 * zufällig dem gelöschten Feature entsprach — eine halbe Beziehung auf ein nicht mehr
 * existierendes Feature darf nicht offen bleiben (F-16, Abschnitt „DDD-Einordnung").
 */
export function deleteFeature(id: FeatureId): void {
	store.set(removeFeature(get(store), id));
	if (get(selectedId) === id) {
		selectedId.set(null);
	}
	if (get(connectSource) === id || get(connectTarget) === id) {
		connectSource.set(null);
		connectTarget.set(null);
	}
}

/** Legt eine Beziehung an (INT-02, INT-03, INT-04). */
export function createRelation(relation: Relation): Result<void> {
	return applyResult(addRelation(get(store), relation));
}

/**
 * Ändert Typ und/oder Label einer bestehenden Beziehung. `relation` bezeichnet die Beziehung
 * in ihrem aktuellen Stand; ihr Index in `relations` wird nachgeschlagen und an
 * `updateRelation` (F-02) weitergereicht — findet sich kein Index, liefert diese Operation
 * selbst den NOT_FOUND-Fehler des Aggregats, ohne die Regel hier zu duplizieren.
 */
export function editRelation(relation: Relation, patch: Partial<Relation>): Result<void> {
	const current = get(store);
	const index = current.relations.findIndex(
		(r) =>
			r.from === relation.from &&
			r.to === relation.to &&
			r.type === relation.type &&
			r.label === relation.label
	);
	return applyResult(updateRelation(current, index, patch));
}

/** Entfernt eine Beziehung. */
export function deleteRelation(relation: Relation): void {
	store.set(removeRelation(get(store), relation));
}

// Abgeleitete Stores für die Oberfläche (F-03 „Umfang"). Hier statt in selection.ts abgelegt,
// weil featureCount und relationCount unmittelbar aus `map` folgen und selectedFeature
// zusätzlich `map` braucht, um zu `selectedId` (selection.ts) das zugehörige Feature
// nachzuschlagen.

/** Anzahl der Features in der aktiven Karte. */
export const featureCount: Readable<number> = derived(map, ($map): number => $map.features.length);

/** Anzahl der Beziehungen in der aktiven Karte. */
export const relationCount: Readable<number> = derived(
	map,
	($map): number => $map.relations.length
);

/** Das aktuell selektierte Feature, abgeleitet aus `map` und `selectedId` (selection.ts). */
export const selectedFeature: Readable<Feature | null> = derived(
	[map, selectedId],
	([$map, $selectedId]): Feature | null =>
		$map.features.find((f) => f.id === $selectedId) ?? null
);
