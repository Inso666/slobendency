/*
	F-22 · Responsives Verhalten und Touch (features/F-22-responsiv.md, Abschnitt
	„Trefferflächen", letzter Absatz):

	„Long-Press darf nicht mit Pan verwechselt werden: Bewegt sich der Finger währenddessen um
	mehr als 10 px, gilt es als Drag und das Menü öffnet nicht."

	Reine Schwellenwert-Regel ohne Touch-Events, DOM oder Framework-Bezug — die einzige aus den
	Quellen tatsächlich berechenbare Regel dieses Features (CLAUDE.md, Auftrag an den
	Test-Agenten: "nur wenn die Featurebeschreibung tatsächlich eine berechenbare Regel nennt").
	Rumpf ist Aufgabe des Feature-Agenten; er verdrahtet diese Funktion in den bestehenden
	Long-Press-Timer aus src/lib/components/Map/FeatureNodes.svelte (F-16), der `ontouchmove`
	bislang jede Bewegung unabhängig von ihrer Weite als Abbruch wertet (cancelLongPress()) und
	dabei nie ein Verschieben der Karte auslöst — genau die beiden hier zu behebenden Lücken.
*/

/** Schwellenwert in Bildschirmpixeln, ab dem eine Fingerbewegung während eines laufenden
 * Long-Press als Drag statt als Long-Press gilt (F-22, Abschnitt „Trefferflächen"). */
export const LONG_PRESS_DRAG_THRESHOLD_PX = 10;

/**
 * Liefert `true`, wenn die Fingerbewegung seit Beginn eines laufenden Long-Press — `dx`/`dy` in
 * Bildschirmpixeln, jeweils die Differenz zum Startpunkt der Berührung — den Schwellenwert aus
 * `LONG_PRESS_DRAG_THRESHOLD_PX` überschreitet ("mehr als 10 px", F-22, Abschnitt
 * „Trefferflächen"). Der Vorgang gilt dann als Drag statt als Long-Press: das Kontextmenü öffnet
 * nicht, die Bewegung verschiebt stattdessen die Karte.
 */
export function exceedsLongPressDragThreshold(dx: number, dy: number): boolean {
	return Math.hypot(dx, dy) > LONG_PRESS_DRAG_THRESHOLD_PX;
}
