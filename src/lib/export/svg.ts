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

const SVG_NS = 'http://www.w3.org/2000/svg';

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

type ThemeName = NonNullable<ExportOptions['theme']>;

/**
 * Farbtoken beider Tafeln, wortgleich aus src/app.css übernommen (F-01, Abschnitt „Farbtafeln
 * und Token") — die einzige Farbquelle der Anwendung. `src/lib/export/` ist von der Leitplanke
 * „keine Farbbezüge außerhalb von app.css" ausdrücklich ausgenommen (Kommentar am Dateikopf),
 * weil der Export ein eigenständiges Dokument mit fest aufgelösten Werten erzeugt statt mit
 * `var(--…)` zu arbeiten (F-20, Ablauf Schritt 5: „im Canvas und in fremden Programmen greifen
 * externe Stylesheets nicht").
 */
const THEME_TOKENS: Record<ThemeName, Record<string, string>> = {
	light: {
		paper: '#fafaf6',
		shallow: '#dcebe6',
		deep: '#c5dde5',
		flat: '#eff1ea',
		hazard: '#f0e3c6',
		ink: '#22333b',
		inkSoft: '#5f7681',
		rule: '#22333b',
		grid: '#d8ded8',
		region: '#8aa0a4',
		magenta: '#b01777',
		sea: '#3b7c8a',
		hatchOpacity: '0.14',
		dimOpacity: '0.24'
	},
	dark: {
		paper: '#0d161a',
		shallow: '#132a2b',
		deep: '#14303b',
		flat: '#111a1d',
		hazard: '#211c13',
		ink: '#dce8e6',
		inkSoft: '#8da3a7',
		rule: '#41585d',
		grid: '#1c2b2e',
		region: '#4c666a',
		magenta: '#e4609f',
		sea: '#68bcc7',
		hatchOpacity: '0.13',
		dimOpacity: '0.3'
	}
};

/** Websichere Font-Stacks (F-20, Abschnitt „Ablauf" Schritt 6, FR-68) — wörtlich übernommen. */
const FONT_SERIF = 'Fraunces, Georgia, serif';
const FONT_SANS = 'Karla, Helvetica, Arial, sans-serif';
const FONT_MONO = 'Azeret Mono, Consolas, monospace';

/**
 * Alle wirksamen Stilregeln der Karte (Regions.svelte, Grid.svelte, Axes.svelte, Edges.svelte,
 * FeatureNodes.svelte), mit den Token der gewählten Tafel als feste Werte statt `var(--…)`
 * (F-20, Ablauf Schritt 5). Websichere Font-Stacks statt der Familiennamen allein (Schritt 6).
 */
function exportStylesheet(theme: ThemeName): string {
	const t = THEME_TOKENS[theme];
	return `
		.frame { fill: none; stroke: ${t.rule}; stroke-width: 1; }
		.tick-lbl { font-family: ${FONT_MONO}; font-size: 10.5px; fill: ${t.inkSoft}; }
		.axis-lbl { font-family: ${FONT_SERIF}; font-style: italic; font-size: 12px; letter-spacing: 0.24em; fill: ${t.inkSoft}; }
		.grid-line { stroke: ${t.grid}; stroke-width: 1; }
		.r-qw { fill: ${t.shallow}; }
		.r-gv { fill: ${t.deep}; }
		.r-nb { fill: ${t.flat}; }
		.r-vm { fill: ${t.hazard}; }
		.region-lbl { font-family: ${FONT_SERIF}; font-style: italic; font-weight: 600; font-size: 15px; letter-spacing: 0.38em; fill: ${t.region}; }
		.f-ink { fill: ${t.ink}; }
		.f-sea { fill: ${t.sea}; }
		.hatch-line { stroke: ${t.magenta}; opacity: ${t.hatchOpacity}; }
		.edge { fill: none; stroke-width: 1.4; }
		.edge-hitbox { fill: none; stroke: transparent; stroke-width: 12; }
		.e-req { stroke: ${t.ink}; }
		.e-rel { stroke: ${t.sea}; stroke-dasharray: 4 4; }
		.e-exc { stroke: ${t.magenta}; }
		.crossmark line { stroke: ${t.magenta}; stroke-width: 1.4; }
		.edge-label { font-family: ${FONT_SANS}; font-size: 11px; fill: ${t.inkSoft}; paint-order: stroke; stroke: ${t.paper}; stroke-width: 4px; stroke-linejoin: round; }
		.ring { fill: none; stroke: ${t.ink}; stroke-width: 1; stroke-dasharray: 2 3; }
		.strike { stroke: ${t.magenta}; stroke-width: 1.6; }
		.node circle { fill: ${t.ink}; stroke: ${t.paper}; stroke-width: 2; }
		.node text { font-family: ${FONT_SANS}; font-size: 13px; fill: ${t.ink}; paint-order: stroke; stroke: ${t.paper}; stroke-width: 3.5px; stroke-linejoin: round; }
		.node .snd { font-family: ${FONT_MONO}; font-size: 10.5px; fill: ${t.inkSoft}; }
		.node.sel circle { fill: ${t.magenta}; }
		.node.sel text { font-weight: 600; }
		.node circle.halo { fill: none; stroke: ${t.magenta}; stroke-width: 1.2; }
		.node.dim, .edge.dim, .ring.dim, .strike.dim, .crossmark.dim { opacity: ${t.dimOpacity}; }
		.anchor { stroke: ${t.inkSoft}; stroke-width: 1; }
	`.trim();
}

