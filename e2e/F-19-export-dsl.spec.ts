// F-19 · Export-Dialog — E2E-Tests.
// Quellen: features/F-19-export-dsl.md (Abschnitte „Umfang", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (FR-60, DSL-14, PRD 5.9 „Akzeptiertes Risiko",
// AK-04), design/03-seekarte.html (Knopf "Exportieren" im Kopfband, `.cartouche`-Rahmen,
// Azeret Mono, Farbtoken), design/README.md (noch kein fertiger Entwurf für dieses
// Dialogfenster — Bausteine Rahmen/Kartusche/Panel gelten), features/README.md
// (Sprachtabelle: "Kartusche"), CLAUDE.md (QA-Abgleich: Breakpoints 375/834/1440, Tag-/
// Nachttafel).
//
// Neu vergebene data-testid:
//   - export-copy-button        Knopf "In Zwischenablage kopieren"/"Kopiert". Testid nötig, weil
//                                 sich sein sichtbarer Text nach Erfolg für zwei Sekunden ändert
//                                 (F-19: "Erfolg wird ... am Knopf gemeldet (Kopiert)") und ein
//                                 über den Namen gebundener Locator dadurch instabil wäre.
//   - export-copy-manual-hint    Hinweis auf das manuelle Kopieren bei fehlgeschlagenem
//                                 Zwischenablage-Zugriff (F-19: "ein Hinweis auf das manuelle
//                                 Kopieren gezeigt"). Kein fester Wortlaut in den Quellen, sonst
//                                 über Text ansprechbar.
//
// Alles andere wird über Rolle/Text angesprochen. Verbindlicher Wortlaut, den der
// Feature-Agent rendern muss:
//   - Dialog: role="dialog" mit barrierefreiem Namen "Als Text".
//   - Textfeld: role="textbox" (schreibgeschütztes <textarea readonly>) mit dem von serialize()
//     erzeugten Text.
//   - Knopf "Als .fmap-Datei herunterladen" (F-19, Abschnitt "Umfang", Wortlaut übernommen).
//   - Fußnote, wörtlich: "Kommentare aus einem importierten Dokument werden nicht mit
//     exportiert." (F-19, Abschnitt "Umfang").
//
// Entscheidungen dieses Test-Agenten (dem Orchestrator zu melden, siehe Abschlussbericht):
//
// 1. Öffnungspfad "Exportieren → Als Text". design/03-seekarte.html zeigt im Kopfband nur einen
//    einzelnen Knopf "Exportieren" (Zeile 224), ohne Menü. F-19 selbst verlangt aber ausdrücklich
//    einen zweistufigen Pfad ("aus dem Kopfband über Exportieren → Als Text geöffnet") — nötig,
//    weil "Exportieren" später auch "Als SVG" (F-20) und "Als PNG" (F-21) anbieten muss. Dasselbe
//    Muster besteht bereits für "Ansicht": im Entwurf ein einzelner Knopf, in F-12 umgesetzt als
//    Knopf mit `aria-haspopup`/`aria-expanded`, der ein `.cartouche`-Panel mit weiteren Knöpfen
//    öffnet (src/routes/+page.svelte, `.view-menu`/`.view-menu-panel`). Diese Tests verlangen
//    dasselbe Muster für "Exportieren": ein Knopf "Exportieren", der ein Panel mit dem Eintrag
//    "Als Text" öffnet, statt einen zweiten Mechanismus für dieselbe Art von Bedienung
//    einzuführen (features/README.md, Leitplanke 3 sinngemäß auch für Bedienmuster).
// 2. Barrierefreier Name des Dialogs "Als Text". Keine Quelle legt einen Titel fest
//    (design/README.md: "noch kein fertiger Entwurf für dieses Dialogfenster"). Gewählt wurde
//    derselbe Wortlaut wie der auslösende Menüeintrag, wie bei RelationDialog.svelte (F-16) der
//    Dialogtitel "Beziehung anlegen" den auslösenden Menüeintrag aus dem Kontextmenü wiederholt.
// 3. Schließen über ESC. Nötig, um AK-04 (zweimaliges Öffnen ohne Änderung) zu prüfen — F-19
//    nennt selbst keinen Schließen-Knopf (der Dialog hat keine "Speichern"/"Abbrechen"-Handlung,
//    nur Anzeige). ESC-Schließen ist das in FeatureModal.svelte (F-13) und RelationDialog.svelte
//    (F-16) etablierte Muster für jedes `<dialog class="cartouche">` dieser Anwendung.
// 4. Zwischenablage-Fehlschlag wird über einen im Testaufbau (page.addInitScript) fehlschlagenden
//    navigator.clipboard.writeText simuliert — die einzige beobachtbare Art, FR-60/F-19s
//    Fehlerpfad ohne echten Browser-Berechtigungsentzug zu erzwingen.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION } from '../src/lib/model/types';
import type { Feature, FeatureMap, Relation } from '../src/lib/model/types';
import { serialize } from '../src/lib/dsl/serializer';

