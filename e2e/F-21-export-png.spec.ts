// F-21 · PNG-Export — E2E-Tests.
// Quellen: features/F-21-export-png.md (Abschnitte „Umfang", „Ablauf", „Fachregeln",
// „Akzeptanzkriterien", „Tests": „E2E: Export bei 1× und 4× auslösen, Abmessungen der erzeugten
// Dateien vergleichen (AK-11)"), PRD.md (FR-64 bis FR-69, NFR-06, AK-11, AK-12, PRD 7.3
// „PNG-Export (FR-64/65)"), design/03-seekarte.html (Knopf „Exportieren" im Kopfband),
// design/README.md (Bausteine Rahmen/Kartusche/Panel), features/README.md (Sprachtabelle),
// CLAUDE.md (QA-Abgleich: Breakpoints 375/834/1440, Tag-/Nachttafel), sowie der bereits gemergte
// Code aus F-08 bis F-20 (data-testid-Muster feature-node-<id>, Menü „Exportieren" mit „Als
// Text"/„Als SVG" und dem Umschalter „Tafel für den Bildexport", src/lib/export/svg.ts
// buildExportSvg()), auf dem F-21 laut Abschnitt „DDD-Einordnung" vollständig aufsetzt.
//
// Neu vergebene data-testid (F-21, keine der drei Faktor-Knöpfe ist über Rolle/Text allein
// eindeutig ansprechbar, weil ihr sichtbarer Text während der Erzeugung von „1×"/„2×"/„4×" zu
// „Wird erzeugt …" wechselt — ein Test müsste sonst mitten in der Interaktion die Abfrage
// wechseln): `png-export-1x`, `png-export-2x`, `png-export-4x` (die drei Faktor-Knöpfe im Menü
// „Exportieren"), `png-export-error` (Fehlerhinweis, zusätzlich `role="status"`). Der
// Hintergrund-Umschalter ist dagegen über Rolle/Text erreichbar (Gruppe „Hintergrund für den
// Bildexport", Knöpfe „weiß"/„transparent") — sein Text ändert sich nie.
//
// Entscheidungen dieses Test-Agenten (dem Orchestrator zu melden, siehe Abschlussbericht):
//
// 1. Menüform: „Als Bild" ist — wie F-20s „Als SVG" — kein Dialog, sondern ein weiterer Abschnitt
//    im bereits bestehenden Menü „Exportieren" (dasselbe Panel wie „Als Text"/„Als SVG"): drei
//    eigenständige Faktor-Knöpfe „1×"/„2×"/„4×", die je für sich sofort einen Download auslösen
//    (F-21, Abschnitt „Tests": „E2E: Export bei 1× und 4× auslösen" — „auslösen", nicht
//    „auswählen und bestätigen"), eine Umschaltergruppe „Hintergrund: weiß/transparent" und der
//    bereits bestehende Umschalter „Tafel für den Bildexport" aus F-20, unverändert mitverwendet
//    (F-21, Abschnitt „Umfang": „... und den Tafelumschalter aus F-20" — kein zweiter Umschalter
//    für dieselbe Sache, features/README.md Leitplanke 3). Das Menü „Exportieren" bleibt beim
//    Klick auf einen Faktor-Knopf ausdrücklich OFFEN (anders als „Als SVG"), weil sonst der in
//    F-21 geforderte Zwischenzustand „Knopf deaktiviert, zeigt Wird erzeugt …" nie sichtbar wäre.
// 2. Spannung zwischen Ablauf und Akzeptanzkriterium bei „transparent": F-21, Abschnitt „Ablauf"
//    Schritt 4 beschreibt nur, dass die VORAB-Füllung des Canvas bei transparent entfällt; das
//    von buildExportSvg() (F-20) gelieferte SVG selbst trägt aber immer ein deckendes
//    Hintergrundrechteck in der Tafelfarbe (F-20, Ablauf Schritt 7). Wortgleich genommen würde
//    „transparent" das Bild also NICHT tatsächlich durchsichtig machen. Das Akzeptanzkriterium
//    ist hier eindeutig und geht vor (CLAUDE.md, QA-Reihenfolge: Featurebeschreibung vor
//    Ablaufdetail derselben Datei) — „lässt den Hintergrund durchsichtig, wenn transparent
//    gewählt ist" unten prüft deshalb einen tatsächlich durchsichtigen Randpixel (Alpha 0), egal
//    wie der Feature-Agent das mit Schritt 7 aus F-20 in Einklang bringt (z. B. ein eigener
//    SVG-Aufbau ohne Hintergrundrechteck für diesen Fall). Ein Widerspruch, den ein QA-Agent
//    beim Feature-Agenten prüfen sollte, falls die Umsetzung hier scheitert.
// 3. Bild-Abmessungen/-Pixel werden über eine echte, im Browser laufende Auswertung gelesen
//    (`createImageBitmap`/`OffscreenCanvas` per `page.evaluate`) statt über eine Node-Bildbibliothek
//    (keine im Projekt vorhanden) — dasselbe Prinzip wie F-20s isolierte zweite Seite: ein echter
//    Browser statt einer Testkopie der Bildinterpretation.
// 4. Wortlaut des Fehlerhinweises („Der PNG-Export ist fehlgeschlagen. Bitte erneut versuchen.")
//    ist eine Festlegung dieses Test-Agenten (F-21-AK nennt nur „ein Hinweis", keinen Wortlaut) —
//    analog zu NoticeBar.svelte (F-23, Kopfkommentar: „Wortlaut ... ist eine Festlegung dieses
//    Test-Agenten"). Geprüft wird hier nur Sichtbarkeit über `data-testid`/`role="status"`, nicht
//    der genaue Text.
//
// Zoom/Pan-Hilfsfunktion `zoomInAt` ist wörtlich aus e2e/F-20-export-svg.spec.ts übernommen
// (dort wiederum aus e2e/F-12-zoom-pan.spec.ts, dieselbe Konvention: Scrollen nach oben
// vergrößert). Generator für 100 Features ist wörtlich aus e2e/F-11-selektion.spec.ts
// übernommen (Muster für impact/effort-Werte, die im gültigen Wertebereich liegen).

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

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

