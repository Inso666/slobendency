/*
	F-22 · Responsives Verhalten und Touch (features/F-22-responsiv.md, Abschnitt
	„Trefferflächen", erster Absatz):

	„Jede Feature-Signatur bekommt einen unsichtbaren Kreis von mindestens 44 px
	Bildschirmgröße; da die Karte skaliert, wird dieser Radius aus dem aktuellen Maßstab
	gerechnet."

	Reine Rechenfunktion ohne Touch-Events, DOM oder Framework-Bezug, analog zur bereits
	bestehenden Umrechnung `sizeFactor` in src/lib/components/Map/FeatureNodes.svelte (F-12,
	Abschnitt „Verhalten": Schriftgröße wird ebenfalls gegen den aktuellen Maßstab `scale`
	gerechnet, damit sie auf dem Bildschirm nie unter eine Mindestgröße fällt) — dieselbe
	Umrechnungsbasis (eine Karten-Inhaltseinheit entspricht bei Maßstab 1 einem Bildschirmpixel)
	gilt hier für den Trefferflächenradius statt für eine Schriftgröße. `scale` ist der aktuelle
	Zoomfaktor aus src/lib/store/viewport.ts (1 = Grundzustand, laut F-12 zwischen 0,5 und 4
	geklemmt).

	„44 px Bildschirmgröße" eines Kreises lesen diese Tests als Mindestdurchmesser (UI-16: „…
	mindestens 44 × 44 px" — dieselbe Maßeinheit für Trefferflächen an anderer Stelle dieser
	Anwendung, e2e/F-16-verbindungsvorgang.spec.ts prüft Menüeinträge ebenso über ihre
	Kantenlänge). Rumpf ist Aufgabe des Feature-Agenten.
*/

/** Mindestdurchmesser der Trefferfläche auf dem Bildschirm, unabhängig vom Maßstab (F-22,
 * Abschnitt „Trefferflächen"; UI-16). */
export const MIN_HIT_AREA_SCREEN_DIAMETER_PX = 44;

/**
 * Liefert den Radius (in Karten-Inhaltseinheiten des Streudiagramms, siehe VIEWBOX in
 * src/lib/layout/scales.ts) der unsichtbaren Trefferfläche um eine Feature-Signatur bei
 * gegebenem Maßstab `scale`, sodass ihr Durchmesser auf dem Bildschirm nie unter
 * `MIN_HIT_AREA_SCREEN_DIAMETER_PX` fällt (F-22, Abschnitt „Trefferflächen").
 */
export function hitAreaRadiusForScale(scale: number): number {
	throw new Error('not implemented');
}