const STORAGE_KEY = 'featuremap.map';
const BREAKPOINTS = [375, 834, 1440];

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04),
 * Muster aus e2e/F-13-feature-formular.spec.ts. */
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

/** Baut aus denselben Seed-Werten eine FeatureMap für den echten serialize() (F-06) — die Tests
 * behaupten den erwarteten Text nie selbst, sondern lassen ihn vom echten Serializer erzeugen
 * (features/README.md, Regeln für den Test-Agenten: "Tests prüfen beobachtbares Verhalten"). */
function expectedMap(features: SeedFeature[], relations: SeedRelation[] = []): FeatureMap {
	const mappedFeatures: Feature[] = features.map((f) =>
		f.label === undefined ? { id: f.id, impact: f.impact, effort: f.effort } : { ...f }
	);
	const mappedRelations: Relation[] = relations.map((r) =>
		r.label === undefined
			? { from: r.from, to: r.to, type: r.type }
			: { ...r }
	);
	return { schemaVersion: SCHEMA_VERSION, features: mappedFeatures, relations: mappedRelations };
}

/** Erlaubt Lesen/Schreiben der Zwischenablage im Testkontext, damit AK "Kopierknopf legt den
 * Text in die Zwischenablage" tatsächlich nachgeprüft werden kann. */
async function grantClipboardPermissions(page: Page) {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
}

/** Simuliert einen fehlschlagenden Zwischenablage-Zugriff (F-19-AK: "Scheitert der Zugriff auf
 * die Zwischenablage ..."). Muss vor dem Laden der Seite gesetzt werden, damit die Anwendung von
 * Anfang an auf das überschriebene navigator.clipboard trifft. */
async function mockClipboardFailure(page: Page) {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: () => Promise.reject(new Error('Zugriff verweigert (Testaufbau)'))
			}
		});
	});
}

/** Öffnet den Export-Dialog über den Pfad "Exportieren → Als Text" aus dem Kopfband (F-19,
 * Abschnitt "Umfang"; siehe Entscheidung 1 am Dateianfang zur Menüform). */
async function openExportDialog(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Exportieren' }).click();
	await page.getByRole('button', { name: 'Als Text' }).click();
	return page.getByRole('dialog', { name: 'Als Text' });
}

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel), Muster aus F-13. */
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

