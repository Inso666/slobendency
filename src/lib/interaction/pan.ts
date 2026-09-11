/*
	F-25 · Datenzoom (features/F-25-datenzoom.md, Abschnitt „Umfang"): der Ausschnitt kennt seit
	F-25 kein gesondertes panBy() mehr — Verschieben (Pan) läuft über centerOn() (Abschnitt
	„Umfang", Kommentar über centerOn(): „dient … auch dem Verschieben (Pan)"). Jeder Aufrufer
	(MapCanvas.svelte für das Ziehen auf freier Fläche, FeatureNodes.svelte für einen Long-Press-
	Zug, der die 10-px-Schwelle aus F-22 überschreitet) braucht dieselbe Umrechnung eines
	Bildschirm-/Inhaltsraum-Zugs in den nächsten centerOn()-Aufruf; ohne diese eine gemeinsame
	Stelle entstünde dieselbe Regel zweimal (features/README.md, Leitplanke 3).

	Reine Rechenfunktion ohne Svelte-, DOM- oder Framework-Bezug (Leitplanke 1) — analog zu
	src/lib/interaction/hitArea.ts und longPress.ts.
*/

/**
 * Liefert den nächsten centerOn()-Mittelpunkt für ein Ziehen auf freier Fläche: `origin` ist der
 * Wertepunkt, der beim Beginn des Zugs unter dem Zeiger lag (unverändert für die Dauer des
 * gesamten Zugs), `current` der Wertepunkt, der ohne Verschieben jetzt unter dem Zeiger läge
 * (mit dem *aktuellen*, ggf. bereits verschobenen Fenster berechnet). Das Ergebnis verschiebt
 * `centerEffort`/`centerImpact` gerade so weit, dass `origin` wieder unter dem Zeiger liegt (F-25,
 * Abschnitt „Verhalten": „Ziehen auf freier Fläche verschiebt den Ausschnitt").
 */
export function panTarget(
	origin: { effort: number; impact: number },
	current: { effort: number; impact: number },
	center: { centerEffort: number; centerImpact: number }
): { centerEffort: number; centerImpact: number } {
	return {
		centerEffort: center.centerEffort + (origin.effort - current.effort),
		centerImpact: center.centerImpact + (origin.impact - current.impact)
	};
}
