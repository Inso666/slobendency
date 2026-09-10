// F-21 · PNG-Export (features/F-21-export-png.md, Abschnitt „Umfang").
//
// Baut aus dem bereits gerenderten SVG der Karte ein Rasterbild in wählbarer Auflösung (FR-64),
// unabhängig vom aktuellen Zoom/Pan-Zustand (FR-65), mit demselben vollständigen Inhalt wie der
// SVG-Export (FR-66) und im neutralen Zustand (FR-67) — es gibt keine zweite Zeichenlogik: F-21
// baut auf buildExportSvg() aus F-20 auf (F-21, Abschnitt „DDD-Einordnung": „Setzt vollständig
// auf dem Ergebnis von F-20 auf; es gibt keine zweite Zeichenlogik und keinen zweiten
// Neutralisierungspfad").
//
// Ablauf nach F-21, Abschnitt „Umfang", wortgleich mit PRD 7.3 „PNG-Export (FR-64/65)":
//   1. Exportfähiges SVG über buildExportSvg erzeugen.
//   2. Als Daten-URL in ein Image laden und dessen decode() abwarten.
//   3. Canvas mit breite × faktor und höhe × faktor anlegen, ctx.scale(faktor, faktor).
//   4. Ist der Hintergrund nicht durchsichtig gewünscht, zuerst die Fläche füllen — standardmäßig
//      weiß (FR-69), bei gewählter Nachttafel in deren --paper.
//   5. Zeichnen, toBlob('image/png'), Download mit Dateiname featuremap-JJJJ-MM-TT@Nx.png
//      (Faktor im Namen).
//
// Reine darstellungsnahe Infrastruktur, keine Fachregel (dieselbe Begründung wie svg.ts, F-20,
// Abschnitt „DDD-Einordnung"). Deshalb hier bewusst DOM-/Canvas-APIs (SVGSVGElement, Image,
// HTMLCanvasElement, Blob), anders als src/lib/model, graph und dsl (features/README.md,
// verbindliche Konvention 1 gilt ausdrücklich nur für model/, graph/ und dsl/, nicht für
// export/). Aus demselben Grund ist src/lib/export/ von der Leitplanke „keine Farbbezüge
// außerhalb von app.css" ausdrücklich ausgenommen (svg.ts, Kommentar bei THEME_TOKENS) — die
// beiden Hintergrundfarben unten (WHITE_BACKGROUND, DARK_PAPER_BACKGROUND) sind deshalb bewusst
// fest im Modul hinterlegt, nicht aus app.css nachgeschlagen.
//
// Signatur (PngScale, PngOptions, downloadPng) ist vom Test-Agenten aus F-21, Abschnitt „Umfang"
// wortgleich übernommen. Zusätzlich drei reine, DOM-freie Hilfsfunktionen (pngCanvasSize,
// pngBackgroundFill, pngFilename) — analog zu exportFile.ts (F-19) und exportSvgFilename (F-20,
// dort nicht exportiert, hier bewusst exportiert, weil F-21, Abschnitt „Tests" explizit
// „Unit: Größenrechnung je Faktor, Hintergrundfüllung, Dateiname" verlangt und diese drei
// Berechnungen ohne echtes Canvas/Image nur als eigenständige, exportierte Funktionen testbar
// sind). Rümpfe sind Aufgabe des Feature-Agenten (features/README.md, Regeln für den
// Test-Agenten).
//
// downloadPng() selbst wird hier bewusst NICHT unit-getestet: jsdom bietet weder eine
// funktionsfähige Canvas-2D-Kontextimplementierung noch HTMLImageElement.decode() oder
// HTMLCanvasElement.toBlob() (dasselbe Argument wie bei downloadSvg() in svg.test.ts, F-20,
// Kopfkommentar). downloadPng() wird deshalb vollständig in e2e/F-21-export-png.spec.ts geprüft
// (echter Download-Event in einem echten Browser, der echtes Canvas-Rendering beherrscht).

import { buildExportSvg, type ExportOptions } from './svg';

/** Skalierungsfaktor des PNG-Exports (F-21, Abschnitt „Umfang", FR-64: „wählbarer Faktor
 * 1×, 2×, 4×"). */
export type PngScale = 1 | 2 | 4;

/** Optionen für den PNG-Export (F-21, Abschnitt „Umfang"). Erbt `theme` von {@link ExportOptions}
 * — derselbe Tafelumschalter wie beim SVG-Export (F-20), hier für den Bildexport wiederverwendet
 * (F-21: „... und den Tafelumschalter aus F-20"), kein zweiter Mechanismus für dieselbe Sache
 * (features/README.md, Leitplanke 3). */
export interface PngOptions extends ExportOptions {
	scale: PngScale;
	/** Durchsichtiger statt weißer Hintergrund (FR-69: „transparenter Hintergrund als Option").
	 * Standard (`undefined`/`false`): weißer Hintergrund. */
	transparent?: boolean;
}

