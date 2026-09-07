// F-16 · Kontextmenü und Verbindungsvorgang — E2E-Tests.
// Quellen: features/F-16-verbindungsvorgang.md (Abschnitte "Ablauf", "Abbruch",
// "Fachregeln", "Akzeptanzkriterien"), PRD.md (FR-10 bis FR-15, INT-03, INT-04, INT-05,
// UI-12, UI-16, FR-46), design/README.md ("Kontextmenü (FR-10) ... noch zu entwerfen; die
// Bausteine dafür — Rahmen, Kartusche, Panel — stehen ... bereits fest": kein fertiges Mockup
// für Menü und Dialog, deshalb hier ausschließlich über Rolle/Text zugänglich statt über eine
// Bildvorlage nachgebaut), features/README.md (Ubiquitous Language: benötigt/hängt
// zusammen/schließt aus), features/STATUS.md (Anmerkung zu F-16: nachzuholender Test für
// "Escape bricht Verbindungsvorgang ab" (FR-13), der in F-11 mangels Oberfläche für einen
// laufenden Verbindungsvorgang nicht fahrbar war).
//
// Neu vergebene data-testid (über Rolle/Text nicht eindeutig greifbar):
//   - connect-start-<id>   gestrichelte Kontur um den Startpunkt eines laufenden
//                          Verbindungsvorgangs (F-16, Ablauf Schritt 2: "Der Startpunkt wird
//                          dauerhaft markiert ... gestrichelte Kontur in --magenta"). Reines
//                          Signaturelement ohne Eigentext, deshalb kein Zugriff über Rolle/Text
//                          möglich (Vorbild: feature-halo-<id> aus F-11).
//   - connect-banner       das Hinweisband über der Karte ("Ziel wählen — ESC bricht ab" mit
//                          Knopf "Abbrechen", F-16, Ablauf Schritt 2) — als Scope für den
//                          Knopf "Abbrechen", der sich mit dem gleichnamigen Knopf im Dialog
//                          und in anderen Formularen dieser Anwendung sonst nicht eindeutig
//                          unterscheiden ließe.
//
// Alles andere über Rolle/Text: Menü mit Rolle "menu", zugänglichem Namen "Feature-Menü"
// (Rechtsklick auf ein Feature) bzw. "Kartenmenü" (Rechtsklick auf freie Fläche), Einträge mit
// Rolle "menuitem" und den Beschriftungen aus F-16, Ablauf Schritt 1 ("Als Start verwenden",
// "Als Ziel verwenden", "Bearbeiten", "Löschen") bzw. dem Absatz zur freien Fläche ("Ganze
// Karte zeigen", "Feature anlegen"); Dialog mit Rolle "dialog", zugänglichem Namen "Beziehung
// anlegen", darin die drei Knöpfe "benötigt"/"hängt zusammen"/"schließt aus" (Ubiquitous
// Language, wie RelationRow.svelte aus F-13), das Feld "Beschriftung" und die Knöpfe "Anlegen"/
// "Abbrechen". Bereits vergebene Kennzeichen aus F-08 bis F-15 werden weiterverwendet:
// feature-node-<id>, feature-halo-<id>, edge-<from>-<to>-<type>, detail-cartouche.
//
// Designentscheidungen dieses Test-Agenten (in den Quellen nicht mit einem Mockup oder Wortlaut
// festgelegt, siehe design/README.md-Zitat oben):
//   1. Zugängliche Namen der beiden Menüvarianten ("Feature-Menü" / "Kartenmenü") und des
//      Dialogs ("Beziehung anlegen") — keine Quelle nennt einen Wortlaut für Menü- oder
//      Dialogtitel selbst (nur für dessen Einträge/Knöpfe, die alle wörtlich aus F-16
//      übernommen sind).
//   2. "Bearbeiten" und "Löschen" im Kontextmenü lösen dieselben bereits an anderer Stelle
//      entschiedenen Abläufe aus (Formular aus F-13, Rückfrage aus F-15/FR-05) — diese Datei
//      testet von beiden deshalb nur die im F-16-Ablauf selbst ausdrücklich genannte
//      Erreichbarkeit über das Menü, nicht ein zweites Mal deren volles Verhalten (das ist
//      bereits in e2e/F-13-feature-formular.spec.ts und e2e/F-15-detail-kartusche.spec.ts
//      geprüft; ein erneuter Vollcheck hier verstieße gegen features/README.md, Leitplanke 3:
//      "eine Regel zweimal umgesetzt ist ein QA-Befund" — sinngemäß auch für Tests).
//
// Widerspruch in den Quellen, dem Orchestrator zur Bestätigung vorgelegt statt geraten: F-16
// selbst führt AK-08 ("Anlegen von A → B → A ... erzeugt eine sichtbare Zyklus-Warnung") sowohl
// unter seinen eigenen Akzeptanzkriterien als auch — mit identischem Wortlaut und eigenem Test
// — unter "Nicht Teil dieses Features" ("Anzeige der Zyklus-Warnung (F-23)"). Diese Datei prüft
// deshalb nur den F-16 zuzurechnenden Teil: Die zyklusbildende Beziehung wird angelegt statt
// abgelehnt (INT-05 blockiert nicht); ob eine Warnung *sichtbar* wird, ist Gegenstand von
// e2e/F-23-statuszeile.spec.ts (dessen eigene Akzeptanzkriterien exakt das bereits verlangen).
//
// F-15, Abschnitt "Verhalten": Der Knopf "Als Start verwenden" der Detail-Kartusche existiert
// bereits (setzt connectSource direkt) — diese Datei testet ihn hier nur insoweit, wie F-16 ihn
// um sichtbare Markierung und Abbruch erweitert; seine bloße Anwesenheit ist bereits durch
// e2e/F-15-detail-kartusche.spec.ts abgedeckt.