function hexToRgb(hex: string): string {
	const clean = hex.replace('#', '');
	const value = parseInt(clean, 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgb(${r}, ${g}, ${b})`;
}

test.describe('F-19 · Export-Dialog', () => {
	// F-19-AK: "Der angezeigte Text entspricht Zeichen für Zeichen dem Ergebnis von serialize."
	// Zugleich Nachweis für Entscheidung 1: der Dialog ist über "Exportieren → Als Text"
	// erreichbar.
	test('zeigt im Textfeld zeichengenau das Ergebnis von serialize()', async ({ page }) => {
		const features = [
			{ id: 'b', label: 'B', impact: 8, effort: 13 },
			{ id: 'a', impact: 5, effort: 3 }
		];
		const relations: SeedRelation[] = [{ from: 'a', to: 'b', type: 'requires', label: 'nutzt' }];
		await seedMap(page, features, relations);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		await expect(dialog.getByRole('textbox')).toHaveValue(serialize(expectedMap(features, relations)));
	});

	// AK-04 (PRD 9): "Zweifacher Export ohne zwischenzeitliche Änderung liefert byte-identischen
	// Text." Hier als zweimaliges Öffnen desselben Dialogs geprüft.
	test('zeigt bei zweimaligem Öffnen ohne zwischenzeitliche Änderung identischen Text (AK-04)', async ({
		page
	}) => {
		const features = [{ id: 'x', label: 'X', impact: 13, effort: 21 }];
		await seedMap(page, features);
		await page.goto('/');

		let dialog = await openExportDialog(page);
		const erstesMal = await dialog.getByRole('textbox').inputValue();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);

		dialog = await openExportDialog(page);
		const zweitesMal = await dialog.getByRole('textbox').inputValue();

		expect(zweitesMal).toBe(erstesMal);
		expect(erstesMal).toBe(serialize(expectedMap(features)));
	});

	// F-19-AK: "Der Kopierknopf legt den Text in die Zwischenablage und meldet den Erfolg."
	test('kopiert den Text in die Zwischenablage und meldet den Erfolg zwei Sekunden lang als "Kopiert"', async ({
		page
	}) => {
		await grantClipboardPermissions(page);
		const features = [{ id: 'a', label: 'A', impact: 1, effort: 1 }];
		await seedMap(page, features);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		const text = await dialog.getByRole('textbox').inputValue();
		const copyButton = dialog.getByTestId('export-copy-button');
		await expect(copyButton).toHaveText('In Zwischenablage kopieren');

		await copyButton.click();

		// Windows normalisiert \n zu \r\n beim Schreiben in die System-Zwischenablage (Plattform-
		// eigenschaft des Testrechners, kein Implementierungsfehler — vom Orchestrator freigegebene
		// Testkorrektur). Nur der gelesene Wert wird normalisiert, nicht der erwartete.
		const clipboardText = (await page.evaluate(() => navigator.clipboard.readText())).replace(
			/\r\n/g,
			'\n'
		);
		expect(clipboardText).toBe(text);
		await expect(copyButton).toHaveText('Kopiert');

		// Nach zwei Sekunden kehrt die Beschriftung zurück (F-19: "wird für zwei Sekunden ...
		// gemeldet").
		await expect(copyButton).toHaveText('In Zwischenablage kopieren', { timeout: 4000 });
	});

	// F-19-AK: "Scheitert der Zugriff auf die Zwischenablage, erscheint ein Hinweis statt eines
	// Fehlers." F-19, Abschnitt "Umfang": "wird der Text markiert".
	test('zeigt bei fehlgeschlagenem Zwischenablage-Zugriff einen Hinweis statt eines Fehlers und markiert den Text', async ({
		page
	}) => {
		await mockClipboardFailure(page);
		const features = [{ id: 'a', label: 'A', impact: 1, effort: 1 }];
		await seedMap(page, features);

		const consoleErrors: string[] = [];
		page.on('pageerror', (error) => consoleErrors.push(error.message));

		await page.goto('/');
		const dialog = await openExportDialog(page);
		const textbox = dialog.getByRole('textbox');
		const copyButton = dialog.getByTestId('export-copy-button');

		await copyButton.click();

		// Kein unbehandelter Fehler statt der Meldung (F-19-AK: "statt eines Fehlers").
		expect(consoleErrors).toEqual([]);
		await expect(dialog.getByTestId('export-copy-manual-hint')).toBeVisible();

		const selection = await textbox.evaluate((el: HTMLTextAreaElement) => ({
			start: el.selectionStart,
			end: el.selectionEnd,
			length: el.value.length
		}));
		expect(selection.start).toBe(0);
		expect(selection.end).toBe(selection.length);

		// Der Dialog bleibt bedienbar; der angezeigte Text ist unverändert vorhanden.
		await expect(textbox).toHaveValue(serialize(expectedMap(features)));
	});

	// F-19-AK: "Der Download erzeugt eine Datei mit der Endung .fmap, deren Inhalt dem
	// angezeigten Text entspricht."
	test('lädt beim Download eine .fmap-Datei mit dem angezeigten Text herunter', async ({ page }) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 8 },
			{ id: 'b', impact: 13, effort: 21 }
		];
		await seedMap(page, features);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		const angezeigterText = await dialog.getByRole('textbox').inputValue();

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			dialog.getByRole('button', { name: 'Als .fmap-Datei herunterladen' }).click()
		]);

		expect(download.suggestedFilename()).toMatch(/^featuremap-\d{4}-\d{2}-\d{2}\.fmap$/);

		const path = await download.path();
		expect(path, 'Testaufbau: Download sollte eine lokale Datei erzeugen').not.toBeNull();
		const heruntergeladenerInhalt = readFileSync(path!, 'utf-8');
		expect(heruntergeladenerInhalt).toBe(angezeigterText);
		expect(heruntergeladenerInhalt).toBe(serialize(expectedMap(features)));
	});

	// F-19-AK: "Bei leerer Karte zeigt der Dialog featuremap v1 und bleibt bedienbar."
	test('zeigt bei leerer Karte "featuremap v1" und bleibt bedienbar', async ({ page }) => {
		await grantClipboardPermissions(page);
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		await expect(dialog.getByRole('textbox')).toHaveValue('featuremap v1\n');

		// "bleibt bedienbar": Kopieren funktioniert weiterhin ohne Fehler.
		await dialog.getByTestId('export-copy-button').click();
		// Windows normalisiert \n zu \r\n beim Schreiben in die System-Zwischenablage (Plattform-
		// eigenschaft des Testrechners, kein Implementierungsfehler — vom Orchestrator freigegebene
		// Testkorrektur). Nur der gelesene Wert wird normalisiert, nicht der erwartete.
		const clipboardText = (await page.evaluate(() => navigator.clipboard.readText())).replace(
			/\r\n/g,
			'\n'
		);
		expect(clipboardText).toBe('featuremap v1\n');

		// "bleibt bedienbar": Download funktioniert weiterhin.
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			dialog.getByRole('button', { name: 'Als .fmap-Datei herunterladen' }).click()
		]);
		expect(download.suggestedFilename()).toMatch(/\.fmap$/);
	});

	// F-19, Abschnitt "Umfang": "Fußnote in --ink-soft: Kommentare aus einem importierten
	// Dokument werden nicht mit exportiert."
	test('zeigt die Fußnote zu nicht exportierten Kommentaren wörtlich in --ink-soft', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		const footnote = dialog.getByText(
			'Kommentare aus einem importierten Dokument werden nicht mit exportiert.'
		);
		await expect(footnote).toBeVisible();
		await expect(footnote).toHaveCSS('color', hexToRgb(tokenHex('light', 'ink-soft')));
	});

	// CLAUDE.md "QA-Abgleich": Nachttafel. Dieselbe Fußnote muss auch mit dem Nacht-Token für
	// --ink-soft gerendert werden.
	test('zeigt die Fußnote in der Nachttafel mit dem Nacht-Token für --ink-soft', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		const dialog = await openExportDialog(page);
		const footnote = dialog.getByText(
			'Kommentare aus einem importierten Dokument werden nicht mit exportiert.'
		);
		await expect(footnote).toHaveCSS('color', hexToRgb(tokenHex('dark', 'ink-soft')));
	});

	// F-19, Abschnitt "Umfang": "Schreibgeschütztes Textfeld in Azeret Mono ... Zeilenumbrüche
	// erhalten."
	test('zeigt das Textfeld schreibgeschützt in Azeret Mono mit erhaltenen Zeilenumbrüchen', async ({
		page
	}) => {
		const features = [
			{ id: 'a', label: 'A', impact: 5, effort: 3 },
			{ id: 'b', label: 'B', impact: 8, effort: 13 }
		];
		await seedMap(page, features);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		const textbox = dialog.getByRole('textbox');

		await expect(textbox).toHaveAttribute('readonly', '');
		await expect(textbox).toHaveCSS('font-family', /Azeret Mono/);

		const value = await textbox.inputValue();
		// Mehr als eine Zeile: Kopfzeile, Leerzeile, mindestens zwei Feature-Zeilen (DSL-10).
		expect(value.split('\n').length).toBeGreaterThan(3);
	});

	// F-13, Abschnitt "Darstellung" etabliert Rahmen/--rule als Kartuschen-Muster; hier geprüft,
	// dass ExportDialog demselben `.cartouche`-Muster folgt (F-19, Abschnitt "Umfang": "Dialog
	// erscheint als Kartusche über der Karte").
	test('stellt den Dialog als Kartusche mit 1px --rule-Rahmen dar', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openExportDialog(page);
		await expect(dialog).toHaveCSS('border-color', hexToRgb(tokenHex('light', 'rule')));
		await expect(dialog).toHaveCSS('border-width', '1px');
	});

	// UI-Grundmuster dieser Anwendung (F-13/F-16): ESC schließt den Dialog. Nötig, damit AK-04
	// (zweimaliges Öffnen) prüfbar ist — siehe Entscheidung 3 am Dateianfang.
	test('schließt bei ESC', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		await openExportDialog(page);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});

	for (const breite of BREAKPOINTS) {
		test(`bleibt bei ${breite}px ohne horizontalen Überlauf bedienbar`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 3 }]);
			await page.goto('/');

			const dialog = await openExportDialog(page);
			await expect(dialog.getByRole('textbox')).toBeVisible();
			await expect(dialog.getByRole('button', { name: 'Als .fmap-Datei herunterladen' })).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
