// F-01 · Projektgerüst und Kartentafel — E2E-Tests.
// Quellen: features/F-01-projektgeruest.md (Akzeptanzkriterien), PRD.md (NFR-20, UI-18),
// design/03-seekarte.html (Kopfband, Tafelwechsel).
//
// Die Kartenfläche selbst (Achsen, Reviere, Features) ist nicht Teil dieses Features
// ("Nicht Teil dieses Features"); geprüft wird nur das dreiteilige Grundgerüst
// (Kopfband/Kartenfläche/Fußleiste) und die Tafelumschaltung.
//
// Die Vorschau (playwright.config.ts webServer) liefert den fertig gebauten
// adapter-static-Ausgabeordner aus — ohne SSR zur Laufzeit — und steht damit
// stellvertretend für "beliebiges Static Hosting" (F-01-AK1, NFR-20).

import { expect, test } from '@playwright/test';

// Referenz-Breakpoints aus PRD UI-18 / CLAUDE.md QA-Abgleich.
const BREAKPOINTS = [375, 834, 1440];

test.describe('F-01 · Projektgerüst und Kartentafel', () => {
	// F-01-AK1: „npm run build erzeugt statische Dateien, die sich ohne Server über file://
	// oder von beliebigem Static Hosting öffnen lassen."
	test('Startseite öffnet ohne Serveraufruf und zeigt das Grundgerüst', async ({ page }) => {
		const fremdAufrufe: string[] = [];
		page.on('request', (request) => {
			if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
				fremdAufrufe.push(request.url());
			}
		});

		const response = await page.goto('/');
		expect(response?.ok()).toBe(true);
		expect(fremdAufrufe).toEqual([]);

		await expect(page.getByRole('banner')).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
		await expect(page.getByRole('contentinfo')).toBeVisible();
	});

	// F-01-AK2: „Die Startseite zeigt Kopfband, leere Kartenfläche und Fußleiste in der
	// Aufteilung des Entwurfs; die Seite scrollt bei keiner Fenstergröße horizontal."
	for (const breite of BREAKPOINTS) {
		test(`zeigt Kopfband, Kartenfläche und Fußleiste ohne horizontales Scrollen bei ${breite}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await page.goto('/');

			await expect(page.getByRole('banner')).toBeVisible();
			await expect(page.getByRole('main')).toBeVisible();
			await expect(page.getByRole('contentinfo')).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}

	// F-01-AK3: „Der Schalter Tafel wechselt zwischen Tag und Nacht; alle sichtbaren
	// Flächen wechseln mit, weil sie ausschließlich Token verwenden."
	test('Schalter Tafel wechselt zwischen Tag und Nacht', async ({ page }) => {
		await page.goto('/');

		const tagKnopf = page.getByRole('button', { name: 'Tag' });
		const nachtKnopf = page.getByRole('button', { name: 'Nacht' });

		await expect(tagKnopf).toHaveAttribute('aria-pressed', 'true');
		await expect(nachtKnopf).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await nachtKnopf.click();

		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(nachtKnopf).toHaveAttribute('aria-pressed', 'true');
		await expect(tagKnopf).toHaveAttribute('aria-pressed', 'false');
	});

	// F-01-AK4: „Nach einem Neuladen ist die zuletzt gewählte Tafel wieder aktiv."
	test('merkt die gewählte Tafel über ein Neuladen hinweg', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await page.reload();

		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.getByRole('button', { name: 'Nacht' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	// F-01-AK5: „Tastaturfokus ist auf jedem Bedienelement sichtbar." Fokusring über
	// :focus-visible in --magenta (design/03-seekarte.html).
	test('zeigt einen sichtbaren Tastaturfokus auf den Tafel-Schaltern', async ({ page }) => {
		await page.goto('/');

		const tagKnopf = page.getByRole('button', { name: 'Tag' });
		await tagKnopf.focus();

		const outline = await tagKnopf.evaluate((el) => {
			const style = getComputedStyle(el);
			return { style: style.outlineStyle, width: style.outlineWidth };
		});

		expect(outline.style).not.toBe('none');
		expect(outline.width).not.toBe('0px');
	});
});
