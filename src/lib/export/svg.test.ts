// F-20 · SVG-Export — Unit-Tests für buildExportSvg (features/F-20-export-svg.md, Abschnitte
// „Umfang", „Fachregeln", „Akzeptanzkriterien", „Tests": „Unit: umschließendes Rechteck über
// eine bekannte Karte, Entfernen der Zustände, eingebettete Stile vorhanden, Ausschnitt ohne
// Wirkung auf das Ergebnis"), PRD.md (FR-63, FR-65 bis FR-68, NFR-21, NFR-43),
// features/STATUS.md (Abschnitt „Nachzuholen": unsichtbare Trefferflächen der Kanten aus F-11
// dürfen nicht im Export landen), src/app.css (Farbtoken beider Tafeln), sowie der bereits
// gemergte Code aus F-08 bis F-11 (src/lib/components/Map/*.svelte), der die Klassen und
// Attribute liefert, gegen die buildExportSvg hier geprüft wird (`.dim`, `.sel`, `.halo`,
// `.edge-hitbox`, `data-testid="map-frame"`, `class="axis-lbl"`, `class="region-lbl"`).
//
// downloadSvg wird hier bewusst NICHT unit-getestet: jsdom implementiert weder
// SVGGraphicsElement.getBBox() noch URL.createObjectURL (siehe Polyfill unten für ersteres);
// window.Blob in jsdom kennt zudem kein .text(), womit sich der heruntergeladene Inhalt in
// diesem Testaufbau nicht zuverlässig zurücklesen ließe. Dasselbe Muster wie F-19
// (exportFile.test.ts prüft nur reine Funktionen; der eigentliche Blob-/Anchor-Download aus
// ExportDialog.svelte wurde ausschließlich per E2E geprüft) — downloadSvg() ist hier das
// Äquivalent und wird deshalb vollständig in e2e/F-20-export-svg.spec.ts abgedeckt (echter
// Download-Event in einem echten Browser).
//
// Tests prüfen ausschließlich beobachtbares Verhalten von buildExportSvg: Eingabe-SVG (bekannte,
// selbst gebaute Testkarten) und Optionen hinein, Ergebniszeichenkette (geparst) heraus — nie
// eine bestimmte interne Umsetzung (features/README.md, Regeln für den Test-Agenten).

import { beforeAll, describe, expect, it } from 'vitest';
import { buildExportSvg } from './svg';

// -------------------------------------------------------------------------------------------
// Testaufbau: getBBox()-Polyfill für jsdom.
//
// jsdom implementiert SVGGraphicsElement.prototype.getBBox() nicht (siehe node_modules/jsdom —
// keine einzige Fundstelle für „getBBox" im gesamten Paket); ein echter Browser, in dem
// buildExportSvg tatsächlich läuft (F-20, Abschnitt „Ablauf" Schritt 3: „Umschließendes
// Rechteck über alle Elemente bestimmen"), unterstützt es dagegen nativ. Dieser Polyfill bildet
// exakt die Geometrie nach, die die Testkarten dieser Datei selbst über ihre Attribute (cx/cy/r,
// x1/y1/x2/y2, x/y/width/height) tragen, unabhängig davon, ob die spätere Umsetzung getBBox()
// aufruft oder dieselben Attribute selbst ausliest — nach Schritt 2 (Ausschnittstransformation
// entfernt) tragen die Elemente ohnehin kein eigenes `transform` mehr, beide Wege liefern dann
// dasselbe Ergebnis. Texte bekommen nur eine grobe, feste Näherung (jsdom kennt keine
// Schriftmetrik) — die Testkarten platzieren Text deshalb bewusst innerhalb der durch andere
// Elemente gesetzten Ränder, nie an deren äußerstem Rand.
type Box = { x: number; y: number; width: number; height: number };

function numAttr(el: Element, name: string): number {
	const value = el.getAttribute(name);
	return value === null ? 0 : Number.parseFloat(value);
}

