// F-10 · Kanten und Signaturenkatalog — E2E-Tests.
// Quellen: features/F-10-kanten.md (Akzeptanzkriterien, Abschnitte „Umfang" und
// „Signaturenkatalog"), PRD.md (5.6, FR-24, FR-45, NFR-21), design/03-seekarte.html
// (Klassen `.e-req`, `.e-rel`, `.e-exc`, `.ring`, `.strike`, `.legend.cartouche`, Marker
// `#tipInk`/`#tipSea`), features/README.md (Sprachtabelle: Beziehung, Beziehungsart, Ring).
//
// Vergebene data-testid (nirgends über Rolle/Text eindeutig zu greifen, weil die Kanten reine
// Geometrie ohne Eigennamen sind):
//   - edge-<from>-<to>-<type>          die Linie einer Beziehung, z. B. edge-a-b-requires
//   - edge-label-<from>-<to>-<type>    die Beschriftung derselben Beziehung
//   - edge-crossmark-<from>-<to>       Gruppe der x-Endmarke einer excludes-Kante (zwei Linien)
//   - edge-ring-<id>                   Vorbedingungsring um ein Feature, das Ziel von requires ist
//   - edge-strike-<id>                 Durchstreichung eines Features, das Ziel von excludes ist
//   - legend                           die Zeichenerklärung-Kartusche
//   - legend-requires / legend-relates / legend-excludes / legend-vorbedingung
//                                      je ein Eintrag der Zeichenerklärung mit Musterlinie
//
// Bereits von F-08/F-09 vergeben, hier nicht erneut benutzt: map-frame, grid-line, region-*,
// tick-x-<Wert>, tick-y-<Wert>, feature-node-<id>, feature-label-<id>, feature-lotung-<id>,
// feature-anchor.
//
// Ohne Formular und Verbindungsvorgang (F-13, F-16 folgen erst später) lässt sich eine Karte
// mit Beziehungen nur über den LocalStorage vor dem Laden vorbelegen (Muster aus
// e2e/F-09-feature-signaturen.spec.ts).

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const STORAGE_KEY = 'featuremap.map';
const BREAKPOINTS = [375, 834, 1440];

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04). */
async function seedMap(page: Page, features: SeedFeature[], relations: SeedRelation[] = []) {
	await page.addInitScript(
		({ key, value }) => {
			window.localStorage.setItem(key, value);
		},
		{
			key: STORAGE_KEY,
			value: JSON.stringify({ schemaVersion: 1, features, relations })
		}
	);
}

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel). */
function tokenHex(theme: 'light' | 'dark', name: string): string {
	const cssPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app.css');
	const css = readFileSync(cssPath, 'utf-8');
	const blockPattern =
		theme === 'light' ? /:root\s*\{([^}]*)\}/ : /:root\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/;
	const block = css.match(blockPattern);
	if (!block) throw new Error(`Testaufbau: ${theme}-Tafel nicht in src/app.css gefunden`);
	const tokenPattern = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`);
	const match = block[1].match(tokenPattern);
	if (!match) throw new Error(`Testaufbau: Token --${name} nicht in der ${theme}-Tafel gefunden`);
	return match[1];
}

function hexToRgb(hex: string): string {
	const clean = hex.replace('#', '');
	const value = parseInt(clean, 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgb(${r}, ${g}, ${b})`;
}

async function numberAttr(locator: import('@playwright/test').Locator, name: string): Promise<number> {
	const value = await locator.getAttribute(name);
	expect(value, `Attribut ${name} sollte gesetzt sein`).not.toBeNull();
	return Number(value);
}

const DREI_ARTEN: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 13, effort: 3 },
	{ id: 'b', label: 'B', impact: 8, effort: 8 },
	{ id: 'c', label: 'C', impact: 3, effort: 13 },
	{ id: 'd', label: 'D', impact: 5, effort: 5 }
];

const DREI_RELATIONEN: SeedRelation[] = [
	{ from: 'a', to: 'b', type: 'requires' },
	{ from: 'a', to: 'c', type: 'relates' },
	{ from: 'a', to: 'd', type: 'excludes' }
];

