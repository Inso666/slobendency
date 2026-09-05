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

/** Seitlicher Versatz der Beschriftung bei steilen Kanten, in Einheiten der viewBox. */
const LABEL_SIDE_OFFSET = 8;

/** Senkrechter Versatz der Beschriftung nach oben bei flachen Kanten. */
const LABEL_VERTICAL_OFFSET = 8;

/** Findet die Platzierung zu einer Kennung oder wirft, falls sie fehlt. */
function placementOf(id: string, byId: Map<string, Placement>): Placement {
	const placement = byId.get(id);
	if (!placement) {
		throw new Error(`Interner Fehler: keine Platzierung für Feature ${id}`);
	}
	return placement;
}

/**
 * Trägt das Ziel bereits den Vorbedingungsring, weil irgendeine `requires`-Beziehung darauf
 * zeigt? Der Ring gehört zum Feature, nicht zur einzelnen Kante — jede Kante, die auf ein
 * solches Ziel zeigt, muss ihn beim Trimmen berücksichtigen.
 */
function targetHasRing(id: string, relations: Relation[]): boolean {
	return relations.some((relation) => relation.to === id && relation.type === 'requires');
}

/**
 * Berechnet für jede Beziehung die Kantengeometrie anhand der Platzierungen aus F-09
 * (F-10, Abschnitt „Umfang").
 */
export function layoutEdges(relations: Relation[], placements: Placement[]): EdgeGeometry[] {
	const byId = new Map(placements.map((placement) => [placement.id, placement]));

	return relations.map((relation): EdgeGeometry => {
		const source = placementOf(relation.from, byId);
		const target = placementOf(relation.to, byId);

		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const length = Math.hypot(dx, dy);
		// Bei praktisch oder exakt deckungsgleichen Punkten ist die Richtung unbestimmt; ein
		// Nullvektor lässt die Trimmung entfallen, statt durch Null zu teilen (NaN/Infinity).
		const ux = length > 0 ? dx / length : 0;
		const uy = length > 0 ? dy / length : 0;

		const targetTrim =
			relation.type === 'excludes'
				? TRIM_TARGET_EXCLUDE
				: targetHasRing(relation.to, relations)
					? TRIM_TARGET_RING
					: TRIM_TARGET;

		const x1 = source.x + ux * TRIM_SOURCE;
		const y1 = source.y + uy * TRIM_SOURCE;
		const x2 = target.x - ux * targetTrim;
		const y2 = target.y - uy * targetTrim;

		// Die Beschriftung sitzt an der Mitte der ungekürzten Verbindung (F-10, Abschnitt
		// „Umfang"), nicht an der Mitte der getrimmten Linie — sonst verschöbe sich die Mitte
		// mit den unterschiedlichen Trimmwerten je Zielart.
		const midX = (source.x + target.x) / 2;
		const midY = (source.y + target.y) / 2;

		let labelX: number;
		let labelY: number;
		let labelAnchor: 'start' | 'middle' | 'end';

		if (Math.abs(dy) > Math.abs(dx)) {
			// Steiler als 45°: seitlicher Versatz, rand- statt mittig ausgerichtet, abhängig von
			// der Laufrichtung (F-10, Abschnitt „Umfang").
			labelAnchor = dx >= 0 ? 'start' : 'end';
			labelX = midX + (dx >= 0 ? LABEL_SIDE_OFFSET : -LABEL_SIDE_OFFSET);
			labelY = midY;
		} else {
			// Flacher als oder genau 45°: mittig, senkrecht nach oben versetzt.
			labelAnchor = 'middle';
			labelX = midX;
			labelY = midY - LABEL_VERTICAL_OFFSET;
		}

		const crossMark =
			relation.type === 'excludes'
				? { x: x2, y: y2, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
				: undefined;

		return { relation, x1, y1, x2, y2, labelX, labelY, labelAnchor, crossMark };
	});
}
