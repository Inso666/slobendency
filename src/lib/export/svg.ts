// F-20 · SVG-Export (features/F-20-export-svg.md, Abschnitt „Umfang").
//
// Baut aus dem bereits gerenderten SVG der Karte (MapCanvas.svelte, `<svg class="map">`) ein
// eigenständiges, portables SVG-Dokument: vollständige Karte unabhängig von Zoom/Pan (FR-65),
// neutraler Zustand ohne Selektion/Dimming (FR-67, sofern nicht anders gewählt), Stile und
// Schriften eingebettet (FR-68, NFR-43), damit die Datei auf fremden Rechnern ohne Nachladen
// externer Ressourcen identisch aussieht (F-20-AK).
//
// Reine darstellungsnahe Infrastruktur, keine Fachregel (F-20, Abschnitt „DDD-Einordnung":
// „Der Export arbeitet auf demselben SVG, das die Karte ohnehin rendert; er baut keine zweite
// Zeichenlogik auf"). Deshalb hier bewusst DOM-APIs (SVGSVGElement, XMLSerializer, Blob),
// anders als src/lib/model, graph und dsl (features/README.md, verbindliche Konvention 1 gilt
// ausdrücklich nur für model/, graph/ und dsl/, nicht für export/).
//
// Signatur ist vom Test-Agenten vorgegeben (F-20, Abschnitt „Umfang"). Rümpfe sind Aufgabe des
// Feature-Agenten.

/** Optionen für den SVG-Export (F-20, Abschnitt „Umfang"). */
export interface ExportOptions {
	/**
	 * Selektion, Hervorhebung und Dimming im Export beibehalten, statt sie zurückzunehmen
	 * (F-20, Abschnitt „Ablauf" Schritt 4; PRD FR-67: „sofern nicht anders gewählt"). Standard
	 * (`undefined`/`false`): der Export zeigt den neutralen Zustand — keine `.dim`-/`.sel`-Klassen,
	 * kein Halo.
	 */
	keepSelection?: boolean;
	/**
	 * Farbtafel des Exports. Standard (`undefined`): `'light'` — der Export bleibt bei der
	 * Tagtafel, auch wenn die Oberfläche gerade auf Nacht steht (F-20, Abschnitt „Umfang":
	 * „Standardtafel für den Export ist Tag … eine dunkle Grafik in einer Präsentation ist selten
	 * gewollt").
	 */
	theme?: 'light' | 'dark';
}

/**
 * Baut aus dem gerenderten SVG der Karte (`source`) ein eigenständiges, portables SVG-Dokument
 * als Zeichenkette (F-20, Abschnitt „Ablauf"):
 *
 * 1. Das gerenderte SVG tief klonen.
 * 2. Die Ausschnittstransformation aus F-12 aus dem Klon entfernen.
 * 3. Umschließendes Rechteck über alle Elemente bestimmen, 24 Einheiten Rand addieren und daraus
 *    die `viewBox` des Klons setzen (FR-65).
 * 4. Selektionszustände zurücknehmen: `.dim`, `.sel` und `.halo` entfernen, Kantenbeschriftungen
 *    auf sichtbar setzen, sofern sie zu einer Beziehung mit Beschriftung gehören (FR-67) — außer
 *    `options.keepSelection` ist gesetzt.
 * 5. Alle wirksamen Stilregeln als `<style>`-Block in den Klon einsetzen, mit den Token der
 *    gewählten Tafel (`options.theme`, Standard `'light'`) als feste Werte.
 * 6. Schriften über einen websicheren Stack angeben (FR-68).
 * 7. Hintergrundrechteck in `--paper` als erstes Kind einsetzen.
 * 8. Als Zeichenkette mit `XMLSerializer` ausgeben.
 */
export function buildExportSvg(source: SVGSVGElement, options?: ExportOptions): string {
	throw new Error('not implemented');
}

/**
 * Baut das Export-SVG über {@link buildExportSvg} und löst den Download aus. Dateiname
 * `featuremap-JJJJ-MM-TT.svg` mit dem aktuellen Datum (F-20, Abschnitt „Ablauf" Schritt 8).
 */
export function downloadSvg(source: SVGSVGElement, options?: ExportOptions): void {
	throw new Error('not implemented');
}
