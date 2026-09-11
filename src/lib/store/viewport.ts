// Datenzoom (F-25 · features/F-25-datenzoom.md, Abschnitt „Umfang").
//
// Ersetzt die Struktur aus F-12 (features/F-12-zoom-pan.md) vollständig: Der sichtbare
// Ausschnitt ist nicht mehr eine Bildtransformation (x, y, scale einer `transform`-Gruppe),
// sondern ein veränderter Eingabebereich der Skalenfunktionen aus F-08/F-25
// (src/lib/layout/scales.ts, xOf/yOf/ticksOf mit windowMin/windowMax). Reiner
// Darstellungszustand wie zuvor: der Ausschnitt gehört nicht zum Aggregat FeatureMap und wird
// nicht persistiert (F-25, Abschnitt „DDD-Einordnung") — nach einem Neuladen der Seite startet
// dieses Modul frisch.
//
// centerEffort/centerImpact/visibleRange liegen im unskalierten Wertebereich der Karte
// (demselben Raum, in dem xOf()/yOf() ihre Argumente effort/impact entgegennehmen) — nicht im
// Bildschirm-Pixelraum von VIEWBOX/PLOT. Die Umrechnung von Bildschirm-Pixeln (Mausrad-Zeiger,
// Zeigefinger-Position) in diesen Wertebereich ist Aufgabe der Karten-Komponente, nicht dieses
// Moduls (wie schon in F-12).
//
// Signatur ist vom Test-Agenten vorgegeben (F-25, Abschnitt „Umfang"). Rümpfe sind Aufgabe des
// Feature-Agenten.

import { writable, type Writable } from 'svelte/store';

/**
 * Sichtbarer Ausschnitt der Karte im Wertebereich (F-25, Abschnitt „Umfang"):
 * centerEffort/centerImpact sind die Werte im Zentrum des sichtbaren Fensters, visibleRange ist
 * die Seitenlänge des sichtbaren quadratischen Ausschnitts in Werteeinheiten (1x visibleRange =
 * domainMax bedeutet Vollansicht, siehe resetViewport()). Das sichtbare Fenster ergibt sich
 * daraus je Achse als [center − visibleRange/2, center + visibleRange/2].
 */
export interface Viewport {
	centerEffort: number;
	centerImpact: number;
	visibleRange: number;
}

/**
 * Reaktiver Store des aktuellen Ausschnitts. Der Startwert ist ein Platzhalter für die leere
 * Karte (domainMax 22 nach domainMaxOf() aus F-08: centerEffort = centerImpact = 11,
 * visibleRange = 22) — reine Daten, keine Logik. Sobald eine Karte geladen ist, ist es Aufgabe
 * der Anwendungsschicht, resetViewport(domainMaxOf(map)) mit dem tatsächlichen domainMax
 * aufzurufen; kein Unit-Test dieses Moduls verlässt sich auf diesen Platzhalterwert selbst
 * (siehe viewport.datenzoom.test.ts).
 */
export const viewport: Writable<Viewport> = writable<Viewport>({
	centerEffort: 11,
	centerImpact: 11,
	visibleRange: 22
});

/**
 * Setzt den Ausschnitt auf die Vollansicht des übergebenen Wertebereichs zurück:
 * centerEffort = centerImpact = domainMax / 2, visibleRange = domainMax (F-25, Abschnitt
 * „Umfang", Kommentar über resetViewport()) — Knopf „Ansicht → Ganze Karte zeigen" (F-25,
 * Abschnitt „Verhalten", unverändert gegenüber F-12) sowie beim ersten Laden einer Karte.
 */
export function resetViewport(domainMax: number): void {
	throw new Error('not implemented');
}

/**
 * Zentriert den Ausschnitt auf den Wertepunkt (effort, impact), ohne visibleRange zu ändern
 * (F-25, Abschnitt „Umfang", Kommentar „für F-14, hält visibleRange"). Anders als in F-12 ist
 * das Argument kein Bildschirm-/PLOT-Pixelpunkt, sondern ein Wertepaar aus dem Wertebereich der
 * Karte. Dient sowohl dem Zentrieren beim Klick im Verzeichnis (F-14, unveränderte Signatur)
 * als auch dem Verschieben (Pan) durch Ziehen auf freier Fläche (F-25, Abschnitt „Verhalten"),
 * da kein gesondertes panBy() mehr Teil des Umfangs ist.
 */
export function centerOn(effort: number, impact: number): void {
	throw new Error('not implemented');
}

/**
 * Ändert visibleRange um den Faktor deltaFactor (>1 vergrößert den sichtbaren Bereich = zoomt
 * heraus, <1 verkleinert ihn = zoomt hinein), zentriert auf den Wertepunkt (pointerEffort,
 * pointerImpact) — verbindliche Formel aus F-25, Abschnitt „Verhalten", und PRD 7.3
 * „Datenzoom (FR-25)":
 *
 *   neuerBereich  ← clamp(visibleRange · deltaFactor, domainMax / 4, domainMax)
 *   skalenFaktor  ← neuerBereich / visibleRange
 *   centerEffort  ← pointerEffort + (centerEffort − pointerEffort) · skalenFaktor
 *   centerImpact  ← pointerImpact + (centerImpact − pointerImpact) · skalenFaktor
 *   visibleRange  ← neuerBereich
 *
 * Anschließend werden centerEffort/centerImpact je Achse so geklemmt, dass
 * [center ± visibleRange/2] innerhalb [0, domainMax] bleibt (F-25, Abschnitt „Verhalten",
 * Formel-Kommentar). visibleRange selbst ist auf [domainMax / 4, domainMax] begrenzt — 4x
 * maximal hineingezoomt, 1x = volle Ansicht, kein Herauszoomen darüber hinaus (F-25, Abschnitt
 * „Verhalten").
 */
export function zoomAt(
	deltaFactor: number,
	pointerEffort: number,
	pointerImpact: number,
	domainMax: number
): void {
	throw new Error('not implemented');
}
