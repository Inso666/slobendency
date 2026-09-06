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
	throw new Error('not implemented');
}

/**
 * Benennt ein Revier in der Sprache der Oberfläche: *Quick Wins*, *Große Vorhaben*,
 * *Nebenbei*, *Vermeiden* (F-15, Abschnitt "Fachregeln").
 */
export function quadrantLabel(quadrant: Quadrant): string {
	throw new Error('not implemented');
}
