// F-08 · Kartengerüst: Skalen, Raster, Reviere — E2E-Tests.
// Quellen: features/F-08-kartengeruest.md (Akzeptanzkriterien), PRD.md (FR-20, FR-21, FR-22,
// FR-26), design/03-seekarte.html (Reviernamen, Rahmen, Teilstriche, Achsentitel),
// features/README.md (Abschnitt „Zwei Präzisierungen…", Revier-Grenze).
//
// Vergebene data-testid (nirgends über Rolle/Text eindeutig zu greifen):
//   - map-frame                    Rahmen um die Plotfläche
//   - grid-line                    je Gitterlinie (mehrfach vergeben)
//   - region-quickWins             getöntes Rechteck „Quick Wins"
//   - region-grosseVorhaben        getöntes Rechteck „Große Vorhaben"
//   - region-nebenbei              getöntes Rechteck „Nebenbei"
//   - region-vermeiden             getöntes Rechteck „Vermeiden"
//   - tick-x-<Wert>                Teilstrichbeschriftung auf der x-Achse, z. B. tick-x-21
//   - tick-y-<Wert>                Teilstrichbeschriftung auf der y-Achse, z. B. tick-y-21
//
// Die Karte selbst zeigt in diesem Feature noch keine Features oder Kanten (F-09, F-10);
// geprüft werden ausschließlich Rahmen, Raster, Reviere und Achsen der leeren bzw. über
// LocalStorage vorbelegten Karte.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const STORAGE_KEY = 'featuremap.map';
const BREAKPOINTS = [375, 834, 1440];

const REGIONS = [
	{ testId: 'region-quickWins', name: /quick wins/i },
	{ testId: 'region-grosseVorhaben', name: /gro(ß|ss)e vorhaben/i },
	{ testId: 'region-nebenbei', name: /nebenbei/i },
	{ testId: 'region-vermeiden', name: /vermeiden/i }
] as const;