function ownBox(el: Element): Box | null {
	switch (el.tagName.toLowerCase()) {
		case 'rect':
			return { x: numAttr(el, 'x'), y: numAttr(el, 'y'), width: numAttr(el, 'width'), height: numAttr(el, 'height') };
		case 'circle': {
			const cx = numAttr(el, 'cx');
			const cy = numAttr(el, 'cy');
			const r = numAttr(el, 'r');
			return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
		}
		case 'line': {
			const x1 = numAttr(el, 'x1');
			const y1 = numAttr(el, 'y1');
			const x2 = numAttr(el, 'x2');
			const y2 = numAttr(el, 'y2');
			return {
				x: Math.min(x1, x2),
				y: Math.min(y1, y2),
				width: Math.abs(x2 - x1),
				height: Math.abs(y2 - y1)
			};
		}
		case 'text': {
			// Grobe, feste Näherung ohne Schriftmetrik — siehe Erläuterung am Dateikopf.
			const x = numAttr(el, 'x');
			const y = numAttr(el, 'y');
			return { x: x - 1, y: y - 1, width: 2, height: 2 };
		}
		default:
			return null;
	}
}

function union(a: Box, b: Box): Box {
	const minX = Math.min(a.x, b.x);
	const minY = Math.min(a.y, b.y);
	const maxX = Math.max(a.x + a.width, b.x + b.width);
	const maxY = Math.max(a.y + a.height, b.y + b.height);
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function boxOf(el: Element): Box {
	const own = ownBox(el);
	if (own) return own;
	let result: Box | null = null;
	for (const child of Array.from(el.children)) {
		const childBox = boxOf(child);
		result = result ? union(result, childBox) : childBox;
	}
	return result ?? { x: 0, y: 0, width: 0, height: 0 };
}

beforeAll(() => {
	const proto = (globalThis as unknown as { SVGElement?: { prototype: unknown } }).SVGElement
		?.prototype as { getBBox?: (this: Element) => Box } | undefined;
	if (proto && typeof proto.getBBox !== 'function') {
		proto.getBBox = function (this: Element): Box {
			return boxOf(this);
		};
	}
});

// -------------------------------------------------------------------------------------------
// Testaufbau: bekannte Testkarten.
// -------------------------------------------------------------------------------------------

const XML_NS = 'http://www.w3.org/2000/svg';

/** Baut ein Element im SVG-Namensraum mit den übergebenen Attributen (Testaufbau). */
function svgEl(tag: string, attrs: Record<string, string> = {}, text?: string): Element {
	const el = document.createElementNS(XML_NS, tag);
	for (const [name, value] of Object.entries(attrs)) {
		el.setAttribute(name, value);
	}
	if (text !== undefined) el.textContent = text;
	return el;
}

/**
 * Eine minimale, aber realistische Testkarte nach dem Aufbau von MapCanvas.svelte (F-08 bis
 * F-11): `<svg class="map" viewBox="0 0 1000 700">` mit genau einer inneren `<g>`, die die
 * Ausschnittstransformation aus F-12 trägt (`transform`), und darin Rahmen (Axes.svelte),
 * Revierbeschriftungen (Regions.svelte), zwei Feature-Signaturen (FeatureNodes.svelte, eine
 * davon selektiert samt Halo) und eine beschriftete `requires`-Beziehung samt unsichtbarer
 * Trefferfläche (Edges.svelte, F-11 „Nachzuholen").
 *
 * `transform` ist per Parameter wählbar, um F-20s Anforderung „Ausschnitt ohne Wirkung auf das
 * Ergebnis" mit zwei sonst identischen Karten zu prüfen.
 */
function knownMap(transform = 'translate(0 0) scale(1)'): SVGSVGElement {
	const root = svgEl('svg', {
		class: 'map',
		viewBox: '0 0 1000 700',
		role: 'img',
		'aria-label': 'Streudiagramm: Effort waagerecht, Impact senkrecht'
	}) as unknown as SVGSVGElement;

	const content = svgEl('g', { transform });
	root.appendChild(content);

	// Rahmen der Plotfläche (Axes.svelte, data-testid="map-frame") — bewusst NICHT der äußerste
	// Rand der Testkarte, damit die Bounding-Box-Tests unten ausschließlich vom Signaturpunkt und
	// der Kantenlinie bestimmt werden (klar zuordenbare, runde Werte).
	content.appendChild(svgEl('rect', { class: 'frame', 'data-testid': 'map-frame', x: '80', y: '40', width: '880', height: '580' }));
	content.appendChild(svgEl('text', { class: 'axis-lbl', x: '520', y: '664' }, 'EFFORT'));
	content.appendChild(svgEl('text', { class: 'axis-lbl', x: '32', y: '330' }, 'IMPACT'));

	// Vier Reviernamen (Regions.svelte).
	for (const [cls, name, x, y] of [
		['r-qw', 'QUICK WINS', '300', '74'],
		['r-gv', 'GROSSE VORHABEN', '740', '74'],
		['r-nb', 'NEBENBEI', '300', '600'],
		['r-vm', 'VERMEIDEN', '740', '600']
	] as const) {
		content.appendChild(svgEl('rect', { class: cls, 'data-testid': `region-${cls}` }));
		content.appendChild(svgEl('text', { class: 'region-lbl', x, y }, name));
	}

	// Feature A: nicht selektiert.
	const nodeA = svgEl('g', { class: 'node', 'data-feature-id': 'a' });
	nodeA.appendChild(svgEl('circle', { 'data-testid': 'feature-node-a', cx: '200', cy: '500', r: '8' }));
	nodeA.appendChild(svgEl('text', { 'data-testid': 'feature-label-a', x: '216', y: '495' }, 'A'));
	content.appendChild(nodeA);

	// Feature B: selektiert (.sel, .dim ist hier bewusst NICHT gesetzt, siehe eigener Dimm-Test
	// unten) plus Halo.
	const nodeB = svgEl('g', { class: 'node sel', 'data-feature-id': 'b' });
	nodeB.appendChild(svgEl('circle', { class: 'halo', 'data-testid': 'feature-halo-b', cx: '900', cy: '80', r: '15' }));
	nodeB.appendChild(svgEl('circle', { 'data-testid': 'feature-node-b', cx: '900', cy: '80', r: '8' }));
	nodeB.appendChild(svgEl('text', { 'data-testid': 'feature-label-b', x: '916', y: '75' }, 'B'));
	content.appendChild(nodeB);

	// Beschriftete requires-Beziehung A → B, inklusive der unsichtbaren, breiteren Trefferfläche
	// aus F-11 (Edges.svelte, Klasse `.edge-hitbox`) und einer — hier bewusst verborgen markierten
	// — Kantenbeschriftung: Edges.svelte rendert Kantenbeschriftungen im Grundzustand ohnehin
	// nicht ins DOM ({#if g.relation.label && showLabel}); dieser Testaufbau nimmt an, dass eine
	// künftige Umsetzung sie stattdessen immer rendert und nur per Stil verbirgt (CSS-Zustand statt
	// bedingtem Rendering) — nötig, damit buildExportSvg sie überhaupt vorfindet und sichtbar
	// setzen kann (F-20, Abschnitt „Ablauf" Schritt 4). Siehe Abschlussbericht, Punkt 4.
	const edgeGroup = svgEl('g', {
		class: 'edge-group',
		'data-relation-from': 'a',
		'data-relation-to': 'b',
		'data-relation-type': 'requires'
	});
	edgeGroup.appendChild(
		svgEl('line', {
			class: 'edge e-req',
			'data-testid': 'edge-a-b-requires',
			x1: '208',
			y1: '492',
			x2: '892',
			y2: '88'
		})
	);
	edgeGroup.appendChild(svgEl('line', { class: 'edge-hitbox', x1: '208', y1: '492', x2: '892', y2: '88' }));
	content.appendChild(edgeGroup);
	content.appendChild(
		svgEl(
			'text',
			{
				class: 'edge-label',
				style: 'visibility: hidden',
				'data-testid': 'edge-label-a-b-requires',
				x: '550',
				y: '290'
			},
			'nutzt'
		)
	);

	return root;
}

function parse(svgString: string): SVGSVGElement {
	const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
	const error = doc.querySelector('parsererror');
	expect(error, `Testaufbau: Ergebnis von buildExportSvg sollte gültiges XML sein — ${error?.textContent}`).toBeNull();
	return doc.documentElement as unknown as SVGSVGElement;
}

// -------------------------------------------------------------------------------------------
// Ausgabeformat (Ablauf Schritt 8: „Als Zeichenkette mit XMLSerializer ausgeben").
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Ausgabe', () => {
	// F-20, Abschnitt „Ablauf" Schritt 8.
	it('liefert eine mit DOMParser wieder einlesbare, gültige SVG-Zeichenkette', () => {
		const result = buildExportSvg(knownMap());
		const root = parse(result);
		expect(root.tagName.toLowerCase()).toBe('svg');
	});
});