/** Bewegt die Maus an `point`, vergrößert dort per Mausrad (F-20/F-12-Konvention: deltaY < 0
 * vergrößert). */
async function zoomInAt(page: Page, point: { x: number; y: number }, times = 1): Promise<void> {
	await page.mouse.move(point.x, point.y);
	for (let i = 0; i < times; i++) {
		await page.mouse.wheel(0, -240);
	}
}

/** Öffnet das Menü „Exportieren" (F-19, Entscheidung 1; hier um „Als Bild" erweitert, siehe
 * Entscheidung 1 am Dateikopf). */
async function openExportMenu(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Exportieren' }).click();
}

/** Wählt im Menü „Exportieren" die Tafel für den Bildexport — derselbe Umschalter aus F-20,
 * hier auch für PNG mitverwendet (F-21, Abschnitt „Umfang"). */
async function chooseImageExportTheme(page: Page, value: 'Tag' | 'Nacht'): Promise<void> {
	await page
		.getByRole('group', { name: 'Tafel für den Bildexport' })
		.getByRole('button', { name: value })
		.click();
}

/** Wählt den Hintergrund des PNG-Exports (F-21, Abschnitt „Umfang": „Schalter Hintergrund:
 * weiß / transparent"). */
async function choosePngBackground(page: Page, value: 'weiß' | 'transparent'): Promise<void> {
	await page
		.getByRole('group', { name: 'Hintergrund für den Bildexport' })
		.getByRole('button', { name: value })
		.click();
}

/** Klickt einen der drei Faktor-Knöpfe, wartet auf den Download und liefert Dateiname und
 * Rohinhalt (F-21, Abschnitt „Ablauf" Schritt 5, FR-64). */