/** Weißer Standardhintergrund des PNG-Exports (F-21, Abschnitt „Ablauf" Schritt 4, FR-69:
 * „standardmäßig weiß") — bewusst reines Weiß, nicht der etwas wärmere `--paper`-Ton der
 * Tagtafel (`#fafaf6`, svg.ts), weil FR-69 wörtlich „weißer Hintergrund" verlangt und Folien/
 * Tickets/Confluence (F-21, Abschnitt „Ziel") einen neutralen, druckfesten Weißton erwarten. */
const WHITE_BACKGROUND = '#ffffff';

/** Hintergrund des PNG-Exports bei gewählter Nachttafel (F-21, Abschnitt „Ablauf" Schritt 4:
 * „bei gewählter Nachttafel in deren --paper") — wortgleich mit dem `--paper`-Token der
 * Nachttafel aus src/app.css bzw. svg.ts THEME_TOKENS.dark.paper. */
const DARK_PAPER_BACKGROUND = '#0d161a';

/**
 * Pixelgröße des Canvas für einen gegebenen Skalierungsfaktor (F-21, Abschnitt „Ablauf" Schritt
 * 3: „Canvas mit breite × faktor und höhe × faktor anlegen"; Abschnitt „Tests": „Unit:
 * Größenrechnung je Faktor"; AK-11: „PNG bei 4× hat exakt die vierfache Pixelbreite gegenüber
 * 1×"). `viewBox` ist Breite/Höhe des exportfähigen SVG (buildExportSvg(), F-20) in SVG-Einheiten
 * — unabhängig vom aktuellen Zoom/Pan-Zustand (FR-65), weil buildExportSvg() das bereits
 * sicherstellt.
 */
export function pngCanvasSize(
	viewBox: { width: number; height: number },
	scale: PngScale
): { width: number; height: number } {
	// Die viewBox aus buildExportSvg() (F-20) kann gebrochene SVG-Einheiten enthalten (reale
	// Bounding Boxes, Schritt 3 dort). Canvas-Pixelmaße sind ganzzahlig; auf ganze Einheiten
	// gerundet, BEVOR mit dem Faktor multipliziert wird, garantiert das die von AK-11 verlangte
	// exakte Vervierfachung bei 4× gegenüber 1× für jede reale viewBox — würde stattdessen jede
	// Auflösung unabhängig aus der ungerundeten viewBox berechnet, könnten unterschiedliche
	// Rundungsfehler je Faktor das Verhältnis verfälschen.
	const width = Math.round(viewBox.width);
	const height = Math.round(viewBox.height);
	return { width: width * scale, height: height * scale };
}

/**
 * Hintergrundfüllung des PNG-Exports, oder `null` für durchsichtig (F-21, Abschnitt „Ablauf"
 * Schritt 4; FR-69; Abschnitt „Tests": „Unit: ... Hintergrundfüllung"). `options.transparent`
 * hat Vorrang vor der Tafel — ein transparenter Export bleibt transparent, unabhängig davon,
 * welche Tafel sonst gewählt ist.
 */
export function pngBackgroundFill(options: PngOptions): string | null {
	if (options.transparent) return null;
	return options.theme === 'dark' ? DARK_PAPER_BACKGROUND : WHITE_BACKGROUND;
}

/**
 * Dateiname für den Download: `featuremap-JJJJ-MM-TT@Nx.png` mit dem übergebenen Datum und
 * Skalierungsfaktor im Namen (F-21, Abschnitt „Ablauf" Schritt 5: „Download mit Dateiname
 * featuremap-JJJJ-MM-TT@2x.png (Faktor im Namen)"; Abschnitt „Tests": „Unit: ... Dateiname").
 * Dasselbe Datumsformat wie exportFilename() (F-19) und exportSvgFilename() (F-20).
 */