// -------------------------------------------------------------------------------------------
// Umschließendes Rechteck über eine bekannte Karte (FR-65, Ablauf Schritt 3).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — umschließendes Rechteck über eine bekannte Karte (FR-65)', () => {
	// F-20, Abschnitt „Ablauf" Schritt 3: „Umschließendes Rechteck über alle Elemente bestimmen,
	// 24 Einheiten Rand addieren und daraus die viewBox des Klons setzen."
	//
	// Bekannte Karte dieses Tests (bewusst reduziert auf zwei Kreise und eine Linie mit runden
	// Werten, statt der vollen knownMap(), damit die erwartete Bounding Box von Hand nachrechenbar
	// bleibt): Kreis (100,100,r=10) → (90,90)–(110,110); Kreis (900,600,r=10) → (890,590)–
	// (910,610); Linie (200,50)–(800,650). Vereinigung: minX=90, minY=50, maxX=910, maxY=650 →
	// x=820, y=600. Mit 24 Einheiten Rand: viewBox = "66 26 868 648".
	it('setzt die viewBox auf die Bounding Box aller Elemente plus 24 Einheiten Rand', () => {
		const root = svgEl('svg', { class: 'map', viewBox: '0 0 1000 700' }) as unknown as SVGSVGElement;
		const content = svgEl('g', { transform: 'translate(0 0) scale(1)' });
		content.appendChild(svgEl('circle', { cx: '100', cy: '100', r: '10' }));
		content.appendChild(svgEl('circle', { cx: '900', cy: '600', r: '10' }));
		content.appendChild(svgEl('line', { x1: '200', y1: '50', x2: '800', y2: '650' }));
		root.appendChild(content);

		const result = buildExportSvg(root);
		const parsed = parse(result);
		const [x, y, width, height] = (parsed.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);

		expect(x).toBeCloseTo(66, 5);
		expect(y).toBeCloseTo(26, 5);
		expect(width).toBeCloseTo(868, 5);
		expect(height).toBeCloseTo(648, 5);
	});
});