async function exportPng(
	page: Page,
	scale: 1 | 2 | 4
): Promise<{ filename: string; buffer: Buffer }> {
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByTestId(`png-export-${scale}x`).click()
	]);
	const filename = download.suggestedFilename();
	const path = await download.path();
	expect(path, 'Testaufbau: Download sollte eine lokale Datei erzeugen').not.toBeNull();
	const buffer = readFileSync(path!);
	return { filename, buffer };
}

/** Pixelbreite/-höhe eines PNG, gelesen über einen echten Browser-Decoder (Entscheidung 3 am
 * Dateikopf). */
async function pngDimensions(page: Page, buffer: Buffer): Promise<{ width: number; height: number }> {
	return page.evaluate(async (base64) => {
		const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
		const blob = new Blob([bytes], { type: 'image/png' });
		const bitmap = await createImageBitmap(blob);
		const result = { width: bitmap.width, height: bitmap.height };
		bitmap.close();
		return result;
	}, buffer.toString('base64'));
}

/** RGBA-Wert eines einzelnen Pixels eines PNG, gelesen über einen echten Browser-Decoder
 * (Entscheidung 3 am Dateikopf). */
async function pngPixelAt(
	page: Page,
	buffer: Buffer,
	x: number,
	y: number
): Promise<[number, number, number, number]> {
	return page.evaluate(
		async ({ base64, x, y }) => {
			const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
			const blob = new Blob([bytes], { type: 'image/png' });
			const bitmap = await createImageBitmap(blob);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
			ctx.drawImage(bitmap, 0, 0);
			const data = ctx.getImageData(x, y, 1, 1).data;
			bitmap.close();
			return [data[0], data[1], data[2], data[3]] as [number, number, number, number];
		},
		{ base64: buffer.toString('base64'), x, y }
	);
}

