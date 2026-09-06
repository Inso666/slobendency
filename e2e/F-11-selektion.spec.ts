// F-11 · Selektion, Hervorhebung, Dimming — E2E-Tests.
// Quellen: features/F-11-selektion.md (Akzeptanzkriterien, Abschnitte „Darstellung",
// „Interaktion", „Fachregeln"), PRD.md (FR-40 bis FR-46, NFR-03, AK-06, AK-07),
// design/03-seekarte.html (Klassen `.node.sel`, `.halo`, `.dim`, Umschalter „Hervorhebung"
// mit den Beschriftungen „Nur direkte" / „Transitiv"), features/README.md (Sprachtabelle).
//
// Neu vergebene data-testid (nirgends über Rolle/Text eindeutig zu greifen, weil der Halo ein
// reines Signaturelement ohne Eigentext ist):
//   - feature-halo-<id>   der Halo-Kreis um das selektierte Feature (0..1 Treffer gleichzeitig,
//                         da genau eine Selektion möglich ist)
//
// Alles andere wird über Rolle/Text oder bereits vergebene Kennzeichen aus F-08 bis F-10
// angesprochen: feature-node-<id>, edge-<from>-<to>-<type>, edge-label-<from>-<to>-<type>,
// sowie die Rollen "img" (Kartenfläche, für Klicks auf freie Fläche) und "group" mit
// aria-label "Hervorhebung" samt den Schaltflächen „Nur direkte"/„Transitiv"
// (design/03-seekarte.html, Kopfband).
//
// Ohne Formular und Kontextmenü (F-13, F-16 folgen erst später) wird die Karte über den
// LocalStorage vorbelegt (Muster aus e2e/F-09-feature-signaturen.spec.ts,
// e2e/F-10-kanten.spec.ts).

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

/**
 * Tatsächliche (multiplizierte) Deckkraft eines Elements: läuft die Vorfahrenkette bis zum
 * SVG-Wurzelelement hoch und multipliziert jede gesetzte `opacity`, weil eine Dimming-Klasse an
 * einem umschließenden `<g>` sitzen kann statt am Element selbst (design/03-seekarte.html:
 * `<g class="dim">…</g>` umschließt mehrere Signaturen). So bleibt der Test unabhängig davon,
 * auf welcher Ebene der Feature-Agent `.dim` tatsächlich setzt.
 */
async function effectiveOpacity(page: Page, testId: string): Promise<number> {
	return page.evaluate((id) => {
		const el = document.querySelector(`[data-testid="${CSS.escape(id)}"]`);
		if (!el) throw new Error(`Testaufbau: Element mit data-testid ${id} nicht gefunden`);
		let node: Element | null = el;
		let opacity = 1;
		while (node && node.tagName.toLowerCase() !== 'svg') {
			const value = parseFloat(getComputedStyle(node).opacity);
			if (!Number.isNaN(value)) opacity *= value;
			node = node.parentElement;
		}
		return opacity;
	}, testId);
}

/** Klickt auf eine freie Stelle der Kartenfläche, fernab jeder Signatur (F-11, FR-46). */
async function clickBlankArea(page: Page): Promise<void> {
	const map = page.getByRole('img', { name: /Streudiagramm/ });
	const box = await map.boundingBox();
	expect(box, 'Kartenfläche sollte eine sichtbare Bounding Box haben').not.toBeNull();
	// Oben rechts in der Plotfläche: alle Testkarten dieser Datei verwenden niedrige
	// Impact-/Effort-Werte, die unten links landen (FR-20/FR-21) — diese Ecke bleibt frei.
	await map.click({ position: { x: box!.width * 0.95, y: box!.height * 0.95 } });
}

const KETTE: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 3, effort: 1 },
	{ id: 'b', label: 'B', impact: 2, effort: 2 },
	{ id: 'c', label: 'C', impact: 1, effort: 3 }
];