type Box = { x: number; y: number; width: number; height: number };

/** Vereinigung der Bounding Boxes mehrerer Elemente (F-20, Ablauf Schritt 3). */
function unionBBox(elements: SVGGraphicsElement[]): Box {
	let box: Box | null = null;
	for (const element of elements) {
		const b = element.getBBox();
		if (!box) {
			box = { x: b.x, y: b.y, width: b.width, height: b.height };
			continue;
		}
		const minX = Math.min(box.x, b.x);
		const minY = Math.min(box.y, b.y);
		const maxX = Math.max(box.x + box.width, b.x + b.width);
		const maxY = Math.max(box.y + box.height, b.y + b.height);
		box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}
	return box ?? { x: 0, y: 0, width: 0, height: 0 };
}

/** Rand um die Bounding Box, aus dem die viewBox des Exports entsteht (FR-65). */
const VIEWBOX_MARGIN = 24;

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
	const theme: ThemeName = options?.theme ?? 'light';
	const keepSelection = options?.keepSelection ?? false;

	// Schritt 1: tief klonen.
	const clone = source.cloneNode(true) as SVGSVGElement;

	// Schritt 2: Ausschnittstransformation aus F-12 entfernen — sie sitzt ausschließlich auf der
	// obersten Inhaltsgruppe, die MapCanvas.svelte direkt unter dem SVG-Wurzelelement anlegt
	// (`<g transform="translate(…) scale(…)">`). Verschachtelte Transformationen (z. B. der
	// gedrehte Achsentitel IMPACT, die x-Endmarke einer excludes-Kante) bleiben unberührt.
	const topGroups = Array.from(clone.children).filter(
		(el): el is SVGGElement => el.tagName.toLowerCase() === 'g'
	);
	for (const group of topGroups) group.removeAttribute('transform');

	// Schritt 3: Bounding Box über alle Elemente plus Rand, unabhängig vom aktuellen Ausschnitt —
	// getBBox() liefert je Element ohnehin dessen eigene, von seinem `transform` unabhängige
	// Bounding Box (FR-65). Reale Browser berechnen getBBox() nur für Elemente, die (auch
	// unsichtbar) Teil des gerenderten Dokuments sind — ein noch nicht angehängter Klon liefert
	// sonst durchweg eine leere Box. Der Messcontainer bleibt außerhalb des sichtbaren Bereichs
	// und wird nach der Messung sofort wieder entfernt, bevor irgendetwas anderes am Klon
	// geschieht.
	const measureHost = document.createElement('div');
	measureHost.setAttribute(
		'style',
		'position:fixed; top:-99999px; left:-99999px; width:0; height:0; overflow:hidden;'
	);
	measureHost.setAttribute('aria-hidden', 'true');
	document.body.appendChild(measureHost);
	measureHost.appendChild(clone);
	const bbox = unionBBox(topGroups.length > 0 ? topGroups : [clone]);
	document.body.removeChild(measureHost);
	const viewBoxX = bbox.x - VIEWBOX_MARGIN;
	const viewBoxY = bbox.y - VIEWBOX_MARGIN;
	const viewBoxWidth = bbox.width + 2 * VIEWBOX_MARGIN;
	const viewBoxHeight = bbox.height + 2 * VIEWBOX_MARGIN;
	clone.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);

	// Die unsichtbaren Trefferflächen der Kanten aus F-11 (Edges.svelte, Klasse `.edge-hitbox`)
	// gehören nie zum Export — unabhängig von keepSelection, sie sind reine Bedienhilfe
	// (features/STATUS.md, „Nachzuholen").
	for (const hitbox of Array.from(clone.querySelectorAll('.edge-hitbox'))) {
		hitbox.remove();
	}

	// Schritt 4: Selektionszustände zurücknehmen (FR-67), sofern nicht keepSelection gilt.
	if (!keepSelection) {
		for (const halo of Array.from(clone.querySelectorAll('.halo'))) {
			halo.remove();
		}
		for (const dimmed of Array.from(clone.querySelectorAll('.dim'))) {
			dimmed.classList.remove('dim');
		}
		for (const selected of Array.from(clone.querySelectorAll('.sel'))) {
			selected.classList.remove('sel');
		}
	}
	// Kantenbeschriftungen einer beschrifteten Beziehung werden unabhängig von keepSelection
	// sichtbar gesetzt (F-20, Ablauf Schritt 4) — sie existieren im DOM nur, wenn die Beziehung
	// überhaupt eine Beschriftung trägt (Edges.svelte), ihre Sichtbarkeit hängt sonst allein vom
	// aktuellen Bildschirmzustand (Hervorhebung/Hover, FR-45) ab, den der Export nicht übernimmt.
	for (const label of Array.from(clone.querySelectorAll('.edge-label'))) {
		label.removeAttribute('style');
	}

	// Schritt 5 + 6: eingebettete Stile mit aufgelösten Token und websicheren Font-Stacks.
	let defs = clone.querySelector('defs');
	if (!defs) {
		defs = document.createElementNS(SVG_NS, 'defs');
		clone.insertBefore(defs, clone.firstChild);
	}
	const styleEl = document.createElementNS(SVG_NS, 'style');
	styleEl.textContent = exportStylesheet(theme);
	defs.appendChild(styleEl);

	// Schritt 7: Hintergrundrechteck in --paper als erstes Kind, deckt die viewBox vollständig.
	const background = document.createElementNS(SVG_NS, 'rect');
	background.setAttribute('x', String(viewBoxX));
	background.setAttribute('y', String(viewBoxY));
	background.setAttribute('width', String(viewBoxWidth));
	background.setAttribute('height', String(viewBoxHeight));
	background.setAttribute('fill', THEME_TOKENS[theme].paper);
	clone.insertBefore(background, clone.firstChild);

	// Schritt 8: als Zeichenkette ausgeben.
	return new XMLSerializer().serializeToString(clone);
}

/** Dateiname für den Download: `featuremap-JJJJ-MM-TT.svg` mit dem aktuellen Datum (F-20,
 * Abschnitt „Ablauf" Schritt 8), nach demselben Muster wie exportFilename() in
 * src/lib/components/ExportDialog/exportFile.ts (F-19), hier mit der Endung `.svg`. */
function exportSvgFilename(date: Date): string {
	const year = String(date.getFullYear()).padStart(4, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `featuremap-${year}-${month}-${day}.svg`;
}

/**
 * Baut das Export-SVG über {@link buildExportSvg} und löst den Download aus. Dateiname
 * `featuremap-JJJJ-MM-TT.svg` mit dem aktuellen Datum (F-20, Abschnitt „Ablauf" Schritt 8).
 * Dasselbe Blob-/Anchor-Muster wie ExportDialog.svelte (F-19).
 */
export function downloadSvg(source: SVGSVGElement, options?: ExportOptions): void {
	const content = buildExportSvg(source, options);
	const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = exportSvgFilename(new Date());
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
