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

import { derived, writable, type Readable } from 'svelte/store';
import { emptyMap } from '../model/validation';
import type { Result } from '../model/validation';
import type { Feature, FeatureId, FeatureMap, Relation } from '../model/types';
import { selectedId } from './selection';

const store = writable<FeatureMap>(emptyMap());

/** Die eine aktive Karte (PRD FR-73). Nur über die Kommandos dieses Moduls veränderbar. */
export const map: Readable<FeatureMap> = { subscribe: store.subscribe };

/**
 * Ersetzt die Karte vollständig (Import, Wiederherstellung) und hebt Selektion sowie einen
 * laufenden Verbindungsvorgang auf.
 */
export function loadMap(next: FeatureMap): void {
	throw new Error('not implemented');
}

/** Leert die Karte. */
export function resetMap(): void {
	throw new Error('not implemented');
}

/** Legt ein Feature an (INT-01, INT-07, Feldregeln aus src/lib/model/validation.ts). */
export function createFeature(input: Feature): Result<void> {
	throw new Error('not implemented');
}

/** Ändert ein bestehendes Feature. */
export function editFeature(id: FeatureId, patch: Partial<Feature>): Result<void> {
	throw new Error('not implemented');
}

/**
 * Benennt die Kennung eines Features um (INT-06, zieht Referenzen in relations nach) und
 * zieht die Selektion auf die neue Kennung nach, falls das umbenannte Feature selektiert war.
 */
export function renameFeatureId(from: FeatureId, to: FeatureId): Result<void> {
	throw new Error('not implemented');
}

/**
 * Entfernt ein Feature samt seiner Beziehungen (INT-02) und hebt eine betroffene Selektion
 * bzw. einen betroffenen Verbindungsvorgang auf (PRD FR-46, FR-13).
 */
export function deleteFeature(id: FeatureId): void {
	throw new Error('not implemented');
}

/** Legt eine Beziehung an (INT-02, INT-03, INT-04). */
export function createRelation(relation: Relation): Result<void> {
	throw new Error('not implemented');
}

/** Ändert Typ und/oder Label einer bestehenden Beziehung. */
export function editRelation(relation: Relation, patch: Partial<Relation>): Result<void> {
	throw new Error('not implemented');
}

/** Entfernt eine Beziehung. */
export function deleteRelation(relation: Relation): void {
	throw new Error('not implemented');
}

// Abgeleitete Stores für die Oberfläche (F-03 „Umfang"). Hier statt in selection.ts abgelegt,
// weil featureCount und relationCount unmittelbar aus `map` folgen und selectedFeature
// zusätzlich `map` braucht, um zu `selectedId` (selection.ts) das zugehörige Feature
// nachzuschlagen.

/** Anzahl der Features in der aktiven Karte. */
export const featureCount: Readable<number> = derived(map, (): number => {
	throw new Error('not implemented');
});

/** Anzahl der Beziehungen in der aktiven Karte. */
export const relationCount: Readable<number> = derived(map, (): number => {
	throw new Error('not implemented');
});

/** Das aktuell selektierte Feature, abgeleitet aus `map` und `selectedId` (selection.ts). */
export const selectedFeature: Readable<Feature | null> = derived(
	[map, selectedId],
	(): Feature | null => {
		throw new Error('not implemented');
	}
);
