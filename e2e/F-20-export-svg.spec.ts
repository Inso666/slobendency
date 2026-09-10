// F-20 · SVG-Export — E2E-Tests.
// Quellen: features/F-20-export-svg.md (Abschnitte „Umfang", „Ablauf", „Fachregeln",
// „Akzeptanzkriterien", „Tests": „E2E: Zoomen, exportieren, im Ergebnis die Zahl der
// Feature-Signaturen zählen"), PRD.md (FR-63, FR-65 bis FR-68, NFR-21, NFR-43, AK-12),
// design/03-seekarte.html (Knopf „Exportieren" im Kopfband, `<svg class="map"
// viewBox="0 0 1000 700">`), design/README.md (Bausteine Rahmen/Kartusche/Panel für noch nicht
// entworfene Dialoge — hier ohne eigenen Dialog: FR-63 verlangt einen direkten Download),
// features/README.md (Sprachtabelle), CLAUDE.md (QA-Abgleich: Breakpoints 375/834/1440,
// Tag-/Nachttafel), features/STATUS.md (Abschnitt „Nachzuholen": die unsichtbaren
// Trefferflächen der Kanten aus F-11, Klasse `.edge-hitbox`, dürfen nicht im Export landen),
// sowie der bereits gemergte Code aus F-08 bis F-11 (data-testid-Muster
// feature-node-<id>/map-frame/tick-x-<Wert>/edge-<from>-<to>-<type>, Klassen .dim/.sel/.halo,
// Reviernamen QUICK WINS/GROSSE VORHABEN/NEBENBEI/VERMEIDEN, Achsentitel EFFORT/IMPACT), F-19
// (e2e/F-19-export-dsl.spec.ts, Muster für Menü „Exportieren" und Download-Prüfung).
//
// Neu vergebene data-testid: keine. „Als SVG" und der Umschalter „Tafel für den Bildexport"
// sind über Rolle/Text ansprechbar (siehe Entscheidung 1 unten); innerhalb des heruntergeladenen
// SVG-Dokuments werden ausschließlich die bereits von F-08 bis F-11 vergebenen data-testid
// wiederverwendet (das SVG-Dokument selbst ist ein Klon des laufenden Kartenbaums, siehe
// features/F-20-export-svg.md, Abschnitt „Ablauf" Schritt 1).
//
// Entscheidungen dieses Test-Agenten (dem Orchestrator zu melden, siehe Abschlussbericht):
//
// 1. Menüform „Exportieren → Als SVG" plus Umschalter „Tafel: Tag / Nacht". F-20 nennt selbst
//    keinen Auslöser außer „Im Menü Exportieren steht dafür [für die Standardtafel Tag] ein
//    Umschalter Tafel: Tag / Nacht" — das setzt das aus F-19 bereits bestehende Menü
//    „Exportieren" voraus (dort bereits als Entscheidung 1 begründet: ein Knopf, der ein
//    `.cartouche`-Panel mit weiteren Einträgen öffnet). Diese Tests verlangen dort einen
//    zusätzlichen Eintrag „Als SVG" sowie eine Gruppe mit dem zugänglichen Namen „Tafel für den
//    Bildexport" und den Knöpfen „Tag"/„Nacht" (`aria-pressed`) — ein eigener Name, klar
//    unterschieden vom bereits bestehenden `role="group"` „Farbtafel" im Kopfband (F-01), damit
//    beide unabhängig ansprechbar bleiben und der Export-Umschalter erkennbar unabhängig von der
//    Bildschirmtafel bleibt (F-20: „auch wenn die Oberfläche gerade auf Nacht steht").
// 2. Kein Vorschau-Dialog für „Als SVG". Anders als F-19 („Als Text" öffnet eine Kartusche mit
//    Vorschau und zwei Knöpfen) beschreibt F-20 weder einen Dialog noch eine Vorschau — FR-63
//    verlangt wörtlich nur „Download der Karte als SVG". „Als SVG" löst deshalb hier den Download
//    direkt beim Klick aus, wie „Als .fmap-Datei herunterladen" es innerhalb des F-19-Dialogs tut.
// 3. „Zweiter Browser" (F-20-AK: „Die Datei öffnet sich in einem zweiten Browser ohne Nachladen
//    externer Ressourcen und ohne Stilverlust") wird über eine neue, von der App-Seite isolierte
//    Playwright-Page (page.context().newPage(), file://-URL auf die heruntergeladene Datei)
//    nachgebildet — sie teilt sich keine Stylesheets oder Skripte mit der laufenden Anwendung,
//    ist also so unabhängig, wie es innerhalb eines automatisierten Tests praktikabel ist.
//
// Zoom/Pan-Hilfsfunktion `wheelAt` ist wörtlich aus e2e/F-12-zoom-pan.spec.ts übernommen
// (dieselbe, dort begründete Konvention: Scrollen nach oben vergrößert).

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

