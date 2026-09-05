// F-09 · Feature-Signaturen und Jitter — E2E-Tests.
// Quellen: features/F-09-feature-signaturen.md (Akzeptanzkriterien, Abschnitte „Darstellung"
// und „Fachregeln"), PRD.md (AK-05, AK-13, FR-23, FR-30, FR-31, NFR-21, NFR-02),
// design/03-seekarte.html (Klassen `.node`, `.node .snd`, `.anchor`), features/README.md
// (Sprachtabelle: Lotung, Kennung).
//
// Vergebene data-testid (nirgends über Rolle/Text eindeutig zu greifen, weil mehrere Features
// dieselbe Lotung oder — im Test — teils denselben Anzeigenamen tragen können):
//   - feature-node-<id>     das Signaturelement (Punkt) eines Features, Klick- und Messziel
//   - feature-label-<id>    der Anzeigename-/Kennungstext neben dem Punkt
//   - feature-lotung-<id>   der Lotungstext („13 · 8") unter dem Namen
//   - feature-anchor        Ankerkreuz einer versetzten Gruppe (0..n Treffer, s. u.)
//
// Bereits von F-08 vergeben, hier nicht erneut benutzt: map-frame, grid-line, region-*,
// tick-x-<Wert>, tick-y-<Wert>.
//
// Ohne Formular (F-13 folgt erst später) lässt sich eine Karte nur über den LocalStorage vor
// dem Laden vorbelegen (Muster aus e2e/F-04-persistenz.spec.ts) oder durch zwei getrennte
// Seitenaufrufe mit unterschiedlichem Bestand vergleichen — beide Wege werden hier für die
// Akzeptanzkriterien genutzt, die eine „Änderung" voraussetzen (kein Live-Update, weil die
// Anwendung an dieser Stelle noch keine Bedienung dafür bietet).

import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const STORAGE_KEY = 'featuremap.map';
const BREAKPOINTS = [375, 834, 1440];