export function pngFilename(date: Date, scale: PngScale): string {
	const year = String(date.getFullYear()).padStart(4, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `featuremap-${year}-${month}-${day}@${scale}x.png`;
}

/**
 * Baut das PNG über {@link pngCanvasSize}/{@link pngBackgroundFill} und löst den Download aus
 * (F-21, Abschnitt „Ablauf"):
 *
 * 1. Exportfähiges SVG über `buildExportSvg` (F-20) erzeugen.
 * 2. Als Daten-URL in ein `Image` laden und dessen `decode()` abwarten.
 * 3. Canvas mit `breite × faktor` und `höhe × faktor` anlegen, `ctx.scale(faktor, faktor)`.
 * 4. Ist der Hintergrund nicht durchsichtig gewünscht, zuerst die Fläche füllen.
 * 5. Zeichnen, `toBlob('image/png')`, Download mit Dateiname `featuremap-JJJJ-MM-TT@Nx.png`.
 *
 * NFR-06: bei Faktor 4× und 100 Features unter 3 Sekunden. Scheitert die Erzeugung (z. B.
 * `decode()` schlägt fehl), wirft/verwirft diese Funktion — der Aufrufer (src/routes/+page.svelte)
 * zeigt daraufhin einen Hinweis (F-21-AK: „Scheitert die Erzeugung, erscheint ein Hinweis, und
 * die Anwendung bleibt bedienbar").
 */
export async function downloadPng(source: SVGSVGElement, options: PngOptions): Promise<void> {
	// Vor Schritt 1: Web-Fonts abwarten (src/app.html lädt Fraunces/Karla/Azeret Mono über
	// Google Fonts mit display=swap). buildExportSvg() misst die Bounding Box über getBBox()
	// (F-20, Ablauf Schritt 3) — solange der Browser noch die Ersatzschrift zeigt, fällt diese
	// Messung schmaler aus als nach dem Schriftwechsel. AK-11 verlangt aber eine exakt
	// reproduzierbare Vervierfachung zwischen zwei unabhängigen Exporten derselben,
	// unveränderten Karte; ohne diese Wartezeile könnte der erste Export (kurz nach dem Laden,
	// noch mit Ersatzschrift) eine andere Bounding Box liefern als ein späterer. Kein Einfluss
	// auf F-20 (dort unverändert synchron, `buildExportSvg` bleibt unangetastet).
	if (typeof document.fonts?.ready !== 'undefined') {
		await document.fonts.ready;
	}

	// Schritt 1: exportfähiges SVG über buildExportSvg() (F-20) erzeugen — keine zweite
	// Zeichenlogik (F-21, Abschnitt „DDD-Einordnung"). background:false lässt das sonst stets
	// eingefügte Hintergrundrechteck aus Schritt 7 dort weg (svg.ts, Kommentar bei
	// ExportOptions.background) — die Hintergrundfarbe übernimmt stattdessen die
	// Canvas-Füllung weiter unten (pngBackgroundFill), sonst könnte "transparent" nie
	// tatsächlich durchsichtig rastern.
	const svgString = buildExportSvg(source, {
		theme: options.theme,
		keepSelection: options.keepSelection,
		background: false
	});

	// Die viewBox von buildExportSvg() bestimmt die Bildmaße (FR-65, unabhängig vom aktuellen
	// Zoom/Pan) — hier aus dem bereits fertigen SVG-Text gelesen (keine zweite Bounding-Box-
	// Berechnung). Ein <img> ohne explizite width/height-Attribute würde stattdessen mit dem
	// SVG-Standardmaß 300×150 laden, unabhängig von der viewBox — deshalb werden beide vor dem
	// Laden explizit auf die viewBox-Maße gesetzt.
	const parsed = new DOMParser().parseFromString(svgString, 'image/svg+xml');
	const svgEl = parsed.documentElement as unknown as SVGSVGElement;
	const viewBox = svgEl.viewBox.baseVal;
	svgEl.setAttribute('width', String(viewBox.width));
	svgEl.setAttribute('height', String(viewBox.height));
	const serialized = new XMLSerializer().serializeToString(svgEl);

	// Schritt 2: als Daten-URL in ein Image laden, decode() abwarten — scheitert das (z. B.
	// fehlerhaftes/zu großes SVG), verwirft downloadPng() hier, der Aufrufer
	// (src/routes/+page.svelte) zeigt daraufhin den Hinweis (F-21-AK).
	const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
	const image = new Image();
	image.src = dataUrl;
	await image.decode();

	// Schritt 3: Canvas mit breite × faktor und höhe × faktor anlegen, ctx.scale(faktor, faktor).
	// pngCanvasSize rundet die viewBox einmalig auf ganze Einheiten (AK-11) — dieselben
	// gerundeten Maße (nicht die ungerundete viewBox) dienen unten als Zeichenfläche in der
	// skalierten Koordinatenebene, damit Füllung und Zeichnung den Canvas bis zum letzten Pixel
	// decken (sonst bliebe bei gebrochener viewBox ein unlackierter Saum am Rand).
	const canvasSize = pngCanvasSize({ width: viewBox.width, height: viewBox.height }, options.scale);
	const drawWidth = canvasSize.width / options.scale;
	const drawHeight = canvasSize.height / options.scale;

	const canvas = document.createElement('canvas');
	canvas.width = canvasSize.width;
	canvas.height = canvasSize.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('PNG-Export: Canvas-2D-Kontext nicht verfügbar.');
	}
	ctx.scale(options.scale, options.scale);

	// Schritt 4: ist der Hintergrund nicht durchsichtig gewünscht, zuerst die Fläche füllen.
	const fill = pngBackgroundFill(options);
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fillRect(0, 0, drawWidth, drawHeight);
	}

	// Schritt 5: zeichnen, toBlob('image/png'), Download mit Dateiname.
	ctx.drawImage(image, 0, 0, drawWidth, drawHeight);

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((result) => {
			if (result) resolve(result);
			else reject(new Error('PNG-Export: Rasterung fehlgeschlagen.'));
		}, 'image/png');
	});

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = pngFilename(new Date(), options.scale);
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
