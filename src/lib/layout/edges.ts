// F-10 · Kanten und Signaturenkatalog (features/F-10-kanten.md, Abschnitt „Umfang").
//
// Reine Rechenfunktion über die Beziehungen des Aggregats und die Platzierungen aus F-09,
// ohne Svelte- oder DOM-Bezug (features/README.md, Leitplanke 1). Berechnet je Beziehung eine
// gerade Verbindungsstrecke zwischen den Signaturpunkten, an beiden Enden um feste Trimmwerte
// gekürzt, damit weder die Linie unter dem Punkt beginnt noch die Pfeilspitze bzw. x-Endmarke
// unter dem Zielpunkt verschwindet (F-10, Abschnitt „Akzeptanzkriterien").
//
// Signatur ist vom Test-Agenten vorgegeben (F-10, Abschnitt „Umfang"). Rümpfe sind Aufgabe
// des Feature-Agenten.

import type { Placement } from './jitter';
import type { Relation } from '../model/types';

/** Kürzung am Quellende einer Kante, in Einheiten der viewBox (F-10, Abschnitt „Umfang"). */
export const TRIM_SOURCE = 12;

/** Kürzung am Zielende vor der Pfeilspitze (F-10, Abschnitt „Umfang"). */
export const TRIM_TARGET = 18;

/** Kürzung am Zielende, wenn das Ziel den Vorbedingungsring trägt (F-10, Abschnitt „Umfang"). */
export const TRIM_TARGET_RING = 19;

/** Kürzung am Zielende, wenn Platz für die x-Endmarke gebraucht wird (F-10, Abschnitt „Umfang"). */
export const TRIM_TARGET_EXCLUDE = 22;

/**
 * Berechnete Geometrie einer Kante (F-10, Abschnitt „Umfang"). `x1`/`y1` und `x2`/`y2` sind die
 * bereits getrimmten Endpunkte der Linie; `labelX`/`labelY`/`labelAnchor` die Position und
 * Ausrichtung der Kantenbeschriftung. `crossMark` ist nur bei `excludes`-Beziehungen gesetzt
 * (x-Marke aus zwei gekreuzten Strichen am Ziel-Ende, F-10 „Signaturenkatalog").
 */
export interface EdgeGeometry {
	relation: Relation;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	labelX: number;
	labelY: number;
	labelAnchor: 'start' | 'middle' | 'end';
	crossMark?: { x: number; y: number; angle: number };
}

/**
 * Berechnet für jede Beziehung die Kantengeometrie anhand der Platzierungen aus F-09
 * (F-10, Abschnitt „Umfang").
 */
export function layoutEdges(relations: Relation[], placements: Placement[]): EdgeGeometry[] {
	throw new Error('not implemented');
}