import { expect, test, type Locator, type Page } from '@playwright/test';
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

type RelationTypeLabel = 'benötigt' | 'hängt zusammen' | 'schließt aus';

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

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel), wie in F-11/F-15. */
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

/** Grundkarte: drei unabhängige Features ohne Beziehungen, damit jeder Test seine eigenen
 * Beziehungen anlegt, ohne mit anderen Tests zu kollidieren. */
const BASE_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'Feature A', impact: 3, effort: 2 },
	{ id: 'b', label: 'Feature B', impact: 5, effort: 3 },
	{ id: 'c', label: 'Feature C', impact: 2, effort: 5 }
];

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	expect(box, 'Testaufbau: Element sollte eine Bounding Box haben').not.toBeNull();
	return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

/** Rechtsklick an einer bestimmten Bildschirmposition, mit Rückmeldung, ob das auslösende
 * `contextmenu`-Ereignis `preventDefault()` erhielt (F-16, Abschnitt "Ablauf" Schritt 1:
 * "ohne dass das Browsermenü erscheint" — im automatisierten Test nicht über das native,
 * betriebssystemeigene Menü beobachtbar, wohl aber über `defaultPrevented`). */
async function rightClickAt(page: Page, point: { x: number; y: number }): Promise<boolean> {
	const [prevented] = await Promise.all([
		page.evaluate(
			() =>
				new Promise<boolean>((resolve) => {
					window.addEventListener(
						'contextmenu',
						(event) => resolve(event.defaultPrevented),
						{ once: true, capture: true }
					);
				})
		),
		(async () => {
			await page.mouse.move(point.x, point.y);
			await page.mouse.down({ button: 'right' });
			await page.mouse.up({ button: 'right' });
		})()
	]);
	return prevented;
}

/** Öffnet das Kontextmenü auf einem Feature per Rechtsklick und liefert es zurück
 * (F-16, Ablauf Schritt 1). */
async function openFeatureMenu(page: Page, id: string): Promise<Locator> {
	const node = page.getByTestId(`feature-node-${id}`);
	const point = await centerOf(node);
	await rightClickAt(page, point);
	const menu = page.getByRole('menu', { name: 'Feature-Menü' });
	await expect(menu).toBeVisible();
	return menu;
}

/** Öffnet das Kontextmenü auf freier Fläche (F-16, Absatz nach "Fachregeln"). Obere linke Ecke
 * der Plotfläche, wie `clickBlankArea` in e2e/F-11-selektion.spec.ts und
 * e2e/F-15-detail-kartusche.spec.ts (features/STATUS.md, Entscheidung vom 06.09.
 * "F-11-Testkonflikt durch die Kartuschenposition"). */