const LEER_KARTE_TICKS = [1, 2, 3, 5, 8, 13, 21];

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04). */
async function seedMap(page: Page, features: Array<{ id: string; impact: number; effort: number }>) {
	await page.addInitScript(
		({ key, value }) => {
			window.localStorage.setItem(key, value);
		},
		{
			key: STORAGE_KEY,
			value: JSON.stringify({ schemaVersion: 1, features, relations: [] })
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

/** Wandelt einen Hexfarbwert in die von getComputedStyle gelieferte rgb()-Schreibweise um. */
function hexToRgb(hex: string): string {
	const clean = hex.replace('#', '');
	const value = parseInt(clean, 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgb(${r}, ${g}, ${b})`;
}

test.describe('F-08 · Kartengerüst: Skalen, Raster, Reviere', () => {
	// F-08-AK: „Leere Karte: Teilstriche 1, 2, 3, 5, 8, 13, 21 auf beiden Achsen,
	// Reviergrenzen mittig." — FR-26 (Achsen skalieren mindestens bis 21).
	test('zeigt bei leerer Karte Rahmen und sieben Teilstriche je Achse', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByTestId('map-frame')).toBeVisible();

		for (const value of LEER_KARTE_TICKS) {
			await expect(page.getByTestId(`tick-x-${value}`)).toBeVisible();
			await expect(page.getByTestId(`tick-y-${value}`)).toBeVisible();
		}
	});

	// F-08-AK: „Vier Reviere, dezent beschriftet" (FR-22) — jedes Revier ist sichtbar und
	// mit seinem Namen aus design/03-seekarte.html beschriftet.
	test('zeigt vier getönte Reviere mit ihren Namen', async ({ page }) => {
		await page.goto('/');

		for (const region of REGIONS) {
			await expect(page.getByTestId(region.testId)).toBeVisible();
		}
		await expect(page.getByText(/quick wins/i)).toBeVisible();
		await expect(page.getByText(/gro(ß|ss)e vorhaben/i)).toBeVisible();
		await expect(page.getByText(/nebenbei/i)).toBeVisible();
		await expect(page.getByText(/vermeiden/i)).toBeVisible();
	});

	// F-08-AK: „Die Reviere decken die Plotfläche lückenlos und überlappungsfrei ab."
	test('die vier Reviere grenzen lückenlos und überlappungsfrei aneinander', async ({ page }) => {
		await page.goto('/');

		const boxes = new Map<string, { x: number; y: number; width: number; height: number }>();
		for (const region of REGIONS) {
			const box = await page.getByTestId(region.testId).boundingBox();
			expect(box, `${region.testId} sollte eine sichtbare Bounding Box haben`).not.toBeNull();
			boxes.set(region.testId, box!);
		}

		const quickWins = boxes.get('region-quickWins')!;
		const grosseVorhaben = boxes.get('region-grosseVorhaben')!;
		const nebenbei = boxes.get('region-nebenbei')!;
		const vermeiden = boxes.get('region-vermeiden')!;

		// Linke Spalte (Quick Wins / Nebenbei) grenzt lückenlos an die rechte Spalte
		// (Große Vorhaben / Vermeiden) — auf ein Pixel gerundet wegen Bildschirmskalierung.
		expect(Math.round(quickWins.x + quickWins.width)).toBeCloseTo(Math.round(grosseVorhaben.x), 0);
		expect(Math.round(nebenbei.x + nebenbei.width)).toBeCloseTo(Math.round(vermeiden.x), 0);
		// Obere Zeile (Quick Wins / Große Vorhaben) grenzt lückenlos an die untere Zeile
		// (Nebenbei / Vermeiden).
		expect(Math.round(quickWins.y + quickWins.height)).toBeCloseTo(Math.round(nebenbei.y), 0);
		expect(Math.round(grosseVorhaben.y + grosseVorhaben.height)).toBeCloseTo(
			Math.round(vermeiden.y),
			0
		);
		// Gleiche Spaltenbreiten bzw. Zeilenhöhen — die Reviergrenze liegt mittig (FR-22,
		// features/README.md „Revier-Grenze").
		expect(Math.round(quickWins.width)).toBeCloseTo(Math.round(grosseVorhaben.width), 0);
		expect(Math.round(quickWins.height)).toBeCloseTo(Math.round(nebenbei.height), 0);
	});

	// F-08-AK: „Ein Feature mit effort = 34 verschiebt domainMax auf 35; die Achse zeigt
	// zusätzlich den Teilstrich 34, alle Positionen skalieren mit."
	test('ein Feature mit effort = 34 zeigt zusätzlich den Teilstrich 34 auf beiden Achsen', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'gross', impact: 1, effort: 34 }]);
		await page.goto('/');

		for (const value of LEER_KARTE_TICKS) {
			await expect(page.getByTestId(`tick-x-${value}`)).toBeVisible();
		}
		await expect(page.getByTestId('tick-x-34')).toBeVisible();
		// domainMax gilt für beide Achsen gemeinsam (design/03-seekarte.html zeigt dieselbe
		// Teilstrichfolge auf x- und y-Achse), daher erscheint 34 auch auf der y-Achse.
		await expect(page.getByTestId('tick-y-34')).toBeVisible();
	});

	// F-08-AK: „In der Nachttafel wechseln alle Flächen und Linien mit; kein Element bleibt
	// hell." Ausschließlich Token aus src/app.css (features/README.md, Leitplanke 1).
	test('Rahmen, Raster und Reviere wechseln mit der Nachttafel', async ({ page }) => {
		await page.goto('/');

		const frame = page.getByTestId('map-frame');
		const gridLine = page.getByTestId('grid-line').first();
		const quickWins = page.getByTestId('region-quickWins');

		await expect(frame).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'rule')));
		await expect(gridLine).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'grid')));
		await expect(quickWins).toHaveCSS('fill', hexToRgb(tokenHex('light', 'shallow')));

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await expect(frame).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'rule')));
		await expect(gridLine).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'grid')));
		await expect(quickWins).toHaveCSS('fill', hexToRgb(tokenHex('dark', 'shallow')));
	});

	// MapCanvas.svelte: „SVG-Wurzel mit viewBox, role="img" und einer Beschreibung."
	test('die Karte ist als beschriebenes Bild zugänglich', async ({ page }) => {
		await page.goto('/');

		const map = page.getByRole('img');
		await expect(map).toBeVisible();
		const beschreibung = (await map.getAttribute('aria-label')) ?? '';
		expect(beschreibung.length).toBeGreaterThan(0);
		expect(beschreibung).toMatch(/effort/i);
		expect(beschreibung).toMatch(/impact/i);
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich) und PRD UI-18: Karte bleibt bei 375, 834 und
	// 1440 px sichtbar und ohne horizontales Scrollen (preserveAspectRatio, F-08 „Umfang").
	for (const breite of BREAKPOINTS) {
		test(`zeigt Rahmen und Reviernamen ohne horizontales Scrollen bei ${breite}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await page.goto('/');

			await expect(page.getByTestId('map-frame')).toBeVisible();
			await expect(page.getByText(/quick wins/i)).toBeVisible();
			await expect(page.getByText(/vermeiden/i)).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