/** Bewegt die Maus an `point`, vergrößert dort per Mausrad — dieselbe Konvention wie
 * e2e/F-12-zoom-pan.spec.ts (deltaY < 0 vergrößert). */
async function zoomInAt(page: Page, point: { x: number; y: number }, times = 1): Promise<void> {
	await page.mouse.move(point.x, point.y);
	for (let i = 0; i < times; i++) {
		await page.mouse.wheel(0, -240);
	}
}

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel), Muster aus F-13/F-19. */
function tokenHex(theme: 'light' | 'dark', name: string): string {
	const cssPath = new URL('../src/app.css', import.meta.url);
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

/** Öffnet das Menü „Exportieren" (F-19, Entscheidung 1; hier um „Als SVG" und den Umschalter
 * „Tafel für den Bildexport" erweitert, siehe Entscheidung 1 am Dateikopf). */
async function openExportMenu(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Exportieren' }).click();
}

/** Wählt im Menü „Exportieren" die Tafel für den Bildexport, ohne den Umschalter im Kopfband
 * (F-01, „Farbtafel") zu berühren — siehe Entscheidung 1 am Dateikopf. */
async function chooseSvgExportTheme(page: Page, value: 'Tag' | 'Nacht'): Promise<void> {
	await page
		.getByRole('group', { name: 'Tafel für den Bildexport' })
		.getByRole('button', { name: value })
		.click();
}

/** Klickt „Als SVG", wartet auf den Download und liefert Dateiname, Inhalt und geparstes
 * SVG-Dokument (F-20, Abschnitt „Ablauf" Schritt 8, FR-63). */
async function exportSvg(page: Page): Promise<{ filename: string; content: string; parsed: Document }> {
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Als SVG' }).click()
	]);
	const filename = download.suggestedFilename();
	const path = await download.path();
	expect(path, 'Testaufbau: Download sollte eine lokale Datei erzeugen').not.toBeNull();
	const content = readFileSync(path!, 'utf-8');
	const parsed = new DOMParser().parseFromString(content, 'image/svg+xml');
	return { filename, content, parsed };
}

/** Anzahl der Feature-Signaturen im exportierten SVG (F-20, Abschnitt „Tests": „im Ergebnis die
 * Zahl der Feature-Signaturen zählen") — dieselben data-testid wie im laufenden Programm
 * (FeatureNodes.svelte, F-09). */
function featureNodeCount(parsed: Document): number {
	return parsed.querySelectorAll('[data-testid^="feature-node-"]').length;
}