type SeedFeature = { id: string; label?: string; impact: number; effort: number };

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04). */
async function seedMap(page: Page, features: SeedFeature[]) {
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

function hexToRgb(hex: string): string {
	const clean = hex.replace('#', '');
	const value = parseInt(clean, 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgb(${r}, ${g}, ${b})`;
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	expect(box, 'Element sollte eine sichtbare Bounding Box haben').not.toBeNull();
	return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

test.describe('F-09 · Feature-Signaturen und Jitter', () => {
	// AK-05 (PRD, F-09 „Akzeptanzkriterien"): drei Features mit identischem Wertepaar sind
	// einzeln erkennbar und einzeln anklickbar, ihre Lotungen zeigen alle „5 · 5" — trotz
	// Versatz bleiben die angezeigten Originalwerte unverändert (FR-31).
	test('drei Features mit gleichem Wertepaar sind einzeln erkennbar, anklickbar und zeigen dieselbe Lotung (AK-05)', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'eins', label: 'Eins', impact: 5, effort: 5 },
			{ id: 'zwei', label: 'Zwei', impact: 5, effort: 5 },
			{ id: 'drei', label: 'Drei', impact: 5, effort: 5 }
		]);
		await page.goto('/');

		const ids = ['eins', 'zwei', 'drei'];
		const nodes = ids.map((id) => page.getByTestId(`feature-node-${id}`));

		for (const node of nodes) {
			await expect(node).toBeVisible();
		}
		for (const id of ids) {
			await expect(page.getByTestId(`feature-lotung-${id}`)).toHaveText('5 · 5');
		}

		const centers = await Promise.all(nodes.map(center));
		for (let i = 0; i < centers.length; i++) {
			for (let j = i + 1; j < centers.length; j++) {
				const abstand = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
				expect(abstand, `Feature ${ids[i]} und ${ids[j]} sollten getrennte Ziele sein`).toBeGreaterThan(
					1
				);
			}
		}

		for (const node of nodes) {
			await node.click();
		}
	});

	// FR-23: „Jedes Feature wird als Kreis mit Beschriftung dargestellt." Sichtbarer Name und
	// Lotung neben dem Signaturpunkt.
	test('zeigt ein Feature als Punkt mit Namen und Lotung', async ({ page }) => {
		await seedMap(page, [{ id: 'kasse', label: 'Checkout überarbeiten', impact: 8, effort: 5 }]);
		await page.goto('/');

		await expect(page.getByTestId('feature-node-kasse')).toBeVisible();
		await expect(page.getByText('Checkout überarbeiten')).toBeVisible();
		await expect(page.getByTestId('feature-lotung-kasse')).toHaveText('8 · 5');
	});

	// F-09-AK: „Ein Feature ohne Anzeigenamen zeigt seine Kennung."
	test('zeigt bei fehlendem Anzeigenamen die Kennung', async ({ page }) => {
		await seedMap(page, [{ id: 'ohne_namen', impact: 3, effort: 2 }]);
		await page.goto('/');

		await expect(page.getByTestId('feature-label-ohne_namen')).toHaveText('ohne_namen');
	});

	// AK-13 (PRD, F-09 „Akzeptanzkriterien"): ein Anzeigename mit Skript-Inhalt erscheint als
	// sichtbarer Text, ohne dass das Skript ausgeführt wird (NFR-21, NFR-22: kein `{@html}`).
	test('rendert einen Skript-Anzeigenamen als reinen Text, ohne Skriptausführung (AK-13)', async ({
		page
	}) => {
		const dialoge: string[] = [];
		page.on('dialog', (dialog) => {
			dialoge.push(dialog.message());
			void dialog.dismiss();
		});

		await seedMap(page, [
			{ id: 'unsicher', label: '<script>alert(1)</script>', impact: 13, effort: 8 }
		]);
		await page.goto('/');

		await expect(page.getByTestId('feature-label-unsicher')).toHaveText('<script>alert(1)</script>');

		const eingeschleusteSkripte = await page.evaluate(
			() =>
				Array.from(document.querySelectorAll('script')).filter((el) =>
					el.textContent?.includes('alert(1)')
				).length
		);
		expect(eingeschleusteSkripte).toBe(0);
		expect(dialoge).toEqual([]);
	});

	// F-09-AK: „Zweimaliges Rendern derselben Karte ergibt identische Koordinaten; auch nach
	// einem Neuladen der Seite." FR-32 (Versatz deterministisch aus der Kennung).
	test('liefert nach einem Neuladen der Seite identische Koordinaten', async ({ page }) => {
		await seedMap(page, [
			{ id: 'a', impact: 5, effort: 5 },
			{ id: 'b', impact: 5, effort: 5 },
			{ id: 'c', impact: 13, effort: 2 }
		]);
		await page.goto('/');

		const ids = ['a', 'b', 'c'];
		const vorher = await Promise.all(
			ids.map((id) => center(page.getByTestId(`feature-node-${id}`)))
		);

		await page.reload();
		const nachher = await Promise.all(
			ids.map((id) => center(page.getByTestId(`feature-node-${id}`)))
		);

		for (let i = 0; i < ids.length; i++) {
			expect(nachher[i].x, `x-Koordinate von ${ids[i]} nach Neuladen`).toBeCloseTo(vorher[i].x, 0);
			expect(nachher[i].y, `y-Koordinate von ${ids[i]} nach Neuladen`).toBeCloseTo(vorher[i].y, 0);
		}
	});

	// F-09-AK: „Das Hinzufügen eines vierten Features auf demselben Wertepaar verändert die
	// Anordnung der Gruppe, aber nicht die Position anderer Gruppen." Ohne Formular (F-13 folgt
	// später) wird der Zustand „vor" und „nach" der Änderung über zwei vorbelegte Seitenaufrufe
	// verglichen statt über eine Live-Interaktion.
	test('ein viertes Feature im selben Wertepaar verändert nur diese Gruppe', async ({ page }) => {
		const unberuehrt: SeedFeature = { id: 'unberuehrt', impact: 2, effort: 3 };
		const gruppeVorher: SeedFeature[] = [
			{ id: 'g1', impact: 5, effort: 5 },
			{ id: 'g2', impact: 5, effort: 5 },
			{ id: 'g3', impact: 5, effort: 5 }
		];

		await seedMap(page, [...gruppeVorher, unberuehrt]);
		await page.goto('/');
		const unberuehrtVorher = await center(page.getByTestId('feature-node-unberuehrt'));
		const gruppeVorherPos = await Promise.all(
			['g1', 'g2', 'g3'].map((id) => center(page.getByTestId(`feature-node-${id}`)))
		);

		await seedMap(page, [...gruppeVorher, { id: 'g4', impact: 5, effort: 5 }, unberuehrt]);
		await page.goto('/');
		const unberuehrtNachher = await center(page.getByTestId('feature-node-unberuehrt'));
		const gruppeNachherPos = await Promise.all(
			['g1', 'g2', 'g3'].map((id) => center(page.getByTestId(`feature-node-${id}`)))
		);

		expect(unberuehrtNachher.x).toBeCloseTo(unberuehrtVorher.x, 0);
		expect(unberuehrtNachher.y).toBeCloseTo(unberuehrtVorher.y, 0);

		const mindestensEineVeraendert = gruppeVorherPos.some((vor, i) => {
			const nach = gruppeNachherPos[i];
			return Math.hypot(nach.x - vor.x, nach.y - vor.y) > 0.5;
		});
		expect(
			mindestensEineVeraendert,
			'mindestens eines der ursprünglichen drei Gruppenmitglieder sollte seine Position ändern'
		).toBe(true);
	});

	// Darstellung (features/F-09-feature-signaturen.md): „Liegt ein Feature so weit rechts,
	// dass sein Name über den Rahmen liefe (Mittelpunkt jenseits von 82 % der Plotbreite), wird
	// der Name links neben den Punkt gesetzt und rechtsbündig ausgerichtet."
	test('setzt den Namen links neben den Punkt, wenn dieser nahe am rechten Rand liegt', async ({
		page
	}) => {
		// effort = 21 bei domainMax = 22 (leere Karte + dieses Feature) liegt bei x = 920 von
		// 880 Plotbreite ab 80 — deutlich jenseits der 82-%-Schwelle bei x ≈ 801,6.
		await seedMap(page, [{ id: 'randfall', label: 'Ganz rechts', impact: 13, effort: 21 }]);
		await page.goto('/');

		const punkt = await center(page.getByTestId('feature-node-randfall'));
		const namensBox = await page.getByTestId('feature-label-randfall').boundingBox();
		expect(namensBox).not.toBeNull();

		expect(
			namensBox!.x + namensBox!.width,
			'der Name sollte links vom Signaturpunkt enden, nicht rechts von ihm beginnen'
		).toBeLessThanOrEqual(punkt.x + 1);
	});

	// Darstellung: „Ankerkreuz. Bei versetzten Signaturen ein Kreuz … auf dem Ankerpunkt."
	// Nur Gruppen mit Versatz zeigen ein Ankerkreuz, eine Einzelgruppe zeigt keins.
	test('zeigt ein Ankerkreuz nur bei versetzten Gruppen, nie bei Einzelgruppen', async ({ page }) => {
		await seedMap(page, [
			{ id: 'p1', impact: 5, effort: 5 },
			{ id: 'p2', impact: 5, effort: 5 },
			{ id: 'einzeln', impact: 13, effort: 2 }
		]);
		await page.goto('/');

		await expect(page.getByTestId('feature-anchor').first()).toBeVisible();
	});

	test('zeigt kein Ankerkreuz, solange kein Wertepaar mehrfach vorkommt', async ({ page }) => {
		await seedMap(page, [
			{ id: 'p1', impact: 5, effort: 5 },
			{ id: 'p2', impact: 13, effort: 2 }
		]);
		await page.goto('/');

		await expect(page.getByTestId('feature-node-p1')).toBeVisible();
		await expect(page.getByTestId('feature-anchor')).toHaveCount(0);
	});

	// Nachttafel (CLAUDE.md, Abschnitt „QA-Abgleich"): der Signaturpunkt wechselt mit der Tafel
	// (design/03-seekarte.html: `.node circle{fill:var(--ink)}`).
	test('der Signaturpunkt wechselt mit der Nachttafel', async ({ page }) => {
		await seedMap(page, [{ id: 'tafel', impact: 5, effort: 5 }]);
		await page.goto('/');

		const punkt = page.getByTestId('feature-node-tafel');
		await expect(punkt).toHaveCSS('fill', hexToRgb(tokenHex('light', 'ink')));

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await expect(punkt).toHaveCSS('fill', hexToRgb(tokenHex('dark', 'ink')));
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich): Signaturen bleiben bei 375, 834 und 1440 px
	// sichtbar und ohne horizontales Scrollen.
	for (const breite of BREAKPOINTS) {
		test(`zeigt Feature-Signaturen ohne horizontales Scrollen bei ${breite}px`, async ({ page }) => {
			await seedMap(page, [
				{ id: 'a', label: 'Erstes Feature', impact: 5, effort: 5 },
				{ id: 'b', label: 'Zweites Feature', impact: 13, effort: 8 }
			]);
			await page.setViewportSize({ width: breite, height: 800 });
			await page.goto('/');

			await expect(page.getByTestId('feature-node-a')).toBeVisible();
			await expect(page.getByTestId('feature-node-b')).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
