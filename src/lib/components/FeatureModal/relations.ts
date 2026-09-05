// FeatureModal · Übernahme der Formularzeilen in Kommandos (F-13 ·
// features/F-13-feature-formular.md, Abschnitt "Tests"; PRD FR-06).
//
// Reine Funktion: baut aus den Zeilen des Beziehungs-Abschnitts (RelationRow.svelte) die
// Relation-Objekte, die nach erfolgreichem Speichern des Features einzeln an
// createRelation (src/lib/store/mapStore.ts) übergeben werden (F-13, Abschnitt "Fachregeln":
// "Beziehungen aus dem Formular werden erst nach dem erfolgreichen Speichern des Features
// angelegt"). Prüft nichts, was das Aggregat prüft (features/README.md, Leitplanke 3) — INT-02
// bis INT-04 und die Feldregeln für Kantenlabels bleiben Sache von createRelation.
//
// Signatur ist vom Test-Agenten vorgegeben. Rumpf ist Aufgabe des Feature-Agenten.

import type { FeatureId, Relation, RelationType } from '../../model/types';

/** Eine Zeile des Beziehungs-Abschnitts, bevor sie zu einer Relation wird. */
export interface RelationRowInput {
	targetId: FeatureId;
	type: RelationType;
	/** Leerer Text bedeutet "keine Beschriftung" und wird zu `undefined` (kein leerer String). */
	label: string;
}

/**
 * Baut aus den Formularzeilen Relation-Objekte mit `sourceId` als `from`, in der Reihenfolge
 * der Zeilen.
 */
export function relationsFromRows(sourceId: FeatureId, rows: RelationRowInput[]): Relation[] {
	return rows.map((row) => {
		const relation: Relation = { from: sourceId, to: row.targetId, type: row.type };
		if (row.label !== '') {
			relation.label = row.label;
		}
		return relation;
	});
}
