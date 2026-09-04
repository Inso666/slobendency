// Domänenmodell (F-02 · features/F-02-domaenenmodell.md, Abschnitt „Umfang").
//
// Prüffunktionen und Aggregatsoperationen auf FeatureMap. Jede Operation gibt eine neue
// Karte oder eine Fehlerliste zurück, statt ihr Argument zu mutieren
// (features/README.md, Leitplanke 2). Frameworkfrei — keine Svelte-, $app- oder
// DOM-Bezüge (Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import type { Feature, FeatureId, FeatureMap, Quadrant, Relation } from './types';

/** Verletzung einer Fachregel. `rule` benennt die Regel (z. B. „INT-01"). */
export interface RuleViolation {
	rule: string;
	message: string;
	field?: string;
}

/** Ergebnis einer Aggregatsoperation: entweder eine neue Karte oder gesammelte Fehler. */
export type Result<T> = { ok: true; value: T } | { ok: false; errors: RuleViolation[] };

/** Liefert eine leere Karte mit aktueller Schemaversion. */
export function emptyMap(): FeatureMap {
	throw new Error('not implemented');
}

/** Fügt ein Feature hinzu. Prüft INT-01, INT-07 sowie die Feldregeln für Kennung und Label. */
export function addFeature(map: FeatureMap, feature: Feature): Result<FeatureMap> {
	throw new Error('not implemented');
}

/** Ändert ein bestehendes Feature. Prüft dieselben Feldregeln wie addFeature. */
export function updateFeature(
	map: FeatureMap,
	id: FeatureId,
	patch: Partial<Feature>
): Result<FeatureMap> {
	throw new Error('not implemented');
}

/** Benennt die Kennung eines Features um und zieht alle Referenzen in relations nach (INT-06). */
export function renameFeature(map: FeatureMap, from: FeatureId, to: FeatureId): Result<FeatureMap> {
	throw new Error('not implemented');
}

/** Entfernt ein Feature und alle seine Beziehungen (INT-02, AK-09). */
export function removeFeature(map: FeatureMap, id: FeatureId): FeatureMap {
	throw new Error('not implemented');
}

/** Fügt eine Beziehung hinzu. Prüft INT-02, INT-03, INT-04 sowie die Feldregeln für Kantenlabels. */
export function addRelation(map: FeatureMap, relation: Relation): Result<FeatureMap> {
	throw new Error('not implemented');
}

/** Ändert Typ und/oder Label einer bestehenden Beziehung anhand ihres Index in relations. */
export function updateRelation(
	map: FeatureMap,
	index: number,
	patch: Partial<Relation>
): Result<FeatureMap> {
	throw new Error('not implemented');
}

/** Entfernt eine Beziehung aus der Karte. */
export function removeRelation(map: FeatureMap, relation: Relation): FeatureMap {
	throw new Error('not implemented');
}

/** Liefert alle ein- und ausgehenden Beziehungen eines Features. */
export function relationsOf(
	map: FeatureMap,
	id: FeatureId
): { outgoing: Relation[]; incoming: Relation[] } {
	throw new Error('not implemented');
}

/** Leitet das Revier eines Wertepaars aus der Obergrenze des Wertebereichs ab (nie gespeichert). */
export function quadrantOf(score: { impact: number; effort: number }, domainMax: number): Quadrant {
	throw new Error('not implemented');
}