// -------------------------------------------------------------------------------------------
// Ausschnitt ohne Wirkung auf das Ergebnis (FR-65, Ablauf Schritt 2).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Ausschnittstransformation aus F-12 ohne Wirkung auf das Ergebnis', () => {
	// F-20, Abschnitt „Ablauf" Schritt 2: „Die Ausschnittstransformation aus F-12 aus dem Klon
	// entfernen." PRD FR-65: „unabhängig vom aktuellen Zoom/Pan-Zustand". Dieselbe bekannte Karte,
	// zweimal nur mit unterschiedlichem Zoom-/Pan-Zustand (`transform`) exportiert, muss dasselbe
	// Ergebnis liefern.
	it('liefert für Vollansicht und einen gezoomten/verschobenen Ausschnitt dasselbe Ergebnis', () => {
		const vollansicht = buildExportSvg(knownMap('translate(0 0) scale(1)'));
		const gezoomt = buildExportSvg(knownMap('translate(-340 -120) scale(2.5)'));

		expect(gezoomt).toBe(vollansicht);
	});
});

// -------------------------------------------------------------------------------------------
// Selektionszustände werden zurückgenommen (FR-67, Ablauf Schritt 4).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Selektionszustände werden zurückgenommen (FR-67)', () => {
	// F-20, Abschnitt „Ablauf" Schritt 4: „.dim, .sel und .halo entfernen." F-20-AK: „Bei aktiver
	// Selektion enthält die Datei keine abgedunkelten Elemente und keinen Halo."
	it('entfernt die Klassen .dim und .sel von allen Elementen', () => {
		const root = svgEl('svg', { class: 'map', viewBox: '0 0 1000 700' }) as unknown as SVGSVGElement;
		const content = svgEl('g', { transform: 'translate(0 0) scale(1)' });
		content.appendChild(svgEl('g', { class: 'node sel' }, undefined));
		content.appendChild(svgEl('line', { class: 'edge e-req dim', x1: '0', y1: '0', x2: '10', y2: '10' }));
		content.appendChild(svgEl('circle', { class: 'ring dim', cx: '50', cy: '50', r: '15' }));
		root.appendChild(content);

		const parsed = parse(buildExportSvg(root));
		expect(parsed.querySelectorAll('.dim').length).toBe(0);
		expect(parsed.querySelectorAll('.sel').length).toBe(0);
	});

	it('entfernt Halo-Kreise vollständig, nicht nur ihre Klasse', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		expect(parsed.querySelectorAll('.halo')).toHaveLength(0);
		// Der übrige Signaturpunkt von Feature „b" bleibt erhalten — nur der Halo verschwindet.
		expect(parsed.querySelector('[data-testid="feature-node-b"]')).not.toBeNull();
	});

	// F-20, Abschnitt „Umfang": ExportOptions.keepSelection — Gegenprobe zum Standardverhalten.
	it('behält .dim, .sel und Halo, wenn options.keepSelection gesetzt ist', () => {
		const parsed = parse(buildExportSvg(knownMap(), { keepSelection: true }));
		expect(parsed.querySelectorAll('.sel').length).toBeGreaterThan(0);
		expect(parsed.querySelectorAll('.halo').length).toBeGreaterThan(0);
	});
});

