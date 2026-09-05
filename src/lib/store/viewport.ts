// Zoom und Pan (F-12 · features/F-12-zoom-pan.md, Abschnitt „Umfang").
//
// Reiner Darstellungszustand: der Ausschnitt gehört nicht zum Aggregat FeatureMap und wird
// nicht persistiert (F-12, Abschnitt „DDD-Einordnung") — nach einem Neuladen der Seite startet
// dieses Modul frisch mit der Vollansicht.
//
// Umgesetzt wird der Ausschnitt über eine `transform`-Gruppe innerhalb des SVG
// (`translate(x y) scale(scale)`), nicht über eine veränderte `viewBox` (F-12, Abschnitt
// „Umfang"): die ursprüngliche `viewBox` aus src/lib/layout/scales.ts (VIEWBOX) bleibt für den
// späteren Bildexport (FR-65) unverändert erhalten. Die hier verwalteten Koordinaten x, y und
// die Punkte, die zoomAt(), panBy() und centerOn() entgegennehmen, liegen deshalb immer im
// unskalierten Koordinatenraum von VIEWBOX/PLOT (F-08) — also demselben Raum, in dem
// xOf()/yOf() ihre Ergebnisse liefern. Die Umrechnung von Bildschirm-Pixeln (Mausrad-Zeiger,
// Zeigefinger-Position) in diesen Raum ist Aufgabe der Karten-Komponente (SVG-CTM), nicht
// dieses Moduls.
//
// Signatur ist vom Test-Agenten vorgegeben, ergänzt um zoomAt() und panBy(), die die
// Featurebeschreibung nicht namentlich nennt, aber deren „Tests"-Abschnitt „Zoom um einen
// Punkt" und deren Verhalten-Tabelle (Mausrad/Pinch, Ziehen) voraussetzt. Rümpfe sind Aufgabe
// des Feature-Agenten.

import { get, writable, type Writable } from 'svelte/store';
import { PLOT, VIEWBOX } from '../layout/scales';

/** Ausschnitt der Karte. scale 1 = Vollansicht (F-12, Abschnitt „Umfang"). */
export interface Viewport {
	x: number;
	y: number;
	scale: number;
}

/** Untere Grenze des Maßstabs (F-12, Abschnitt „Verhalten", Zeile „Grenzen"). */
export const MIN_SCALE = 0.5;

/** Obere Grenze des Maßstabs (F-12, Abschnitt „Verhalten", Zeile „Grenzen"). */
export const MAX_SCALE = 4;

/**
 * Reaktiver Store des aktuellen Ausschnitts. Startwert ist die Vollansicht (x=0, y=0, scale=1)
 * — derselbe Wert, den resetViewport() wiederherstellt und den ein Neuladen der Seite erneut
 * liefert, weil der Store nicht persistiert wird.
 */
export const viewport: Writable<Viewport> = writable<Viewport>({ x: 0, y: 0, scale: 1 });

/**
 * Klemmt den Ausschnitt (x, y) bei gegebenem Maßstab so, dass ein Teil der Plotfläche
 * innerhalb von VIEWBOX sichtbar bleibt (siehe Kommentar über zoomAt()).
 */
function clampOrigin(x: number, y: number, scale: number): { x: number; y: number } {
	const minX = -scale * PLOT.right;
	const maxX = VIEWBOX.width - scale * PLOT.left;
	const minY = -scale * PLOT.bottom;
	const maxY = VIEWBOX.height - scale * PLOT.top;
	return {
		x: Math.min(Math.max(x, minX), maxX),
		y: Math.min(Math.max(y, minY), maxY)
	};
}

/**
 * Setzt den Ausschnitt auf die Vollansicht zurück (Maßstab 1, Ursprung 0/0) — Knopf
 * „Ansicht → Ganze Karte zeigen" (F-12, Abschnitt „Verhalten").
 */
export function resetViewport(): void {
	viewport.set({ x: 0, y: 0, scale: 1 });
}

/**
 * Zentriert den Ausschnitt so, dass der Punkt (x, y) — im unskalierten Koordinatenraum von
 * VIEWBOX/PLOT — in der Mitte der sichtbaren Fläche liegt. Der aktuelle Maßstab bleibt
 * unverändert. Für F-14 (Klick im Verzeichnis zentriert das Feature). Das Ergebnis wird
 * anschließend wie bei zoomAt() und panBy() auf die Plotfläche geklemmt (siehe dort).
 */
export function centerOn(x: number, y: number): void {
	const current = get(viewport);
	const targetX = VIEWBOX.width / 2 - current.scale * x;
	const targetY = VIEWBOX.height / 2 - current.scale * y;
	const clamped = clampOrigin(targetX, targetY, current.scale);
	viewport.set({ x: clamped.x, y: clamped.y, scale: current.scale });
}

/**
 * Ändert den Maßstab um den Faktor `factor` (>1 vergrößert, <1 verkleinert), zentriert auf den
 * Punkt (pointerX, pointerY) — im unskalierten Koordinatenraum von VIEWBOX/PLOT, siehe
 * Modulkommentar. Nach Anwendung von `factor` bleibt der Inhaltspunkt, der vor dem Aufruf genau
 * unter (pointerX, pointerY) lag, an derselben Stelle (F-12-AK „der Punkt unter dem Zeiger
 * bleibt an Ort und Stelle"; auf Mobil ist (pointerX, pointerY) die Mitte der Pinch-Geste).
 * Der resultierende Maßstab wird auf [MIN_SCALE, MAX_SCALE] begrenzt (F-12-AK „Maßstab lässt
 * sich nicht unter 0,5 und nicht über 4 treiben"), danach wird der Ausschnitt so geklemmt, dass
 * weiterhin ein Teil der Plotfläche (PLOT aus src/lib/layout/scales.ts) innerhalb von VIEWBOX
 * sichtbar bleibt (F-12, Abschnitt „Verhalten", Zeile „Grenzen"): x liegt danach im Intervall
 * [-scale·PLOT.right, VIEWBOX.width − scale·PLOT.left], y entsprechend im Intervall
 * [-scale·PLOT.bottom, VIEWBOX.height − scale·PLOT.top].
 */
export function zoomAt(pointerX: number, pointerY: number, factor: number): void {
	const before = get(viewport);
	const contentX = (pointerX - before.x) / before.scale;
	const contentY = (pointerY - before.y) / before.scale;

	const newScale = Math.min(Math.max(before.scale * factor, MIN_SCALE), MAX_SCALE);
	const newX = pointerX - newScale * contentX;
	const newY = pointerY - newScale * contentY;

	const clamped = clampOrigin(newX, newY, newScale);
	viewport.set({ x: clamped.x, y: clamped.y, scale: newScale });
}

/**
 * Verschiebt den Ausschnitt um (dx, dy) — im unskalierten Koordinatenraum von VIEWBOX/PLOT,
 * also unabhängig vom aktuellen Maßstab, weil die Verschiebung in der Transformationskette
 * `translate(x y) scale(scale)` nach der Skalierung greift. Ziehen auf freier Fläche ruft dies
 * mit der Mausbewegung auf, ein Finger-Drag auf Mobil ebenso (F-12, Abschnitt „Verhalten").
 * Anschließend greift dieselbe Klemmung wie bei zoomAt() (siehe dort).
 */
export function panBy(dx: number, dy: number): void {
	const before = get(viewport);
	const clamped = clampOrigin(before.x + dx, before.y + dy, before.scale);
	viewport.set({ x: clamped.x, y: clamped.y, scale: before.scale });
}