test.describe('F-21 · PNG-Export', () => {
	// AK-11: „Ein PNG bei 4× hat exakt die vierfache Pixelbreite gegenüber 1× (AK-11)." F-21,
	// Abschnitt „Tests": „E2E: Export bei 1× und 4× auslösen, Abmessungen der erzeugten Dateien
	// vergleichen (AK-11)."
	test('hat bei Faktor 4× exakt die vierfache Pixelbreite und -höhe gegenüber 1× (AK-11)', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const at1x = await exportPng(page, 1);
		const at4x = await exportPng(page, 4);

		const dims1 = await pngDimensions(page, at1x.buffer);
		const dims4 = await pngDimensions(page, at4x.buffer);
		expect(dims4.width).toBe(dims1.width * 4);
		expect(dims4.height).toBe(dims1.height * 4);
	});

	// AK-12: „Bei auf einen Ausschnitt gezoomter Map enthält der Export dennoch alle Features."
	// F-21-AK: „Bei gezoomter Karte enthält das Bild alle Features (AK-12)." Geprüft über
	// Byte-Identität mit einer Vollansicht derselben Karte bei gleichem Faktor — dasselbe Prinzip
	// wie F-20s „Ausschnitt ohne Wirkung auf das Ergebnis" (dort auf der SVG-Zeichenkette,
	// deterministisches Rendering vorausgesetzt).
	test('liefert bei gezoomter Karte dieselbe PNG-Datei wie bei Vollansicht (AK-12)', async ({
		page
	}) => {
		const features = [
			{ id: 'a', label: 'A', impact: 21, effort: 1 },
			{ id: 'b', label: 'B', impact: 1, effort: 21 },
			{ id: 'c', label: 'C', impact: 13, effort: 8 },
			{ id: 'd', label: 'D', impact: 3, effort: 3 }
		];
		await seedMap(page, features);
		await page.goto('/');

		const box = await page.getByTestId('feature-node-a').boundingBox();
		expect(box).not.toBeNull();
		await zoomInAt(page, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }, 30);
		await expect(page.getByTestId('feature-node-d')).not.toBeInViewport();

		await openExportMenu(page);
		const zoomed = await exportPng(page, 1);

		await page.reload();
		await expect(page.getByTestId('feature-node-a')).toBeVisible();
		await openExportMenu(page);
		const full = await exportPng(page, 1);

		expect(zoomed.buffer.equals(full.buffer)).toBe(true);
	});

	// F-21-AK: „Standardmäßig ist der Hintergrund weiß." FR-69.
	test('füllt den Hintergrund standardmäßig mit reinem Weiß', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { buffer } = await exportPng(page, 1);
		const pixel = await pngPixelAt(page, buffer, 0, 0);
		expect(pixel).toEqual([255, 255, 255, 255]);
	});

	// F-21-AK: „mit gesetzter Option ist er durchsichtig." Siehe Entscheidung 2 am Dateikopf.
	test('lässt den Hintergrund durchsichtig, wenn „transparent" gewählt ist', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		await choosePngBackground(page, 'transparent');
		const { buffer } = await exportPng(page, 1);
		const [, , , alpha] = await pngPixelAt(page, buffer, 0, 0);
		expect(alpha).toBe(0);
	});

	// F-21-AK: „Kein Text wird abgeschnitten; der Rand um das umschließende Rechteck ist
	// sichtbar." Geprüft über alle vier Bildecken: sie müssen reine Hintergrundfarbe zeigen, statt
	// von einem Element berührt oder abgeschnitten zu werden (dieselbe 24-Einheiten-Randlogik wie
	// buildExportSvg(), F-20, Ablauf Schritt 3, auf der PNG-Erzeugung aufsetzt).
	test('lässt an allen vier Bildecken sichtbaren Rand, nichts berührt den Bildrand', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'a', label: 'A', impact: 5, effort: 5 },
			{ id: 'b', label: 'B', impact: 21, effort: 21 }
		]);
		await page.goto('/');

		await openExportMenu(page);
		const { buffer } = await exportPng(page, 1);
		const dims = await pngDimensions(page, buffer);

		const corners: Array<[number, number]> = [
			[0, 0],
			[dims.width - 1, 0],
			[0, dims.height - 1],
			[dims.width - 1, dims.height - 1]
		];
		for (const [x, y] of corners) {
			const pixel = await pngPixelAt(page, buffer, x, y);
			expect(pixel, `Ecke (${x}, ${y}) sollte reine Hintergrundfarbe (Weiß) sein`).toEqual([
				255, 255, 255, 255
			]);
		}
	});

	// NFR-06: „PNG-Export bei 4x < 3 s." F-21-AK: „Der 4×-Export einer Karte mit 100 Features
	// dauert unter 3 Sekunden." Generator wörtlich aus e2e/F-11-selektion.spec.ts (Werte im
	// gültigen impact/effort-Bereich).
	test('exportiert 100 Features bei Faktor 4× in unter 3 Sekunden (NFR-06)', async ({ page }) => {
		const features: SeedFeature[] = [];
		for (let i = 0; i < 100; i++) {
			features.push({ id: `f${i}`, impact: 1 + (i % 20), effort: 1 + ((i * 3) % 20) });
		}
		await seedMap(page, features);
		await page.goto('/');
		await expect(page.getByTestId('feature-node-f0')).toBeVisible();

		await openExportMenu(page);
		const start = Date.now();
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByTestId('png-export-4x').click()
		]);
		await download.path();
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(3000);
	});

	// F-21-AK: „Scheitert die Erzeugung, erscheint ein Hinweis, und die Anwendung bleibt
	// bedienbar." Schritt 1 verlangt zunächst einen ECHTEN, erfolgreichen Export — sonst wäre
	// dieser Test schon am nicht implementierten Rumpf „zufällig" grün, ohne dass echtes
	// Fehlerhandling geprüft wäre. Erst danach wird `HTMLImageElement.prototype.decode()`
	// gezielt zum Scheitern gebracht (F-21, Abschnitt „Ablauf" Schritt 2: „... und dessen
	// decode() abwarten" — der einzige laut Ablauf zwingend asynchrone, potenziell scheiternde
	// Schritt).
	test('zeigt bei fehlgeschlagener Erzeugung einen Hinweis, bleibt aber bedienbar', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		await exportPng(page, 1); // muss zunächst einen echten Download auslösen.

		await page.evaluate(() => {
			HTMLImageElement.prototype.decode = () =>
				Promise.reject(new Error('Testaufbau: erzwungener Fehler beim Laden des Bildes'));
		});
		await page.getByTestId('png-export-1x').click();

		await expect(page.getByTestId('png-export-error')).toBeVisible();
		await expect(page.getByRole('status')).toBeVisible();
		await expect(page.getByTestId('png-export-1x')).toBeEnabled();
		await expect(page.getByTestId('png-export-1x')).toHaveText('1×');

		// Anwendung bleibt bedienbar: eine unabhängige Aktion funktioniert unverändert.
		await page.getByRole('button', { name: '+ Feature' }).click();
		await expect(page.getByRole('dialog', { name: 'Feature anlegen' })).toBeVisible();
	});

	// F-21-AK: „Während der Erzeugung ist der Knopf deaktiviert und zeigt Wird erzeugt …."
	// Künstliche Verzögerung von decode(), damit der Zwischenzustand beobachtbar wird — ohne sie
	// wäre die Erzeugung (jedenfalls bei einem einzelnen Feature) zu schnell, um zuverlässig
	// zwischen den beiden Zuständen zu unterscheiden.
	test('deaktiviert den geklickten Knopf und zeigt „Wird erzeugt …" während der Erzeugung', async ({
		page
	}) => {
		await page.addInitScript(() => {
			const originalDecode = HTMLImageElement.prototype.decode;
			HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
				return new Promise<void>((resolve, reject) => {
					setTimeout(() => {
						originalDecode.call(this).then(resolve, reject);
					}, 400);
				});
			};
		});
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('png-export-1x').click();

		await expect(page.getByTestId('png-export-1x')).toBeDisabled();
		await expect(page.getByTestId('png-export-1x')).toHaveText('Wird erzeugt …');

		await downloadPromise;
		await expect(page.getByTestId('png-export-1x')).toBeEnabled();
		await expect(page.getByTestId('png-export-1x')).toHaveText('1×');
	});

	// F-21, Abschnitt „Umfang": „... und den Tafelumschalter aus F-20" — derselbe Umschalter wie
	// beim SVG-Export, hier auch für den Hintergrund des PNG wirksam (Ablauf Schritt 4: „bei
	// gewählter Nachttafel in deren --paper", src/app.css: --paper der Nachttafel = #0d161a).
	test('färbt den Hintergrund mit dem --paper-Token der Nachttafel, wenn diese im Bildexport gewählt ist', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		await chooseImageExportTheme(page, 'Nacht');
		const { buffer } = await exportPng(page, 1);
		const pixel = await pngPixelAt(page, buffer, 0, 0);
		expect(pixel).toEqual([13, 22, 26, 255]); // #0d161a
	});

	// FR-64/Ablauf Schritt 5: Dateiname featuremap-JJJJ-MM-TT@Nx.png mit Faktor im Namen; Inhalt
	// beginnt mit der PNG-Signatur.
	test('lädt beim Klick auf einen Faktor-Knopf eine PNG-Datei mit Faktor im Namen herunter', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { filename, buffer } = await exportPng(page, 2);
		expect(filename).toMatch(/^featuremap-\d{4}-\d{2}-\d{2}@2x\.png$/);
		// PNG-Signatur (erste 8 Bytes): 89 50 4E 47 0D 0A 1A 0A.
		expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
	});

	for (const breite of BREAKPOINTS) {
		// CLAUDE.md, Abschnitt „QA-Abgleich": Breakpoints 375/834/1440 px, sobald das Feature
		// Oberfläche hat.
		test(`bleibt bei ${breite}px ohne horizontalen Überlauf bedienbar und exportiert ein PNG`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 3 }]);
			await page.goto('/');

			await openExportMenu(page);
			const { buffer } = await exportPng(page, 1);
			expect(buffer.length).toBeGreaterThan(0);

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