// -------------------------------------------------------------------------------------------
// Kantenbeschriftungen einer beschrifteten Beziehung werden sichtbar (FR-67).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Kantenbeschriftungen sichtbar (FR-67)', () => {
	// F-20, Abschnitt „Ablauf" Schritt 4: „Kantenbeschriftungen auf sichtbar setzen, sofern sie zu
	// einer Beziehung mit Beschriftung gehören." Testaufbau: siehe Kommentar bei knownMap() —
	// die Testkarte markiert die Beschriftung über `style="visibility: hidden"` als verborgen.
	it('setzt eine im Grundzustand verborgene Kantenbeschriftung sichtbar', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		const label = parsed.querySelector('[data-testid="edge-label-a-b-requires"]');
		expect(label, 'Kantenbeschriftung sollte im Export vorhanden sein').not.toBeNull();
		expect(label!.textContent).toBe('nutzt');
		expect(label!.getAttribute('style') ?? '').not.toMatch(/visibility:\s*hidden/);
		expect(label!.getAttribute('style') ?? '').not.toMatch(/display:\s*none/);
	});
});

// -------------------------------------------------------------------------------------------
// Unsichtbare Trefferflächen der Kanten aus F-11 landen nicht im Export.
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — unsichtbare Trefferflächen (features/STATUS.md, „Nachzuholen")', () => {
	// features/STATUS.md, Zeile F-20: „prüfen, dass die unsichtbaren Trefferflächen der Kanten aus
	// F-11 (breite, unsichtbare Hit-Areas für Klick/Touch) NICHT im exportierten SVG landen."
	// Edges.svelte (F-11, bereits gemergt) vergibt dafür die Klasse `.edge-hitbox`.
	it('entfernt Elemente der Klasse .edge-hitbox aus dem Export', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		expect(parsed.querySelectorAll('.edge-hitbox')).toHaveLength(0);
		// Die sichtbare Kantenlinie selbst bleibt erhalten — nur die Trefferfläche verschwindet.
		expect(parsed.querySelector('[data-testid="edge-a-b-requires"]')).not.toBeNull();
	});
});