async function openBlankMenu(page: Page): Promise<Locator> {
	const karte = page.getByRole('img', { name: /Streudiagramm/ });
	const box = await karte.boundingBox();
	expect(box, 'Testaufbau: Kartenfläche sollte eine Bounding Box haben').not.toBeNull();
	const point = { x: box!.x + box!.width * 0.05, y: box!.y + box!.height * 0.05 };
	await rightClickAt(page, point);
	const menu = page.getByRole('menu', { name: 'Kartenmenü' });
	await expect(menu).toBeVisible();
	return menu;
}

/** "Als Start verwenden" auf einem Feature über das Kontextmenü (F-16, Ablauf Schritt 2). */
async function startConnectionViaMenu(page: Page, id: string): Promise<void> {
	const menu = await openFeatureMenu(page, id);
	await menu.getByRole('menuitem', { name: 'Als Start verwenden' }).click();
}

/** "Als Ziel verwenden" auf einem zweiten Feature über das Kontextmenü, öffnet den
 * RelationDialog (F-16, Ablauf Schritt 3). */
async function chooseTargetViaMenu(page: Page, id: string): Promise<Locator> {
	const menu = await openFeatureMenu(page, id);
	await menu.getByRole('menuitem', { name: 'Als Ziel verwenden' }).click();
	const dialog = page.getByRole('dialog', { name: 'Beziehung anlegen' });
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Vollständiger Ablauf über zwei Rechtsklicke bis zur angelegten Beziehung (F-16, Ablauf,
 * Kernakzeptanzkriterium: "Rechtsklick auf ein Feature, 'Als Start verwenden', Rechtsklick auf
 * ein zweites, 'Als Ziel verwenden', Art wählen, fertig"). */
async function connectViaContextMenu(
	page: Page,
	fromId: string,
	toId: string,
	type: RelationTypeLabel,
	label?: string
): Promise<void> {
	await startConnectionViaMenu(page, fromId);
	const dialog = await chooseTargetViaMenu(page, toId);
	await dialog.getByRole('button', { name: type, exact: true }).click();
	if (label !== undefined) {
		await dialog.getByLabel('Beschriftung').fill(label);
	}
	await dialog.getByRole('button', { name: 'Anlegen' }).click();
}

/** Simuliert einen Long-Press (F-16, Ablauf Schritt 1: "auf Mobilgeräten Long-Press, etwa
 * 500 ms"; PRD UI-12) per synthetischem TouchEvent, wie `touchDrag` in
 * e2e/F-12-zoom-pan.spec.ts (Playwrights `touchscreen` kennt keinen gehaltenen Druck). Löst
 * `touchstart` aus, wartet `ms` Millisekunden echte Zeit (die Produktion muss den Druck selbst
 * über einen Timer erkennen, kein synthetisches "long-press"-Ereignis existiert) und danach
 * `touchend`. */
async function longPress(page: Page, testId: string, ms: number): Promise<void> {
	await page.evaluate((testId) => {
		const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
		const rect = el.getBoundingClientRect();
		const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		const touch = new Touch({ identifier: 1, target: el, clientX: point.x, clientY: point.y });
		el.dispatchEvent(
			new TouchEvent('touchstart', {
				bubbles: true,
				cancelable: true,
				touches: [touch],
				targetTouches: [touch],
				changedTouches: [touch]
			})
		);
	}, testId);
	await page.waitForTimeout(ms);
	await page.evaluate((testId) => {
		const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
		const rect = el.getBoundingClientRect();
		const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		const touch = new Touch({ identifier: 1, target: el, clientX: point.x, clientY: point.y });
		el.dispatchEvent(
			new TouchEvent('touchend', {
				bubbles: true,
				cancelable: true,
				touches: [],
				targetTouches: [],
				changedTouches: [touch]
			})
		);
	}, testId);
}

test.describe('F-16 · Kontextmenü und Verbindungsvorgang', () => {
	for (const width of BREAKPOINTS) {
		// F-16-Kernakzeptanzkriterium (Abschnitt "Ziel"): "Rechtsklick auf ein Feature, 'Als
		// Start verwenden', Rechtsklick auf ein zweites, 'Als Ziel verwenden', Art wählen,
		// fertig." Zugleich F-16-AK "Die neue Kante erscheint sofort ohne Neuladen." Über alle
		// drei Referenz-Breakpoints (CLAUDE.md, QA-Abgleich; UI-18).
		test(`legt bei ${width}px eine Beziehung über zwei Rechtsklicke an, die sofort sichtbar ist`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 900 });
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await expect(page.getByTestId('edge-a-b-requires')).toHaveCount(0);

			await connectViaContextMenu(page, 'a', 'b', 'benötigt');

			await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
			await expect(page.getByRole('dialog', { name: 'Beziehung anlegen' })).toHaveCount(0);
		});
	}

	// F-16-AK: "Rechtsklick auf ein Feature öffnet das Kontextmenü an der Zeigerposition, ohne
	// dass das Browsermenü erscheint." FR-10, FR-11, FR-40.
	test('öffnet das Kontextmenü an der Zeigerposition und verhindert das Browsermenü', async ({
		page
	}) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');

		const node = page.getByTestId('feature-node-a');
		const point = await centerOf(node);
		const prevented = await rightClickAt(page, point);
		expect(prevented, 'contextmenu sollte preventDefault() erhalten haben').toBe(true);

		const menu = page.getByRole('menu', { name: 'Feature-Menü' });
		await expect(menu).toBeVisible();
		const menuBox = await menu.boundingBox();
		expect(menuBox, 'Testaufbau: Menü sollte eine Bounding Box haben').not.toBeNull();
		// "An der Zeigerposition" heißt: nahe am Klickpunkt, nicht an einer festen Bildschirm-
		// oder Kartenecke (großzügige Toleranz, weil kein Entwurf eine genaue Ausrichtung nennt,
		// design/README.md).
		expect(Math.abs(menuBox!.x - point.x)).toBeLessThan(160);
		expect(Math.abs(menuBox!.y - point.y)).toBeLessThan(160);

		await expect(menu.getByRole('menuitem', { name: 'Als Start verwenden' })).toBeVisible();
		await expect(menu.getByRole('menuitem', { name: 'Als Ziel verwenden' })).toBeVisible();
		await expect(menu.getByRole('menuitem', { name: 'Bearbeiten' })).toBeVisible();
		await expect(menu.getByRole('menuitem', { name: 'Löschen' })).toBeVisible();
	});

	// F-16, Absatz nach "Fachregeln": "Auf freier Fläche bietet es 'Ganze Karte zeigen' und
	// 'Feature anlegen'."
	test('bietet auf freier Fläche "Ganze Karte zeigen" und "Feature anlegen" an', async ({
		page
	}) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');

		const menu = await openBlankMenu(page);
		await expect(menu.getByRole('menuitem', { name: 'Ganze Karte zeigen' })).toBeVisible();
		await expect(menu.getByRole('menuitem', { name: 'Feature anlegen' })).toBeVisible();

		await menu.getByRole('menuitem', { name: 'Feature anlegen' }).click();
		await expect(page.getByRole('dialog', { name: 'Feature anlegen' })).toBeVisible();
	});

	// PRD UI-16: "Interaktive Trefferflächen (Kreise, Menüeinträge) mindestens 44 × 44 px."
	// F-16-Fachregel UI-16.
	test('bietet Menüeinträge mit mindestens 44 × 44 px Trefferfläche', async ({ page }) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');

		const menu = await openFeatureMenu(page, 'a');
		const items = await menu.getByRole('menuitem').all();
		expect(items.length).toBeGreaterThan(0);
		for (const item of items) {
			const box = await item.boundingBox();
			expect(box, 'Testaufbau: Menüeintrag sollte eine Bounding Box haben').not.toBeNull();
			expect(box!.width).toBeGreaterThanOrEqual(44);
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
	});

	// F-16, Absatz nach "Fachregeln": "Es schließt bei ESC, bei Klick daneben und beim
	// Scrollen; die Einträge sind mit Pfeiltasten erreichbar."
	test.describe('Schließen und Tastaturbedienung des Menüs', () => {
		test('schließt das Menü bei ESC', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			const menu = await openFeatureMenu(page, 'a');
			await page.keyboard.press('Escape');
			await expect(menu).toHaveCount(0);
		});

		test('schließt das Menü bei Klick daneben', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			const menu = await openFeatureMenu(page, 'a');
			const karte = page.getByRole('img', { name: /Streudiagramm/ });
			const box = await karte.boundingBox();
			expect(box).not.toBeNull();
			await karte.click({ position: { x: box!.width * 0.5, y: box!.height * 0.9 } });
			await expect(menu).toHaveCount(0);
		});

		test('schließt das Menü beim Scrollen', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			const menu = await openFeatureMenu(page, 'a');
			const karte = page.getByRole('img', { name: /Streudiagramm/ });
			await karte.dispatchEvent('wheel', { deltaY: -100 });
			await expect(menu).toHaveCount(0);
		});

		test('erreicht die Einträge mit den Pfeiltasten', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			const menu = await openFeatureMenu(page, 'a');
			const items = menu.getByRole('menuitem');
			const first = items.first();
			const second = items.nth(1);

			await first.focus();
			await expect(first).toBeFocused();

			await page.keyboard.press('ArrowDown');
			await expect(second).toBeFocused();

			await page.keyboard.press('ArrowUp');
			await expect(first).toBeFocused();
		});
	});

	// F-16-AK: "Long-Press auf einem Touchgerät öffnet dasselbe Menü." UI-12: "auf
	// Mobilgeräten wird das Kontextmenü per Long-Press ausgelöst."
	test.describe('Long-Press auf Touchgeräten (UI-12)', () => {
		test('öffnet nach etwa 500 ms Druckdauer das Kontextmenü', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await longPress(page, 'feature-node-a', 600);

			await expect(page.getByRole('menu', { name: 'Feature-Menü' })).toBeVisible();
		});

		test('öffnet bei einer kurzen Berührung kein Kontextmenü', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await longPress(page, 'feature-node-a', 120);

			await expect(page.getByRole('menu', { name: 'Feature-Menü' })).toHaveCount(0);
		});
	});

	test.describe('Verbindungsstart: Markierung und Hinweisband', () => {
		// F-16-AK: "Nach 'Als Start verwenden' ist der Startpunkt sichtbar markiert und bleibt
		// es, bis der Vorgang endet." FR-14. Ablauf Schritt 2: "gestrichelte Kontur in
		// --magenta, zusätzlich ein Hinweisband über der Karte mit dem Text 'Ziel wählen — ESC
		// bricht ab' und einem Knopf 'Abbrechen'."
		test('markiert den Startpunkt dauerhaft und zeigt das Hinweisband', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');

			const marker = page.getByTestId('connect-start-a');
			await expect(marker).toBeVisible();
			await expect(marker).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'magenta')));
			await expect(marker).not.toHaveCSS('stroke-dasharray', 'none');

			const banner = page.getByTestId('connect-banner');
			await expect(banner).toBeVisible();
			await expect(banner).toContainText('Ziel wählen — ESC bricht ab');
			await expect(banner.getByRole('button', { name: 'Abbrechen' })).toBeVisible();

			// "Bleibt es, bis der Vorgang endet" — bleibt über eine unbeteiligte Aktion hinweg
			// bestehen (hier: Öffnen und Schließen eines weiteren Menüs).
			const menu = await openFeatureMenu(page, 'c');
			await page.keyboard.press('Escape');
			await expect(menu).toHaveCount(0);
			await expect(marker).toBeVisible();
			await expect(banner).toBeVisible();
		});

		// F-16-AK: "'Als Ziel verwenden' ist auf dem Startfeature nicht auswählbar." INT-03.
		test('deaktiviert "Als Ziel verwenden" auf dem Startfeature', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');

			const menu = await openFeatureMenu(page, 'a');
			await expect(menu.getByRole('menuitem', { name: 'Als Ziel verwenden' })).toBeDisabled();
			// Auf einem anderen Feature bleibt der Eintrag auswählbar.
			await page.keyboard.press('Escape');
			const otherMenu = await openFeatureMenu(page, 'b');
			await expect(
				otherMenu.getByRole('menuitem', { name: 'Als Ziel verwenden' })
			).toBeEnabled();
		});
	});

	test.describe('Ablehnung durch das Aggregat (Ablauf Schritt 4)', () => {
		// F-16-AK: "Ein bereits vorhandenes Tripel wird mit der erwarteten Meldung abgelehnt;
		// der Dialog bleibt offen." INT-04, mit dem in F-16 selbst zitierten Wortlaut
		// "Beziehung existiert bereits".
		test('lehnt ein bereits vorhandenes Tripel ab und lässt den Dialog offen', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');
			const dialog = await chooseTargetViaMenu(page, 'b');
			await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
			await dialog.getByRole('button', { name: 'Anlegen' }).click();

			await expect(dialog).toBeVisible();
			await expect(dialog.getByText('Beziehung existiert bereits')).toBeVisible();
		});

		// F-16, Ablauf Schritt 4: "Verstöße gegen INT-03 und INT-04 erscheinen im Dialog; der
		// Vorgang bleibt offen, bis er gelingt oder abgebrochen wird" — hier über eine erneute
		// gültige Auswahl im selben, noch offenen Dialog nach einer zuvor abgelehnten Eingabe.
		test('gelingt im selben Dialog nach Behebung der Ablehnung', async ({ page }) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');
			const dialog = await chooseTargetViaMenu(page, 'b');
			await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
			await dialog.getByRole('button', { name: 'Anlegen' }).click();
			await expect(dialog.getByText('Beziehung existiert bereits')).toBeVisible();

			// "relates" statt "requires" bildet kein Duplikat (INT-04 prüft das volle Tripel).
			await dialog.getByRole('button', { name: 'hängt zusammen', exact: true }).click();
			await dialog.getByRole('button', { name: 'Anlegen' }).click();

			await expect(dialog).toHaveCount(0);
			await expect(page.getByTestId('edge-a-b-relates')).toBeVisible();
		});
	});

	// F-16-AK: "A → B → A lässt sich anlegen und erzeugt eine sichtbare Zyklus-Warnung
	// (AK-08)." INT-05: "Beziehung wird angelegt, aber als Warnung markiert." Der hier
	// geprüfte, F-16 zuzurechnende Anteil ist ausschließlich das Anlegen trotz Zyklus (siehe
	// Kommentar am Dateianfang zum Widerspruch mit "Nicht Teil dieses Features").
	test('legt eine requires-Beziehung auch dann an, wenn sie einen Zyklus schließt', async ({
		page
	}) => {
		await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
		await page.goto('/');

		await connectViaContextMenu(page, 'b', 'a', 'benötigt');

		await expect(page.getByTestId('edge-b-a-requires')).toBeVisible();
		await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		await expect(page.getByRole('dialog', { name: 'Beziehung anlegen' })).toHaveCount(0);
	});

	test.describe('Abbruch eines unvollständigen Vorgangs (FR-13)', () => {
		// F-16-AK / nachzuholender Test aus features/STATUS.md (Anmerkung zu F-16): "ESC bricht
		// den laufenden Vorgang ab, ohne die Selektion zu verlieren; ein zweites ESC hebt die
		// Selektion auf." In F-11 mangels Oberfläche für einen laufenden Verbindungsvorgang
		// nicht fahrbar (kein Weg, connectSource zu setzen) — jetzt über "Als Start verwenden"
		// aus der Detail-Kartusche (F-15) nachgeholt.
		test('bricht mit dem ersten ESC nur den Vorgang ab, mit dem zweiten die Selektion', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await page.getByTestId('feature-node-a').click();
			const cartouche = page.getByTestId('detail-cartouche');
			await expect(cartouche).toBeVisible();
			await cartouche.getByRole('button', { name: 'Als Start verwenden' }).click();

			await expect(page.getByTestId('connect-start-a')).toBeVisible();
			await expect(page.getByTestId('connect-banner')).toBeVisible();

			// Erstes ESC: nur der Vorgang endet, die Selektion (und damit die Kartusche) bleibt.
			await page.keyboard.press('Escape');
			await expect(page.getByTestId('connect-start-a')).toHaveCount(0);
			await expect(page.getByTestId('connect-banner')).toHaveCount(0);
			await expect(cartouche).toBeVisible();
			await expect(cartouche.getByRole('heading', { name: 'Feature A' })).toBeVisible();

			// Zweites ESC: jetzt hebt es die Selektion auf (FR-46), da kein Vorgang mehr läuft.
			await page.keyboard.press('Escape');
			await expect(cartouche).toHaveCount(0);
		});

		// F-16, Abschnitt "Abbruch": "Klick auf freie Fläche."
		test('bricht bei Klick auf freie Fläche ab', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');
			await expect(page.getByTestId('connect-start-a')).toBeVisible();

			const karte = page.getByRole('img', { name: /Streudiagramm/ });
			const box = await karte.boundingBox();
			expect(box).not.toBeNull();
			await karte.click({ position: { x: box!.width * 0.05, y: box!.height * 0.05 } });

			await expect(page.getByTestId('connect-start-a')).toHaveCount(0);
			await expect(page.getByTestId('connect-banner')).toHaveCount(0);
		});

		// F-16, Abschnitt "Abbruch": "Knopf Abbrechen im Hinweisband."
		test('bricht über den Knopf "Abbrechen" im Hinweisband ab', async ({ page }) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');
			const banner = page.getByTestId('connect-banner');
			await banner.getByRole('button', { name: 'Abbrechen' }).click();

			await expect(page.getByTestId('connect-start-a')).toHaveCount(0);
			await expect(banner).toHaveCount(0);
		});

		// F-16, Abschnitt "Abbruch": "Knopf Abbrechen ... im Dialog." Bricht den gesamten
		// Vorgang ab, nicht nur den Dialog (Ablauf Schritt 4 kennt keinen Rücksprung zu einem
		// neuen Ziel innerhalb desselben Vorgangs).
		test('bricht über den Knopf "Abbrechen" im Dialog den gesamten Vorgang ab', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES);
			await page.goto('/');

			await startConnectionViaMenu(page, 'a');
			const dialog = await chooseTargetViaMenu(page, 'b');
			await dialog.getByRole('button', { name: 'Abbrechen' }).click();

			await expect(dialog).toHaveCount(0);
			await expect(page.getByTestId('connect-start-a')).toHaveCount(0);
			await expect(page.getByTestId('connect-banner')).toHaveCount(0);
			await expect(page.getByTestId('edge-a-b-requires')).toHaveCount(0);
		});
	});

	// FR-15: "Beziehungen können ebenfalls über die Feature-Liste angelegt werden" — F-14 setzt
	// bereits den Start (Knopf "Beziehung anlegen"); F-16 muss den damit begonnenen Vorgang bis
	// zur angelegten Beziehung fortsetzen können (F-16-AK, Abschnitt "Fachregeln": FR-15).
	test('setzt den Verbindungsstart aus dem Verzeichnis fort bis zur angelegten Beziehung', async ({
		page
	}) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');

		await page.getByRole('button', { name: 'Verzeichnis' }).click();
		const directory = page.getByRole('complementary', { name: 'Verzeichnis' });
		await expect(directory).toBeVisible();

		const row = page.getByTestId('directory-row-a');
		await row.hover();
		await row.getByRole('button', { name: 'Beziehung anlegen' }).click();

		await expect(directory).toHaveCount(0);
		await expect(page.getByTestId('connect-start-a')).toBeVisible();

		const dialog = await chooseTargetViaMenu(page, 'b');
		await dialog.getByRole('button', { name: 'schließt aus', exact: true }).click();
		await dialog.getByRole('button', { name: 'Anlegen' }).click();

		await expect(page.getByTestId('edge-a-b-excludes')).toBeVisible();
	});

	// F-16, Ablauf Schritt 3: "optionale Beschriftung" — wird unverändert an createRelation
	// weitergereicht (INT-04 prüft nur from/to/type, nicht das Label).
	test('übernimmt eine optionale Beschriftung in die neue Beziehung', async ({ page }) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');

		await connectViaContextMenu(page, 'a', 'c', 'hängt zusammen', 'gemeinsame Nutzer');

		await expect(page.getByTestId('edge-a-c-relates')).toBeVisible();
		// Kantenbeschriftungen sind ohne Selektion/Hover nicht sichtbar (FR-45) — deshalb vor der
		// Textprüfung die neue Kante überfahren, wie in e2e/F-10-kanten.spec.ts und
		// e2e/F-11-selektion.spec.ts etabliert (force: true aus demselben, dort begründeten Grund:
		// die dünne Linie trifft an ihrem Bounding-Box-Mittelpunkt sonst leicht das Revier).
		await page.getByTestId('edge-a-c-relates').hover({ force: true });
		await expect(page.getByTestId('edge-label-a-c-relates')).toContainText('gemeinsame Nutzer');
	});

	// Tag- und Nachttafel (CLAUDE.md, QA-Abgleich: "Funktioniert Tag- und Nachttafel").
	test('zeigt die Startmarkierung in --magenta auch in der Nachttafel', async ({ page }) => {
		await seedMap(page, BASE_FEATURES);
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();

		await startConnectionViaMenu(page, 'a');

		const marker = page.getByTestId('connect-start-a');
		await expect(marker).toBeVisible();
		await expect(marker).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'magenta')));
	});
});
