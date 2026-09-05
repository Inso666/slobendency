// Kartengerüst: Skalen (F-08 · features/F-08-kartengeruest.md, Abschnitt „Umfang").
//
// Reine Rechenfunktionen ohne Svelte- oder DOM-Bezug (F-08, Abschnitt „DDD-Einordnung"),
// damit sie für sich getestet werden können und der spätere Bildexport (NFR-43) dieselbe
// Struktur wiederverwenden kann.
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.
// VIEWBOX und PLOT stehen bereits als konkrete Werte in features/F-08-kartengeruest.md und
// sind hier wortgleich übernommen, keine zu implementierende Logik.

import { FIBONACCI } from '../model/types';
import type { FeatureMap, Quadrant } from '../model/types';

/** Größe des SVG-Koordinatensystems (F-08, Abschnitt „Umfang"). */
export const VIEWBOX = { width: 1000, height: 700 } as const;

/** Rand der Plotfläche innerhalb von VIEWBOX (F-08, Abschnitt „Umfang"). */
export const PLOT = { left: 80, right: 960, top: 40, bottom: 620 } as const;

/**
 * Obergrenze des dargestellten Wertebereichs: mindestens 22 (FR-26, ein Wert über der
 * Schätzreihe bis 21), sonst eins über dem größten in der Karte vorkommenden impact- oder
 * effort-Wert.
 */
export function domainMaxOf(map: FeatureMap): number {
	let largest = 21;
	for (const feature of map.features) {
		largest = Math.max(largest, feature.impact, feature.effort);
	}
	return largest + 1;
}

/** Rechnet einen Aufwandswert in eine x-Koordinate der Plotfläche um (FR-20). */
export function xOf(effort: number, domainMax: number): number {
	return PLOT.left + (effort / domainMax) * (PLOT.right - PLOT.left);
}

/** Rechnet einen Nutzenwert in eine y-Koordinate der Plotfläche um (FR-20, FR-21: oben = hoch). */
export function yOf(impact: number, domainMax: number): number {
	return PLOT.bottom - (impact / domainMax) * (PLOT.bottom - PLOT.top);
}

/**
 * Liefert die Werte der Schätzreihe (FIBONACCI), die kleiner oder gleich domainMax sind,
 * ergänzt um domainMax - 1, sobald domainMax über 22 liegt (die Karte also einen Wert über 21
 * enthält), damit die Achse ihre Obergrenze zeigt.
 */
export function ticksOf(domainMax: number): number[] {
	const ticks = FIBONACCI.filter((value) => value <= domainMax) as number[];
	if (domainMax > 22) {
		ticks.push(domainMax - 1);
	}
	return ticks;
}

/**
 * Liefert die vier Reviere als Rechtecke innerhalb der Plotfläche, geteilt an domainMax / 2
 * auf beiden Achsen (features/README.md, Abschnitt „Zwei Präzisierungen…", Revier-Grenze).
 */
export function regionRects(
	domainMax: number
): Array<{ quadrant: Quadrant; x: number; y: number; width: number; height: number }> {
	const boundaryX = xOf(domainMax / 2, domainMax);
	const boundaryY = yOf(domainMax / 2, domainMax);

	return [
		{
			quadrant: 'quickWins',
			x: PLOT.left,
			y: PLOT.top,
			width: boundaryX - PLOT.left,
			height: boundaryY - PLOT.top
		},
		{
			quadrant: 'grosseVorhaben',
			x: boundaryX,
			y: PLOT.top,
			width: PLOT.right - boundaryX,
			height: boundaryY - PLOT.top
		},
		{
			quadrant: 'nebenbei',
			x: PLOT.left,
			y: boundaryY,
			width: boundaryX - PLOT.left,
			height: PLOT.bottom - boundaryY
		},
		{
			quadrant: 'vermeiden',
			x: boundaryX,
			y: boundaryY,
			width: PLOT.right - boundaryX,
			height: PLOT.bottom - boundaryY
		}
	];
}