// -------------------------------------------------------------------------------------------
// Eingebettete Stile (FR-68, NFR-43, Ablauf Schritte 5 und 6).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — eingebettete Stile (FR-68, NFR-43)', () => {
	// F-20, Abschnitt „Ablauf" Schritt 5: „Alle wirksamen Stilregeln als <style>-Block in den Klon
	// einsetzen, mit den Token der gewählten Tafel als feste Werte — im Canvas und in fremden
	// Programmen greifen externe Stylesheets nicht."
	it('bettet einen <style>-Block mit aufgelösten Werten statt var(--…) ein', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		const style = parsed.querySelector('style');
		expect(style, 'Export sollte einen <style>-Block enthalten').not.toBeNull();
		expect(style!.textContent ?? '').not.toBe('');
		expect(style!.textContent ?? '').not.toMatch(/var\(--/);
	});

	// Token der Tagtafel aus src/app.css (--ink: #22333b, --paper: #fafaf6) müssen als feste Werte
	// im Export auftauchen, wenn keine Tafel gewählt wird (Standard 'light').
	it('löst Token nach der Tagtafel auf (Standard ohne options.theme)', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		const style = parsed.querySelector('style')!.textContent ?? '';
		expect(style.toLowerCase()).toMatch(/#22333b|#fafaf6/);
	});

	// F-20, Abschnitt „Umfang": „Standardtafel für den Export ist Tag … Im Menü Exportieren steht
	// dafür ein Umschalter Tafel: Tag / Nacht." — mit options.theme: 'dark' müssen die
	// Nacht-Token (--ink: #dce8e6, --paper: #0d161a) eingesetzt werden.
	it('löst Token nach der Nachttafel auf, wenn options.theme "dark" ist', () => {
		const parsed = parse(buildExportSvg(knownMap(), { theme: 'dark' }));
		const style = parsed.querySelector('style')!.textContent ?? '';
		expect(style.toLowerCase()).toMatch(/#dce8e6|#0d161a/);
		expect(style.toLowerCase()).not.toMatch(/#22333b|#fafaf6/);
	});

	// F-20, Abschnitt „Ablauf" Schritt 6, wörtlich übernommene Font-Stacks (FR-68).
	it('gibt alle drei Schriftrollen über websichere Font-Stacks an', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		const style = parsed.querySelector('style')!.textContent ?? '';
		expect(style).toMatch(/Fraunces,\s*Georgia,\s*serif/);
		expect(style).toMatch(/Karla,\s*Helvetica,\s*Arial,\s*sans-serif/);
		expect(style).toMatch(/Azeret Mono,\s*Consolas,\s*monospace/);
	});
});