// Unbeteiligtes Feature ohne jede Beziehung zur Kette — dient als Gegenprobe: Bliebe Dimming
// gänzlich unimplementiert, stünden alle Features unverändert bei Deckkraft 1, und ein Test,
// der nur „B und C bleiben sichtbar" prüft, würde auch ohne jede Umsetzung grün laufen. Erst
// der Kontrast zu einem tatsächlich abgedunkelten Element macht den Test aussagekräftig.
const UNBETEILIGT: SeedFeature = { id: 'z', label: 'Z', impact: 1, effort: 1 };

test.describe('F-11 · Selektion, Hervorhebung, Dimming', () => {
	// AK-06 (PRD, F-11 „Akzeptanzkriterien"): „Kette A → B → C: Selektion von A hebt B und C
	// hervor." Die Gegenprobe an Z (ohne jede Beziehung) macht den Test aussagekräftig: Bliebe
	// Dimming unimplementiert, stünde auch Z bei voller Deckkraft.
	test('hebt bei einer requires-Kette A → B → C nach Klick auf A auch B und C hervor', async ({
		page
	}) => {
		await seedMap(page, [...KETTE, UNBETEILIGT], [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		await expect.poll(() => effectiveOpacity(page, 'feature-node-a')).toBeCloseTo(1, 1);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-b')).toBeCloseTo(1, 1);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-z')).toBeCloseTo(0.24, 1);
	});

	// AK-07 (PRD, F-11 „Akzeptanzkriterien"): „A requires B, B relates C: Selektion von A hebt
	// C nicht hervor."
	test('hebt C nicht hervor, wenn A requires B und B relates C gilt', async ({ page }) => {
		await seedMap(page, KETTE, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'relates' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		await expect.poll(() => effectiveOpacity(page, 'feature-node-b')).toBeCloseTo(1, 1);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(0.24, 1);
	});

	// F-11-AK: „Umschalten auf nur direkte nimmt C aus der Hervorhebung, ohne die Selektion zu
	// lösen." FR-44.
	test('nimmt C nach Umschalten auf „Nur direkte" aus der Hervorhebung, ohne die Selektion zu lösen', async ({
		page
	}) => {
		await seedMap(page, KETTE, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();

		const umschalter = page.getByRole('group', { name: 'Hervorhebung' });
		await umschalter.getByRole('button', { name: 'Nur direkte' }).click();

		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(0.24, 1);
		// Die Selektion bleibt bestehen: A ist weiterhin selektiert und voll sichtbar.
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-a')).toBeCloseTo(1, 1);
		await expect(umschalter.getByRole('button', { name: 'Nur direkte' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(umschalter.getByRole('button', { name: 'Transitiv' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	// F-11-AK: „Ein Feature, das nur eingehende requires-Kanten zum selektierten Feature hat,
	// bleibt abgedunkelt."
	test('dunkelt ein Feature ab, das nur eine eingehende requires-Kante zum selektierten Feature hat', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 2, effort: 2 },
				{ id: 'x', label: 'X', impact: 1, effort: 1 }
			],
			[{ from: 'x', to: 'a', type: 'requires' }]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		await expect.poll(() => effectiveOpacity(page, 'feature-node-x')).toBeCloseTo(0.24, 1);
	});

	// F-11-AK: „Abgedunkelte Elemente sind sichtbar, aber deutlich zurückgenommen; nichts
	// verschwindet." FR-43.
	test('bleiben abgedunkelte Features und Kanten sichtbar, statt zu verschwinden', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 2, effort: 2 },
				{ id: 'x', label: 'X', impact: 1, effort: 1 }
			],
			[{ from: 'x', to: 'a', type: 'requires' }]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		const dimmedNode = page.getByTestId('feature-node-x');
		const dimmedEdge = page.getByTestId('edge-x-a-requires');
		await expect(dimmedNode).toBeVisible();
		await expect(dimmedEdge).toBeVisible();

		const nodeOpacity = await effectiveOpacity(page, 'feature-node-x');
		const edgeOpacity = await effectiveOpacity(page, 'edge-x-a-requires');
		expect(nodeOpacity, 'abgedunkeltes Feature sollte weder unsichtbar noch voll sichtbar sein').toBeGreaterThan(0);
		expect(nodeOpacity).toBeLessThan(0.9);
		expect(edgeOpacity, 'abgedunkelte Kante sollte weder unsichtbar noch voll sichtbar sein').toBeGreaterThan(0);
		expect(edgeOpacity).toBeLessThan(0.9);
	});

	// F-11-AK: „Beschriftungen erscheinen ausschließlich an hervorgehobenen oder überfahrenen
	// Kanten." FR-45. Ohne Selektion: Hover blendet die Beschriftung der überfahrenen Kante ein.
	test('blendet die Beschriftung einer Kante beim Überfahren ein, ohne dass eine Selektion aktiv ist', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'c', label: 'C', impact: 1, effort: 1 },
				{ id: 'd', label: 'D', impact: 6, effort: 6 }
			],
			[{ from: 'c', to: 'd', type: 'relates', label: 'gemeinsame Events' }]
		);
		await page.goto('/');

		const label = page.getByTestId('edge-label-c-d-relates');
		await expect(label).toBeHidden();

		// force: true, weil Playwrights Trefferprüfung am exakten Mittelpunkt der Bounding Box
		// bei einer nur 1,4 Einheiten dünnen Linie leicht auf das darunterliegende Revier statt
		// auf den Strich selbst trifft — visuell liegt der Zielpunkt eindeutig auf der Kante.
		await page.getByTestId('edge-c-d-relates').hover({ force: true });
		await expect(label).toBeVisible();

		await page.mouse.move(1, 1);
		await expect(label).toBeHidden();
	});

	// F-11-AK, gleiches Kriterium: bei aktiver Selektion ist die Beschriftung einer
	// hervorgehobenen Kante ohne Hover sichtbar, die einer abgedunkelten Kante bleibt verborgen.
	test('zeigt die Beschriftung einer hervorgehobenen Kante bei Selektion, verbirgt sie an einer abgedunkelten Kante', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 3, effort: 1 },
				{ id: 'b', label: 'B', impact: 2, effort: 2 },
				{ id: 'c', label: 'C', impact: 1, effort: 3 },
				{ id: 'd', label: 'D', impact: 7, effort: 9 }
			],
			[
				{ from: 'a', to: 'b', type: 'requires', label: 'nutzt Identität' },
				{ from: 'c', to: 'd', type: 'relates', label: 'gemeinsame Events' }
			]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		await expect(page.getByTestId('edge-label-a-b-requires')).toBeVisible();
		await expect(page.getByTestId('edge-label-c-d-relates')).toBeHidden();
	});

	// F-11-AK: „ESC und Klick auf freie Fläche heben die Selektion auf." FR-46.
	test('hebt ESC die Selektion auf', async ({ page }) => {
		await seedMap(page, KETTE, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);

		await page.keyboard.press('Escape');

		await expect(page.getByTestId('feature-halo-a')).toHaveCount(0);
		// Ohne Selektion gibt es kein Dimming mehr — C ist wieder voll sichtbar.
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);
	});

	test('hebt ein Klick auf freie Fläche die Selektion auf', async ({ page }) => {
		await seedMap(page, KETTE, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();

		await clickBlankArea(page);

		await expect(page.getByTestId('feature-halo-a')).toHaveCount(0);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);
	});

	// F-11, Abschnitt „Darstellung": „Selektiertes Feature: .node.sel: Punkt in --magenta,
	// umgebender Halo-Kreis .halo Radius 15 in --magenta, Name in 600."
	test('zeichnet das selektierte Feature mit Magenta-Punkt, Halo und fettem Namen', async ({
		page
	}) => {
		await seedMap(page, KETTE);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		const node = page.getByTestId('feature-node-a');
		const halo = page.getByTestId('feature-halo-a');
		await expect(node).toHaveCSS('fill', hexToRgb(tokenHex('light', 'magenta')));
		await expect(halo).toBeVisible();
		await expect(halo).toHaveAttribute('r', '15');
		await expect(halo).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'magenta')));
		await expect(page.getByTestId('feature-label-a')).toHaveCSS('font-weight', '600');
	});

	// CLAUDE.md „QA-Abgleich": Nachttafel. F-11, Abschnitt „Darstellung": Deckkraft 0,24 in der
	// Tag-, 0,3 in der Nachttafel.
	test('dunkelt in der Nachttafel auf 0,3 statt 0,24 ab', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 2, effort: 2 },
				{ id: 'x', label: 'X', impact: 1, effort: 1 }
			],
			[{ from: 'x', to: 'a', type: 'requires' }]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-x')).toBeCloseTo(0.24, 1);

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await expect.poll(() => effectiveOpacity(page, 'feature-node-x')).toBeCloseTo(0.3, 1);
	});

	// F-11-AK / NFR-03: „Bei 100 Features und 300 Kanten liegt die Zeit zwischen Klick und
	// fertiger Hervorhebung unter 50 ms." Gemessen wird direkt im Browser zwischen dem
	// dispatchten Klick-Event und dem übernächsten Animationsframe (zwei rAF-Ticks, damit das
	// durch die Klasse `.dim` veränderte Rendering sicher übernommen ist) — unabhängig von der
	// Playwright-IPC-Laufzeit, die sonst mitgemessen und die Zusicherung verfälschen würde.
	test('hebt bei 100 Features und 300 Kanten innerhalb von 50 ms hervor', async ({ page }) => {
		const features: SeedFeature[] = [];
		for (let i = 0; i < 100; i++) {
			features.push({ id: `f${i}`, impact: 1 + (i % 20), effort: 1 + ((i * 3) % 20) });
		}
		// Zusätzliche relates-Kanten als Bijektion je Versatz (from → (from+offset) mod 100):
		// jedes Paar entsteht so höchstens einmal, INT-04 (keine doppelte Beziehung) bleibt beim
		// Restaurieren aus dem LocalStorage über addRelation gewahrt (persistence.ts, F-04).
		const relations: SeedRelation[] = [];
		for (let i = 0; i < 99; i++) relations.push({ from: `f${i}`, to: `f${i + 1}`, type: 'requires' });
		outer: for (let offset = 1; offset < 100; offset++) {
			for (let from = 0; from < 100; from++) {
				if (relations.length >= 300) break outer;
				const to = (from + offset) % 100;
				relations.push({ from: `f${from}`, to: `f${to}`, type: 'relates' });
			}
		}

		await seedMap(page, features, relations);
		await page.goto('/');
		await expect(page.getByTestId('feature-node-f0')).toBeVisible();

		const duration = await page.evaluate(
			() =>
				new Promise<number>((resolve) => {
					const el = document.querySelector('[data-testid="feature-node-f0"]');
					if (!el) throw new Error('Testaufbau: feature-node-f0 nicht gefunden');
					const start = performance.now();
					el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
					requestAnimationFrame(() => {
						requestAnimationFrame(() => resolve(performance.now() - start));
					});
				})
		);

		// Die Zeitmessung allein wäre ohne jede Umsetzung trivial unter 50 ms (ein
		// wirkungsloser Klick braucht praktisch 0 ms) — erst der Nachweis, dass die Selektion
		// tatsächlich stattgefunden hat, macht den Test aussagekräftig.
		await expect(page.getByTestId('feature-halo-f0')).toBeVisible();
		expect(duration).toBeLessThan(50);
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich): Selektion und Dimming funktionieren bei 375, 834
	// und 1440 px ohne horizontales Scrollen.
	for (const breite of BREAKPOINTS) {
		test(`selektiert und dunkelt bei ${breite}px ohne horizontales Scrollen ab`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, KETTE, [
				{ from: 'a', to: 'b', type: 'requires' },
				{ from: 'b', to: 'c', type: 'requires' }
			]);
			await page.goto('/');

			await page.getByTestId('feature-node-a').click();

			await expect(page.getByTestId('feature-halo-a')).toBeVisible();
			await expect.poll(() => effectiveOpacity(page, 'feature-node-b')).toBeCloseTo(1, 1);

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
