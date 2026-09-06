// Detail-Kartusche · Aufbereitung des Inhalts (F-15 · features/F-15-detail-kartusche.md,
// Abschnitt "Tests": "Aufteilung in ein- und ausgehende Beziehungen, Revierbenennung, leerer
// Zustand").
//
// Reine Funktionen für DetailCartouche.svelte. Die Aufteilung selbst stammt aus dem Aggregat
// (`relationsOf`, src/lib/model/validation.ts, F-02) — sie wird hier nicht ein zweites Mal
// umgesetzt (features/README.md, Leitplanke 3), sondern nur um das ergänzt, was allein die
// Anzeige braucht: den Anzeigenamen des Gegenübers (PRD 3.1: fehlt `label`, wird `id`
// angezeigt) und die Blickrichtung der Zeile. Ebenso wird das Revier nicht hier bestimmt —
// das tut `quadrantOf` mit dem aktuellen `domainMax` (F-15, Abschnitt "Fachregeln") — sondern
// nur in der Sprache der Oberfläche benannt (features/README.md, Ubiquitous Language:
// Revier = Quadrant).
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import type { FeatureId, FeatureMap, Quadrant, RelationType } from '../../model/types';
import { relationsOf } from '../../model/validation';

/** Eine Zeile in "Geht aus von hier" bzw. "Führt hierher". */
export interface Bearing {
	/** Kennung des Gegenübers: bei ausgehenden Beziehungen das Ziel, bei eingehenden die Quelle. */
	counterpartId: FeatureId;
	/** Anzeigename des Gegenübers; fehlt er, dessen Kennung (PRD 3.1). */
	name: string;
	type: RelationType;
	/** Beschriftung der Beziehung, sofern vorhanden. */
	label?: string;
}

/** Die beiden Abschnitte der Kartusche (F-15, Abschnitt "Umfang"). */
export interface Bearings {
	outgoing: Bearing[];
	incoming: Bearing[];
}

/**
 * Bereitet die ein- und ausgehenden Beziehungen eines Features für die Anzeige auf. Reihenfolge
 * je Abschnitt ist die der Karte. Ein Feature ohne Beziehungen — und eine unbekannte Kennung —
 * ergeben zwei leere Listen (F-15: "hat es gar keine, steht dort *Keine Beziehungen*").
 */
export function bearingsOf(map: FeatureMap, id: FeatureId): Bearings {
	const { outgoing, incoming } = relationsOf(map, id);

	// PRD 3.1: „label — Anzeigename. Fehlt er, wird id angezeigt."
	function nameOf(counterpartId: FeatureId): string {
		const counterpart = map.features.find((feature) => feature.id === counterpartId);
		return counterpart?.label ?? counterpartId;
	}

	return {
		outgoing: outgoing.map((relation) => ({
			counterpartId: relation.to,
			name: nameOf(relation.to),
			type: relation.type,
			label: relation.label
		})),
		incoming: incoming.map((relation) => ({
			counterpartId: relation.from,
			name: nameOf(relation.from),
			type: relation.type,
			label: relation.label
		}))
	};
}

const QUADRANT_LABELS: Record<Quadrant, string> = {
	quickWins: 'Quick Wins',
	grosseVorhaben: 'Große Vorhaben',
	nebenbei: 'Nebenbei',
	vermeiden: 'Vermeiden'
};

/**
 * Benennt ein Revier in der Sprache der Oberfläche: *Quick Wins*, *Große Vorhaben*,
 * *Nebenbei*, *Vermeiden* (F-15, Abschnitt "Fachregeln").
 */
export function quadrantLabel(quadrant: Quadrant): string {
	return QUADRANT_LABELS[quadrant];
}