// -------------------------------------------------------------------------------------------
// Kein externer Stilverweis (F-20-AK: „Kein <style>-Verweis auf eine externe Datei bleibt
// übrig").
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — kein externer Stilverweis', () => {
	it('enthält weder <link> noch @import auf eine externe Datei', () => {
		const result = buildExportSvg(knownMap());
		expect(result).not.toMatch(/<link/i);
		expect(result).not.toMatch(/@import/i);
	});
});

// -------------------------------------------------------------------------------------------
// Hintergrundrechteck (Ablauf Schritt 7).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Hintergrundrechteck', () => {
	// F-20, Abschnitt „Ablauf" Schritt 7: „Hintergrundrechteck in --paper als erstes Kind
	// einsetzen, damit die Datei nicht durchsichtig auf Weiß liegt."
	it('setzt ein Rechteck in --paper als erstes Kind, das die viewBox deckt', () => {
		const parsed = parse(buildExportSvg(knownMap()));
		const [vx, vy, vw, vh] = (parsed.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);

		const firstChild = Array.from(parsed.children).find((el) => el.tagName.toLowerCase() !== 'defs');
		expect(firstChild, 'Testaufbau: Export sollte ein erstes sichtbares Kind haben').not.toBeUndefined();
		expect(firstChild!.tagName.toLowerCase()).toBe('rect');
		expect(Number.parseFloat(firstChild!.getAttribute('x') ?? '')).toBeCloseTo(vx, 5);
		expect(Number.parseFloat(firstChild!.getAttribute('y') ?? '')).toBeCloseTo(vy, 5);
		expect(Number.parseFloat(firstChild!.getAttribute('width') ?? '')).toBeCloseTo(vw, 5);
		expect(Number.parseFloat(firstChild!.getAttribute('height') ?? '')).toBeCloseTo(vh, 5);
	});

	it('färbt das Hintergrundrechteck mit dem --paper-Token der gewählten Tafel', () => {
		const light = parse(buildExportSvg(knownMap()));
		const dark = parse(buildExportSvg(knownMap(), { theme: 'dark' }));
		const lightBg = Array.from(light.children).find((el) => el.tagName.toLowerCase() === 'rect')!;
		const darkBg = Array.from(dark.children).find((el) => el.tagName.toLowerCase() === 'rect')!;

		const fillOf = (el: Element) => (el.getAttribute('fill') ?? el.getAttribute('style') ?? '').toLowerCase();
		expect(fillOf(lightBg)).toMatch(/#fafaf6/);
		expect(fillOf(darkBg)).toMatch(/#0d161a/);
	});
});

// -------------------------------------------------------------------------------------------
// Beschriftungen bleiben Text (NFR-21).
// -------------------------------------------------------------------------------------------

describe('buildExportSvg — Beschriftungen bleiben Text (NFR-21)', () => {
	// F-20, Abschnitt „Fachregeln": „NFR-21 | Beschriftungen bleiben Text; es wird nichts als
	// Markup eingesetzt." Analog zu PRD AK-13 für den allgemeinen Fall.
	it('rendert einen Feature-Namen mit skriptartigem Inhalt unverändert als Text, ohne Markup einzusetzen', () => {
		const root = svgEl('svg', { class: 'map', viewBox: '0 0 1000 700' }) as unknown as SVGSVGElement;
		const content = svgEl('g', { transform: 'translate(0 0) scale(1)' });
		const node = svgEl('g', { class: 'node' });
		node.appendChild(svgEl('circle', { cx: '500', cy: '350', r: '8' }));
		node.appendChild(svgEl('text', { x: '516', y: '345' }, '<script>alert(1)</script>'));
		content.appendChild(node);
		root.appendChild(content);

		const result = buildExportSvg(root);
		expect(result).not.toMatch(/<script/i);

		const parsed = parse(result);
		const text = Array.from(parsed.querySelectorAll('text')).find(
			(el) => el.textContent === '<script>alert(1)</script>'
		);
		expect(text, 'Der Name sollte unverändert als Textinhalt erhalten bleiben').not.toBeUndefined();
	});
});
