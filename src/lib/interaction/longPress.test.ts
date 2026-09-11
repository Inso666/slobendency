// F-22 · Responsives Verhalten und Touch — Unit-Tests für src/lib/interaction/longPress.ts.
// Quelle: features/F-22-responsiv.md, Abschnitt „Trefferflächen", letzter Absatz: „Long-Press
// darf nicht mit Pan verwechselt werden: Bewegt sich der Finger währenddessen um mehr als 10 px,
// gilt es als Drag und das Menü öffnet nicht."

import { describe, expect, it } from 'vitest';
import { exceedsLongPressDragThreshold, LONG_PRESS_DRAG_THRESHOLD_PX } from './longPress';

describe('exceedsLongPressDragThreshold', () => {
	// F-22, Abschnitt „Trefferflächen": ohne jede Fingerbewegung bleibt es ein Long-Press.
	it('liefert false ohne jede Bewegung', () => {
		expect(exceedsLongPressDragThreshold(0, 0)).toBe(false);
	});

	// F-22, Abschnitt „Trefferflächen": kleine Bewegungen (Zittern) bleiben ein Long-Press.
	it('liefert false für eine kleine Bewegung deutlich unter 10 px', () => {
		expect(exceedsLongPressDragThreshold(2, 1)).toBe(false);
	});

	// Der Schwellenwert selbst ist als Konstante exportiert (F-22 nennt „10 px" als Wert der
	// Regel) — dieser Test hält beide auseinander: eine künftige Änderung der Konstante allein
	// bricht diesen Test nicht, solange die Funktion konsistent gegen sie prüft.
	it('exportiert den Schwellenwert 10', () => {
		expect(LONG_PRESS_DRAG_THRESHOLD_PX).toBe(10);
	});

	// F-22, Wortlaut „mehr als 10 px" — eine Bewegung exakt am Schwellenwert überschreitet ihn
	// nicht (strikt „mehr als", nicht „mindestens").
	it('liefert false bei einer Bewegung von exakt 10 px (waagerecht)', () => {
		expect(exceedsLongPressDragThreshold(10, 0)).toBe(false);
	});

	it('liefert false bei einer Bewegung von exakt 10 px (senkrecht)', () => {
		expect(exceedsLongPressDragThreshold(0, 10)).toBe(false);
	});

	// Diagonale Bewegung: Distanz aus dx/dy (Satz des Pythagoras), nicht die einzelnen Achsen.
	// dx=6, dy=8 ergibt exakt Distanz 10 — noch kein Drag.
	it('liefert false bei einer diagonalen Bewegung mit Distanz exakt 10 px', () => {
		expect(exceedsLongPressDragThreshold(6, 8)).toBe(false);
	});

	// Knapp über dem Schwellenwert gilt bereits als Drag.
	it('liefert true bei einer Bewegung knapp über 10 px', () => {
		expect(exceedsLongPressDragThreshold(10.5, 0)).toBe(true);
	});

	it('liefert true bei einer diagonalen Bewegung mit Distanz knapp über 10 px', () => {
		// dx=7, dy=8 → Distanz ≈ 10,63.
		expect(exceedsLongPressDragThreshold(7, 8)).toBe(true);
	});

	// Deutlich über dem Schwellenwert, unabhängig von der Richtung (negative dx/dy).
	it('liefert true bei einer deutlichen Bewegung, auch in negativer Richtung', () => {
		expect(exceedsLongPressDragThreshold(-40, 0)).toBe(true);
		expect(exceedsLongPressDragThreshold(0, -40)).toBe(true);
		expect(exceedsLongPressDragThreshold(-25, 25)).toBe(true);
	});
});