test.describe('F-10 · Kanten und Signaturenkatalog', () => {
	// AK: „Alle drei Arten werden mit der jeweils richtigen Linienform und Endmarke gezeichnet."
	// Die Klassennamen `.e-req`/`.e-rel`/`.e-exc` und die Marker `#tipInk`/`#tipSea` sind durch
	// F-10 „Signaturenkatalog" selbst vorgegeben, nicht frei gewählt — ihre Prüfung ist daher
	// keine Vorschrift einer Umsetzung, sondern Teil der Spezifikation.
	test('zeichnet requires, relates und excludes mit je eigener Linienform und Endmarke', async ({
		page
	}) => {
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
		await page.goto('/');

		const req = page.getByTestId('edge-a-b-requires');
		const rel = page.getByTestId('edge-a-c-relates');
		const exc = page.getByTestId('edge-a-d-excludes');

		await expect(req).toBeVisible();
		await expect(rel).toBeVisible();
		await expect(exc).toBeVisible();

		await expect(req).toHaveClass(/(^|\s)e-req(\s|$)/);
		await expect(rel).toHaveClass(/(^|\s)e-rel(\s|$)/);
		await expect(exc).toHaveClass(/(^|\s)e-exc(\s|$)/);

		// requires und relates enden in einer Pfeilspitze (Marker), excludes in der x-Marke statt
		// einer Pfeilspitze.
		await expect(req).toHaveAttribute('marker-end', /tipInk/);
		await expect(rel).toHaveAttribute('marker-end', /tipSea/);
		expect(await exc.getAttribute('marker-end')).toBeFalsy();

		// relates ist gestrichelt, requires und excludes sind durchgezogen (F-10
		// „Signaturenkatalog"). Geprüft wird nur, ob überhaupt ein Strichmuster gesetzt ist —
		// nicht die genaue von Chromium berechnete Schreibweise (z. B. „4px, 4px" vs. „4px 4px"),
		// die eine erzwungene Umsetzung wäre.
		const relDasharray = await rel.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const reqDasharray = await req.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const excDasharray = await exc.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const durchgezogen = ['none', '', '0px', '0px, 0px'];
		expect(durchgezogen.includes(relDasharray), 'relates sollte gestrichelt sein').toBe(false);
		expect(durchgezogen.includes(reqDasharray), 'requires sollte durchgezogen sein').toBe(true);
		expect(durchgezogen.includes(excDasharray), 'excludes sollte durchgezogen sein').toBe(true);

		// Die x-Endmarke besteht aus zwei gekreuzten Strichen am Ziel-Ende der excludes-Kante.
		const crossmark = page.getByTestId('edge-crossmark-a-d');
		await expect(crossmark).toBeVisible();
		const strichzahl = await crossmark.locator('line').count();
		expect(strichzahl).toBe(2);
	});

	// AK: „Das Ziel einer requires-Kante trägt einen Ring, das Ziel einer excludes-Kante eine
	// Durchstreichung."
	test('zeichnet den Vorbedingungsring am Ziel einer requires-Kante und die Durchstreichung am Ziel einer excludes-Kante', async ({
		page
	}) => {
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
		await page.goto('/');

		await expect(page.getByTestId('edge-ring-b')).toBeVisible();
		await expect(page.getByTestId('edge-strike-d')).toBeVisible();

		// Quelle a und das relates-Ziel c tragen weder Ring noch Durchstreichung.
		await expect(page.getByTestId('edge-ring-a')).toHaveCount(0);
		await expect(page.getByTestId('edge-strike-a')).toHaveCount(0);
		await expect(page.getByTestId('edge-ring-c')).toHaveCount(0);
		await expect(page.getByTestId('edge-strike-c')).toHaveCount(0);
	});

	// AK: „Trägt ein Feature mehrere Rollen gleichzeitig … werden Ring und Durchstreichung beide
	// gezeichnet." (F-10, Abschnitt „Signaturenkatalog")
	test('zeichnet Ring und Durchstreichung gemeinsam, wenn ein Feature beide Rollen trägt', async ({
		page
	}) => {
		await seedMap(page, DREI_ARTEN, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'c', to: 'b', type: 'excludes' }
		]);
		await page.goto('/');

		await expect(page.getByTestId('edge-ring-b')).toBeVisible();
		await expect(page.getByTestId('edge-strike-b')).toBeVisible();
	});

	// AK: „Kanten enden sichtbar vor dem Zielpunkt; keine Pfeilspitze verschwindet unter einem
	// Punkt." Der Signaturpunkt hat Radius 8 (F-09); das Linienende muss außerhalb davon liegen.
	test('endet eine Kante sichtbar außerhalb des Zielpunkts', async ({ page }) => {
		await seedMap(page, DREI_ARTEN, [{ from: 'a', to: 'b', type: 'requires' }]);
		await page.goto('/');

		const edge = page.getByTestId('edge-a-b-requires');
		const [x2, y2] = await Promise.all([numberAttr(edge, 'x2'), numberAttr(edge, 'y2')]);

		const node = page.getByTestId('feature-node-b');
		const [cx, cy] = await Promise.all([numberAttr(node, 'cx'), numberAttr(node, 'cy')]);

		const abstand = Math.hypot(x2 - cx, y2 - cy);
		expect(abstand, 'Linienende sollte außerhalb des 8 Einheiten großen Signaturpunkts liegen').toBeGreaterThan(8);
	});

	// AK: „Zwei Kanten zwischen demselben Paar mit verschiedener Art sind beide sichtbar."
	test('zeigt zwei Kanten zwischen demselben Paar mit unterschiedlicher Art gleichzeitig', async ({
		page
	}) => {
		await seedMap(page, DREI_ARTEN, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'a', to: 'b', type: 'relates' }
		]);
		await page.goto('/');

		await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		await expect(page.getByTestId('edge-a-b-relates')).toBeVisible();
	});

	// AK: „Kantenbeschriftungen sind ohne Selektion nicht sichtbar." FR-45: Sichtbarkeit wird
	// hier nur vorbereitet, der Selektions-/Hoverzustand folgt erst mit F-11 — es gibt in
	// diesem Feature also keine Interaktion, die die Beschriftung je sichtbar machen könnte.
	test('zeigt Kantenbeschriftungen im Grundzustand nicht an', async ({ page }) => {
		await seedMap(page, DREI_ARTEN, [
			{ from: 'a', to: 'b', type: 'requires', label: 'nutzt Identität' }
		]);
		await page.goto('/');

		await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		await expect(page.getByTestId('edge-label-a-b-requires')).toBeHidden();
		await expect(page.getByText('nutzt Identität')).toBeHidden();
	});

	// AK: „Eine Kante auf ein versetztes Feature endet am versetzten Punkt, nicht am
	// Ankerpunkt." Zwei Features mit gleichem Wertepaar werden durch F-09 auseinandergezogen;
	// die Kante muss dem tatsächlich gerenderten (versetzten) Punkt folgen.
	test('endet eine Kante auf ein versetztes Feature am versetzten Punkt statt am Ankerpunkt', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'quelle', impact: 1, effort: 21 },
				{ id: 'g1', impact: 5, effort: 5 },
				{ id: 'g2', impact: 5, effort: 5 }
			],
			[{ from: 'quelle', to: 'g1', type: 'relates' }]
		);
		await page.goto('/');

		const edge = page.getByTestId('edge-quelle-g1-relates');
		const [x2, y2] = await Promise.all([numberAttr(edge, 'x2'), numberAttr(edge, 'y2')]);

		const node = page.getByTestId('feature-node-g1');
		const [nodeX, nodeY] = await Promise.all([numberAttr(node, 'cx'), numberAttr(node, 'cy')]);

		// Das Ankerkreuz besteht aus zwei Linien in denselben SVG-Einheiten wie das Linienende
		// (FeatureNodes.svelte, F-09): eine waagerechte Linie durch den Ankerpunkt liefert dessen
		// Koordinaten, ohne den Umweg über Bildschirm-Pixel und Skalierung.
		const horizontaleAnkerlinie = page.getByTestId('feature-anchor').first().locator('line').first();
		const [ax1, ax2, anchorY] = await Promise.all([
			numberAttr(horizontaleAnkerlinie, 'x1'),
			numberAttr(horizontaleAnkerlinie, 'x2'),
			numberAttr(horizontaleAnkerlinie, 'y1')
		]);
		const anchorX = (ax1 + ax2) / 2;

		const distanzZumKnoten = Math.hypot(x2 - nodeX, y2 - nodeY);
		const distanzZumAnker = Math.hypot(x2 - anchorX, y2 - anchorY);

		expect(
			distanzZumKnoten,
			'Kantenende sollte deutlich näher am gerenderten (versetzten) Punkt liegen als am Ankerpunkt'
		).toBeLessThan(distanzZumAnker);
	});

	// AK: „In Graustufen bleiben die drei Arten unterscheidbar." Die Unterscheidung erfolgt laut
	// PRD 5.6 („Hinweis zur Zugänglichkeit") und F-10 „Signaturenkatalog" bewusst über
	// Linienform und Endmarke, nicht über Farbe — geprüft wird deshalb, dass sich alle drei
	// Arten paarweise strukturell unterscheiden (Strichmuster, Endmarke), unabhängig von Farbe.
	test('unterscheiden sich die drei Arten strukturell, nicht nur über die Farbe', async ({ page }) => {
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
		await page.goto('/');

		const req = page.getByTestId('edge-a-b-requires');
		const rel = page.getByTestId('edge-a-c-relates');
		const exc = page.getByTestId('edge-a-d-excludes');

		const reqDash = await req.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const relDash = await rel.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const excDash = await exc.evaluate((el) => getComputedStyle(el).strokeDasharray);
		const reqMarker = await req.getAttribute('marker-end');
		const excMarker = await exc.getAttribute('marker-end');
		const crossmarkVisible = await page.getByTestId('edge-crossmark-a-d').isVisible();

		// relates unterscheidet sich von requires durch das Strichmuster (gestrichelt).
		expect(relDash).not.toBe(reqDash);
		// excludes unterscheidet sich von requires und relates durch die Endmarke (x-Marke statt
		// Pfeilspitze), unabhängig vom Strichmuster.
		expect(excMarker).toBeFalsy();
		expect(reqMarker).toBeTruthy();
		expect(crossmarkVisible).toBe(true);
	});

	// AK: „In der Nachttafel wechseln Linien, Marken und Kartusche mit." Ausschließlich Token
	// aus src/app.css (features/README.md, Leitplanke 1).
	test('Linien, Endmarken und Zeichenerklärung wechseln mit der Nachttafel', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
		await page.goto('/');

		const req = page.getByTestId('edge-a-b-requires');
		const rel = page.getByTestId('edge-a-c-relates');
		const exc = page.getByTestId('edge-a-d-excludes');
		const legend = page.getByTestId('legend');

		await expect(req).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'ink')));
		await expect(rel).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'sea')));
		await expect(exc).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'magenta')));
		await expect(legend).toHaveCSS('background-color', hexToRgb(tokenHex('light', 'paper')));

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await expect(req).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'ink')));
		await expect(rel).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'sea')));
		await expect(exc).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'magenta')));
		await expect(legend).toHaveCSS('background-color', hexToRgb(tokenHex('dark', 'paper')));
	});

	// F-10, Abschnitt „Signaturenkatalog": „Die Zeichenerklärung liegt als Kartusche unten
	// rechts über der Karte … mit den vier Einträgen benötigt, hängt zusammen, schließt aus,
	// Vorbedingung und deren Musterlinien."
	test('zeigt die Zeichenerklärung mit allen vier Einträgen und Musterlinien', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
		await page.goto('/');

		const legend = page.getByTestId('legend');
		await expect(legend).toBeVisible();
		await expect(legend.getByText('benötigt')).toBeVisible();
		await expect(legend.getByText('hängt zusammen')).toBeVisible();
		await expect(legend.getByText('schließt aus')).toBeVisible();
		await expect(legend.getByText('Vorbedingung')).toBeVisible();

		for (const testId of [
			'legend-requires',
			'legend-relates',
			'legend-excludes',
			'legend-vorbedingung'
		]) {
			const entry = page.getByTestId(testId);
			await expect(entry).toBeVisible();
			expect(await entry.locator('svg').count()).toBeGreaterThan(0);
		}
	});

	// F-10, Abschnitt „Signaturenkatalog": „Unter 1080 px Fensterbreite wird sie ausgeblendet."
	test('blendet die Zeichenerklärung unter 1080 px Fensterbreite aus', async ({ page }) => {
		await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);

		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await expect(page.getByTestId('legend')).toBeVisible();

		await page.setViewportSize({ width: 1000, height: 900 });
		await expect(page.getByTestId('legend')).toBeHidden();
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich): Kanten bleiben bei 375, 834 und 1440 px sichtbar
	// und ohne horizontales Scrollen.
	for (const breite of BREAKPOINTS) {
		test(`zeigt Kanten ohne horizontales Scrollen bei ${breite}px`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, DREI_ARTEN, DREI_RELATIONEN);
			await page.goto('/');

			await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
			await expect(page.getByTestId('edge-a-c-relates')).toBeVisible();
			await expect(page.getByTestId('edge-a-d-excludes')).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