test.describe('F-20 · SVG-Export', () => {
	// AK-12 (PRD 9): „Bei auf einen Ausschnitt gezoomter Map enthält der Export dennoch alle
	// Features." F-20-AK: „Bei auf einen Ausschnitt gezoomter Karte enthält die Datei dennoch alle
	// Features." Zugleich der im „Tests"-Abschnitt verlangte Kerndurchlauf: „Zoomen, exportieren,
	// im Ergebnis die Zahl der Feature-Signaturen zählen."
	test('enthält bei gezoomter Karte weiterhin alle Feature-Signaturen (AK-12)', async ({ page }) => {
		const features = [
			{ id: 'a', label: 'A', impact: 21, effort: 1 },
			{ id: 'b', label: 'B', impact: 1, effort: 21 },
			{ id: 'c', label: 'C', impact: 13, effort: 8 },
			{ id: 'd', label: 'D', impact: 3, effort: 3 }
		];
		await seedMap(page, features);
		await page.goto('/');

		// Auf eine Ecke zoomen, in der nicht alle vier Features sichtbar bleiben.
		const box = await page.getByTestId('feature-node-a').boundingBox();
		expect(box).not.toBeNull();
		await zoomInAt(page, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }, 30);
		await expect(page.getByTestId('feature-node-d')).not.toBeInViewport();

		await openExportMenu(page);
		const { parsed } = await exportSvg(page);
		expect(featureNodeCount(parsed)).toBe(features.length);
		for (const feature of features) {
			expect(parsed.querySelector(`[data-testid="feature-node-${feature.id}"]`)).not.toBeNull();
		}
	});

	// F-20-AK: „Bei aktiver Selektion enthält die Datei keine abgedunkelten Elemente und keinen
	// Halo." FR-67.
	test('enthält bei aktiver Selektion keine abgedunkelten Elemente und keinen Halo', async ({ page }) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 5 },
			{ id: 'b', label: 'B', impact: 8, effort: 8 }
		];
		await seedMap(page, features);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();

		await openExportMenu(page);
		const { parsed } = await exportSvg(page);
		expect(parsed.querySelectorAll('.dim')).toHaveLength(0);
		expect(parsed.querySelectorAll('.sel')).toHaveLength(0);
		expect(parsed.querySelectorAll('.halo')).toHaveLength(0);
		// Beide Feature-Signaturen bleiben erhalten — nur die Selektionszustände fallen weg.
		expect(featureNodeCount(parsed)).toBe(features.length);
	});

	// F-20, Abschnitt „Ablauf" Schritt 4, FR-67: Kantenbeschriftungen einer beschrifteten
	// Beziehung werden im Export sichtbar, auch wenn im laufenden Programm gerade nichts selektiert
	// ist und die Beschriftung deshalb auf dem Bildschirm nicht zu sehen ist (FR-45).
	test('zeigt die Beschriftung einer beschrifteten Beziehung im Export, auch ohne aktuelle Selektion', async ({
		page
	}) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 3 },
			{ id: 'b', label: 'B', impact: 8, effort: 5 }
		];
		const relations: SeedRelation[] = [{ from: 'a', to: 'b', type: 'relates', label: 'nutzt' }];
		await seedMap(page, features, relations);
		await page.goto('/');

		// Nichts selektiert, nicht gehovert: die Beschriftung ist im laufenden Programm verborgen
		// (FR-45).
		await expect(page.getByTestId('edge-label-a-b-relates')).toBeHidden();

		await openExportMenu(page);
		const { parsed } = await exportSvg(page);
		const label = parsed.querySelector('[data-testid="edge-label-a-b-relates"]');
		expect(label, 'Kantenbeschriftung sollte im Export vorhanden sein').not.toBeNull();
		expect(label!.textContent?.trim()).toBe('nutzt');
	});

	// F-20-AK: „Die Datei enthält Rahmen, Teilstriche, beide Achsentitel und alle vier
	// Reviernamen." FR-66.
	test('enthält Rahmen, Teilstriche, beide Achsentitel und alle vier Reviernamen', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { parsed, content } = await exportSvg(page);
		expect(parsed.querySelector('[data-testid="map-frame"]')).not.toBeNull();
		expect(parsed.querySelectorAll('[data-testid^="tick-x-"]').length).toBeGreaterThan(0);
		expect(parsed.querySelectorAll('[data-testid^="tick-y-"]').length).toBeGreaterThan(0);
		expect(content).toMatch(/EFFORT/);
		expect(content).toMatch(/IMPACT/);
		for (const region of ['QUICK WINS', 'GROSSE VORHABEN', 'NEBENBEI', 'VERMEIDEN']) {
			expect(content).toContain(region);
		}
	});

	// F-20-AK: „Die Datei öffnet sich in einem zweiten Browser ohne Nachladen externer Ressourcen
	// und ohne Stilverlust." Siehe Entscheidung 3 am Dateikopf.
	test('öffnet sich in einer unabhängigen Seite ohne externe Ressourcen und mit erhaltenem Stil', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { content } = await exportSvg(page);
		expect(content).not.toMatch(/<link/i);
		expect(content).not.toMatch(/@import/i);

		const isolatedPage = await page.context().newPage();
		try {
			const dataUrl = `data:image/svg+xml;base64,${Buffer.from(content, 'utf-8').toString('base64')}`;
			await isolatedPage.goto(dataUrl);
			const svgRoot = isolatedPage.locator('svg').first();
			await expect(svgRoot).toBeVisible();

			// Stilverlust ausgeschlossen: das Hintergrundrechteck zeigt den aufgelösten
			// --paper-Wert der Tagtafel (F-20, Abschnitt „Ablauf" Schritt 7), obwohl kein
			// Stylesheet der Anwendung geladen wurde.
			const backgroundFill = await svgRoot.evaluate((svg) => {
				const rect = svg.querySelector('rect');
				return rect ? getComputedStyle(rect).fill : null;
			});
			expect(backgroundFill?.toLowerCase()).toContain('250, 250, 246'); // #fafaf6
		} finally {
			await isolatedPage.close();
		}
	});

	// F-20-AK: „Der Export mit gewählter Nachttafel erzeugt eine dunkle Datei mit denselben
	// Inhalten."
	test('erzeugt mit gewählter Nachttafel eine dunkle Datei mit denselben Inhalten', async ({ page }) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 5 },
			{ id: 'b', label: 'B', impact: 8, effort: 8 }
		];
		await seedMap(page, features);
		await page.goto('/');

		await openExportMenu(page);
		await chooseSvgExportTheme(page, 'Nacht');
		const { parsed, content } = await exportSvg(page);

		expect(featureNodeCount(parsed)).toBe(features.length);
		const backgroundRect = Array.from(parsed.documentElement.children).find(
			(el) => el.tagName.toLowerCase() === 'rect'
		);
		expect(backgroundRect, 'Testaufbau: Export sollte ein Hintergrundrechteck haben').not.toBeUndefined();
		const fill = (backgroundRect!.getAttribute('fill') ?? backgroundRect!.getAttribute('style') ?? '').toLowerCase();
		expect(fill).toContain(tokenHex('dark', 'paper').toLowerCase());
		expect(content.toLowerCase()).not.toContain(tokenHex('light', 'paper').toLowerCase());
	});

	// F-20, Abschnitt „Umfang": „Standardtafel für den Export ist Tag, auch wenn die Oberfläche
	// gerade auf Nacht steht."
	test('bleibt bei der Tagtafel, auch wenn die Oberfläche gerade auf Nacht steht', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		// Der Umschalter „Tafel für den Bildexport" wird NICHT berührt — Standard bleibt Tag.
		await openExportMenu(page);
		const { parsed } = await exportSvg(page);
		const backgroundRect = Array.from(parsed.documentElement.children).find(
			(el) => el.tagName.toLowerCase() === 'rect'
		);
		const fill = (backgroundRect!.getAttribute('fill') ?? backgroundRect!.getAttribute('style') ?? '').toLowerCase();
		expect(fill).toContain(tokenHex('light', 'paper').toLowerCase());
	});

	// F-20-AK: „Kein <style>-Verweis auf eine externe Datei bleibt übrig."
	test('enthält keinen Verweis auf eine externe Stildatei', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { parsed, content } = await exportSvg(page);
		expect(content).not.toMatch(/<link[^>]+rel=["']?stylesheet/i);
		const style = parsed.querySelector('style');
		expect(style, 'Export sollte eingebettete Stile enthalten (FR-68, NFR-43)').not.toBeNull();
	});

	// features/STATUS.md, Zeile F-20 („Nachzuholen"): „prüfen, dass die unsichtbaren
	// Trefferflächen der Kanten aus F-11 (breite, unsichtbare Hit-Areas für Klick/Touch) NICHT im
	// exportierten SVG landen."
	test('enthält keine unsichtbaren Trefferflächen der Kanten (.edge-hitbox) aus F-11', async ({ page }) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 3 },
			{ id: 'b', label: 'B', impact: 8, effort: 5 }
		];
		const relations: SeedRelation[] = [{ from: 'a', to: 'b', type: 'requires' }];
		await seedMap(page, features, relations);
		await page.goto('/');

		// Die Trefferfläche existiert im laufenden Programm (F-11).
		await expect(page.locator('.edge-hitbox')).toHaveCount(1);

		await openExportMenu(page);
		const { parsed, content } = await exportSvg(page);
		expect(parsed.querySelectorAll('.edge-hitbox')).toHaveLength(0);
		expect(content).not.toMatch(/edge-hitbox/);
		// Die sichtbare Kante selbst bleibt erhalten.
		expect(parsed.querySelector('[data-testid="edge-a-b-requires"]')).not.toBeNull();
	});

	// FR-63: „Download der Karte als SVG." Dateiname wie im Ablauf, Schritt 8, festgelegt.
	test('lädt beim Klick auf "Als SVG" eine Datei mit dem Namen featuremap-JJJJ-MM-TT.svg herunter', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { filename, content } = await exportSvg(page);
		expect(filename).toMatch(/^featuremap-\d{4}-\d{2}-\d{2}\.svg$/);
		expect(content).toMatch(/^<\?xml|^<svg/);
	});

	// NFR-21 (F-20, Abschnitt „Fachregeln"): „Beschriftungen bleiben Text; es wird nichts als
	// Markup eingesetzt." Analog zu AK-13 für den allgemeinen Fall, hier im Export geprüft.
	test('rendert einen Namen mit skriptartigem Inhalt im Export unverändert als Text', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: '<script>alert(1)</script>', impact: 5, effort: 5 }]);
		await page.goto('/');

		await openExportMenu(page);
		const { content, parsed } = await exportSvg(page);
		expect(content).not.toMatch(/<script/i);
		const label = parsed.querySelector('[data-testid="feature-label-a"]');
		expect(label?.textContent).toBe('<script>alert(1)</script>');
	});

	// Die Erreichbarkeit von „Als SVG" und dem Umschalter „Tafel für den Bildexport" über
	// Rolle/Text ist bereits Voraussetzung jedes Tests oben, der exportSvg()/chooseSvgExportTheme()
	// aufruft (F-20, Abschnitt „Umfang"; siehe Entscheidung 1) — ein eigener Test, der nur die
	// Sichtbarkeit prüft, ohne den Export tatsächlich auszulösen, wäre hier ein Test, der bereits
	// an der Platzhalter-Verdrahtung allein grün liefe, nicht erst an der echten Umsetzung
	// (features/README.md, Regeln für den Test-Agenten: Tests müssen aus dem richtigen Grund rot
	// sein). Deshalb bewusst kein solcher Test.

	for (const breite of BREAKPOINTS) {
		// CLAUDE.md, Abschnitt „QA-Abgleich": Breakpoints 375/834/1440 px, sobald das Feature
		// Oberfläche hat. Löst hier bewusst den vollen Export aus (nicht nur „Menü sichtbar"),
		// damit der Test erst mit der echten Umsetzung grün wird.
		test(`bleibt bei ${breite}px ohne horizontalen Überlauf bedienbar und exportiert`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 3 }]);
			await page.goto('/');

			await openExportMenu(page);
			const { parsed } = await exportSvg(page);
			expect(featureNodeCount(parsed)).toBe(1);

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
