// F-14 · Verzeichnis — E2E-Tests.
// Quellen: features/F-14-verzeichnis.md (Abschnitte "Umfang", "Verhalten", "Fachregeln",
// "Akzeptanzkriterien"), PRD.md (FR-50 bis FR-55, FR-05, FR-24, NFR-21, AK-09),
// design/03-seekarte.html (`.index`, `.find input`, `.group`, `.entry`, `.entry.here`, Knopf
// "Verzeichnis" im Kopfband — im Entwurf nicht abgebildet, weil das Mockup einen statischen,
// bereits geöffneten Zustand zeigt), features/README.md (Sprachtabelle, Abschnitt "Zwei
// Präzisierungen gegenüber den Quellen": Revier-Grenze domainMax/2).
//
// Neu vergebene data-testid (nirgends über Rolle/Text eindeutig zu greifen, weil sich
// Gruppenüberschriften und Zeilenaktionen über mehrere Einträge wiederholen):
//   - directory-group-<quadrant>   Container einer Reviergruppe, <quadrant> ist der englische
//                                  Schlüssel aus src/lib/model/types.ts (quickWins,
//                                  grosseVorhaben, nebenbei, vermeiden), nicht die deutsche
//                                  Beschriftung.
//   - directory-row-<id>           Container eines Verzeichniseintrags, <id> ist die
//                                  Feature-Kennung (global eindeutig). Scope für die darin
//                                  wiederholten Aktionen "Bearbeiten" / "Löschen" /
//                                  "Beziehung anlegen".
//
// Alles andere über Rolle/Text: Das Panel als Landmark role="complementary" mit barrierefreiem
// Namen "Verzeichnis"; der Kopfband-Knopf "Verzeichnis" (aria-pressed spiegelt den
// Auf-/Zugeklappt-Zustand, analog zu den bereits vorhandenen Reglern für Hervorhebung und
// Tafel); das Suchfeld über seinen Platzhalter "Label oder ID suchen" (F-14, Abschnitt
// "Umfang"); die bereits vergebenen Kennzeichen feature-node-<id>, feature-halo-<id>,
// edge-<from>-<to>-<type> aus F-08 bis F-11 für die Karte selbst.
//
// Designentscheidungen dieses Test-Agenten (in den Quellen nicht festgelegt):
//   1. FR-53 nennt drei Sortierkriterien, aber kein Bedienelement (weder PRD noch
//      design/03-seekarte.html zeigen eines — das Mockup zeigt nur den Text "nach Impact" als
//      Beispielzustand). Diese Tests verlangen ein `getByRole('combobox', { name: 'Sortierung'
//      })` mit den Optionen "Anzeigename", "Nutzen", "Aufwand" (Ubiquitous Language). Vom
//      Orchestrator bestätigt.
//   2. FR-05 verlangt eine "Rückfrage" für den Fall bestehender Beziehungen. Ursprünglich mit
//      `window.confirm()` getestet; vom Orchestrator abgelehnt (design/README.md definiert die
//      Kartusche als das gerahmte Overlay für Detail, Zeichenerklärung UND Dialoge — ein
//      natives `confirm` trägt keine Token aus src/app.css und wechselt nicht mit der
//      Nachttafel; F-13 hat mit dem Formular als Dialog in der Seite bereits den Präzedenzfall
//      gesetzt). Diese Tests verlangen stattdessen einen Dialog in der Seite:
//      `getByRole('alertdialog', { name: 'Feature löschen' })`, dessen Text die Zahl der
//      betroffenen Kanten nennt, mit den Knöpfen "Löschen" (bestätigt) und "Abbrechen"
//      (verwirft) — als Kartusche gerendert (`.cartouche`, Hintergrund über das Token --paper,
//      wie das Formular aus F-13).
//
// F-14, Abschnitt "Nicht Teil dieses Features" schließt "Bottom Sheet auf Mobilgeräten (F-22)"
// ausdrücklich aus; die im Abschnitt "Umfang" beiläufig erwähnte Vollbild-Darstellung unter
// 768 px wird deshalb hier nicht geprüft (sie ist F-22 zugeordnet, das erst nach F-14 folgt).
// Bei 375 px wird nur geprüft, dass die Kernfunktionen ohne horizontalen Überlauf erreichbar
// bleiben, nicht ein bestimmtes Layout. Der Verbindungsvorgang selbst (F-16) ist ebenfalls
// nicht Teil dieses Features; die Aktion "Beziehung anlegen" wird deshalb nur insoweit geprüft,
// wie F-14 selbst es verlangt (das Panel schließt sich).

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

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel) — dieselbe
 * Technik wie in e2e/F-11-selektion.spec.ts, damit kein Hexwert außerhalb von src/app.css in
 * diese Testdatei einzieht (CLAUDE.md, QA-Abgleich). */
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

/** Öffnet oder schließt das Verzeichnis über den Kopfband-Knopf (FR-50). */
function verzeichnisKnopf(page: Page): Locator {
	return page.getByRole('button', { name: 'Verzeichnis' });
}

function directoryPanel(page: Page): Locator {
	return page.getByRole('complementary', { name: 'Verzeichnis' });
}

async function openDirectory(page: Page): Promise<void> {
	await verzeichnisKnopf(page).click();
	await expect(directoryPanel(page)).toBeVisible();
}

function rowOf(page: Page, id: string): Locator {
	return page.getByTestId(`directory-row-${id}`);
}

function groupOf(page: Page, quadrant: string): Locator {
	return page.getByTestId(`directory-group-${quadrant}`);
}

/** Rückfrage-Dialog beim Löschen eines Features mit Beziehungen (FR-05) — ein Dialog in der
 * Seite, keine Kartusche mit anderem Namen, damit er sich nicht mit dem Formular-Dialog aus
 * F-13 ("Feature anlegen" / "Feature bearbeiten") überschneidet. */
function deleteConfirmDialog(page: Page): Locator {
	return page.getByRole('alertdialog', { name: 'Feature löschen' });
}

/** Liest die Feature-Kennungen aller Einträge innerhalb einer Reviergruppe, in
 * Anzeigereihenfolge — für die Sortiertests (FR-53). */
async function rowIdsInGroup(page: Page, quadrant: string): Promise<string[]> {
	const testids = await groupOf(page, quadrant)
		.locator('[data-testid^="directory-row-"]')
		.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-testid')));
	return testids.map((testid) => (testid ?? '').replace('directory-row-', ''));
}

type Box = { x: number; y: number; width: number; height: number };

function centerOf(box: Box): { x: number; y: number } {
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Füllt und speichert das Anlegeformular (F-13, bereits auf main) — genutzt, um die
 * Reaktivität des Verzeichnisses auf neue Features zu prüfen (FR-24). */
async function createFeatureViaModal(
	page: Page,
	input: { label: string; id: string; impact: number; effort: number }
): Promise<void> {
	await page.getByRole('button', { name: '+ Feature' }).click();
	const dialog = page.getByRole('dialog', { name: 'Feature anlegen' });
	await dialog.getByLabel('Anzeigename').fill(input.label);
	await dialog.getByLabel('Kennung').fill(input.id);
	await dialog
		.getByRole('group', { name: 'Nutzen' })
		.getByRole('button', { name: String(input.impact), exact: true })
		.click();
	await dialog
		.getByRole('group', { name: 'Aufwand' })
		.getByRole('button', { name: String(input.effort), exact: true })
		.click();
	await dialog.getByRole('button', { name: 'Speichern' }).click();
}

test.describe('F-14 · Verzeichnis', () => {
	// F-14-AK: "Das Panel ist beim ersten Start eingeklappt und lässt sich über das Kopfband
	// öffnen." FR-50.
	test('ist beim ersten Start eingeklappt und über den Kopfband-Knopf auf- und zuklappbar', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 1, effort: 1 }]);
		await page.goto('/');

		await expect(directoryPanel(page)).toHaveCount(0);
		await expect(verzeichnisKnopf(page)).toHaveAttribute('aria-pressed', 'false');

		await verzeichnisKnopf(page).click();
		await expect(directoryPanel(page)).toBeVisible();
		await expect(verzeichnisKnopf(page)).toHaveAttribute('aria-pressed', 'true');

		await verzeichnisKnopf(page).click();
		await expect(directoryPanel(page)).toHaveCount(0);
		await expect(verzeichnisKnopf(page)).toHaveAttribute('aria-pressed', 'false');
	});

	// FR-51: "Zeigt alle Features mit Anzeigename, Nutzen und Aufwand." Ubiquitous Language:
	// fehlt der Anzeigename, wird die Kennung gezeigt.
	test('zeigt zu jedem Eintrag Anzeigename (ersatzweise Kennung), Nutzen und Aufwand', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 },
			{ id: 'login', impact: 3, effort: 2 }
		]);
		await page.goto('/');
		await openDirectory(page);

		await expect(rowOf(page, 'rollen')).toContainText('Rollen & Rechte');
		await expect(rowOf(page, 'rollen')).toContainText('13 · 8');
		await expect(rowOf(page, 'login')).toContainText('login');
		await expect(rowOf(page, 'login')).toContainText('3 · 2');
	});

	// F-14-AK: "Der Filter sso findet ein Feature mit der Kennung sso ebenso wie eines mit dem
	// Namen Single Sign-On." FR-52 (Groß-/Kleinschreibung egal, Teiltreffer).
	test('filtert per Textfeld über Kennung und Anzeigename, unabhängig von Groß-/Kleinschreibung', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'sso', impact: 5, effort: 13 },
			{ id: 'enable-sso', label: 'Single Sign-On', impact: 8, effort: 5 },
			{ id: 'audit-log', label: 'Audit-Log', impact: 3, effort: 3 }
		]);
		await page.goto('/');
		await openDirectory(page);

		const suchfeld = page.getByPlaceholder('Label oder ID suchen');
		await suchfeld.fill('SSO');

		await expect(rowOf(page, 'sso')).toBeVisible();
		await expect(rowOf(page, 'enable-sso')).toBeVisible();
		await expect(rowOf(page, 'audit-log')).toHaveCount(0);

		await suchfeld.fill('');
		await expect(rowOf(page, 'audit-log')).toBeVisible();
	});

	// F-14-AK: "Ein Feature mit impact = 13, effort = 8 steht bei domainMax = 22 unter Quick
	// Wins." features/README.md, Revier-Grenze: Schwelle domainMax / 2 = 11.
	test('gruppiert ein Feature mit impact=13, effort=8 unter Quick Wins', async ({ page }) => {
		await seedMap(page, [{ id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 }]);
		await page.goto('/');
		await openDirectory(page);

		await expect(groupOf(page, 'quickWins')).toContainText('Quick Wins');
		await expect(groupOf(page, 'quickWins').getByTestId('directory-row-rollen')).toBeVisible();
	});

	// features/README.md, "Zwei Präzisierungen…", Revier-Grenze: Regressionstest gegen die zwei
	// im Mockup fehlerhaft gruppierten Features.
	test('gruppiert Single Sign-On (5/13) unter Vermeiden und Volltextsuche (8/8) unter Nebenbei', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 },
			{ id: 'suche', label: 'Volltextsuche', impact: 8, effort: 8 }
		]);
		await page.goto('/');
		await openDirectory(page);

		await expect(groupOf(page, 'vermeiden').getByTestId('directory-row-sso')).toBeVisible();
		await expect(groupOf(page, 'nebenbei').getByTestId('directory-row-suche')).toBeVisible();
		await expect(page.getByTestId('directory-group-grosseVorhaben')).toHaveCount(0);
		await expect(page.getByTestId('directory-group-quickWins')).toHaveCount(0);
	});

	// F-14, Abschnitt "Umfang": "leere Gruppen entfallen", feste Reihenfolge Quick Wins, Große
	// Vorhaben, Nebenbei, Vermeiden.
	test('zeigt nur besetzte Gruppen in der festen Revierreihenfolge', async ({ page }) => {
		await seedMap(page, [
			{ id: 'a', impact: 21, effort: 1 }, // Quick Wins
			{ id: 'b', impact: 1, effort: 1 } // Nebenbei
		]);
		await page.goto('/');
		await openDirectory(page);

		const groupTestIds = await page
			.locator('[data-testid^="directory-group-"]')
			.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-testid')));
		expect(groupTestIds).toEqual(['directory-group-quickWins', 'directory-group-nebenbei']);
	});

	// FR-53, F-14 "Verhalten": Sortierung nach Anzeigename (aufsteigend), Nutzen/Aufwand
	// (absteigend); die Gruppierung nach Revieren bleibt bestehen.
	test('sortiert die Einträge innerhalb einer Gruppe nach dem gewählten Kriterium', async ({
		page
	}) => {
		// Alle drei liegen bei domainMax=22 (Schwelle 11) unter Quick Wins: impact ≥ 11, effort < 11.
		await seedMap(page, [
			{ id: 'charlie', label: 'Charlie', impact: 21, effort: 1 },
			{ id: 'alpha', label: 'Alpha', impact: 13, effort: 2 },
			{ id: 'bravo', label: 'Bravo', impact: 11, effort: 3 }
		]);
		await page.goto('/');
		await openDirectory(page);

		const sortierung = page.getByRole('combobox', { name: 'Sortierung' });

		await sortierung.selectOption({ label: 'Anzeigename' });
		expect(await rowIdsInGroup(page, 'quickWins')).toEqual(['alpha', 'bravo', 'charlie']);

		await sortierung.selectOption({ label: 'Nutzen' });
		expect(await rowIdsInGroup(page, 'quickWins')).toEqual(['charlie', 'alpha', 'bravo']);

		await sortierung.selectOption({ label: 'Aufwand' });
		expect(await rowIdsInGroup(page, 'quickWins')).toEqual(['bravo', 'alpha', 'charlie']);
	});

	// F-14-AK: "Klick auf einen Eintrag selektiert das Feature und rückt es in die Mitte des
	// Ausschnitts." FR-54, nutzt centerOn aus F-12 (bereits auf main).
	test('selektiert und zentriert das Feature nach Klick auf einen Eintrag', async ({ page }) => {
		// impact=21 platziert das Feature oben links in der Plotfläche (F-08), also deutlich
		// abseits der Bildschirmmitte — ein aussagekräftiger Ausgangspunkt für den Zentrierungstest.
		await seedMap(page, [{ id: 'ziel', label: 'Ziel', impact: 21, effort: 1 }]);
		await page.goto('/');
		await openDirectory(page);

		await rowOf(page, 'ziel').click();

		await expect(page.getByTestId('feature-halo-ziel')).toBeVisible();

		const mapBox = await page.getByRole('img', { name: /Streudiagramm/ }).boundingBox();
		const nodeBox = await page.getByTestId('feature-node-ziel').boundingBox();
		expect(mapBox, 'Kartenfläche sollte eine sichtbare Bounding Box haben').not.toBeNull();
		expect(nodeBox, 'Feature-Signatur sollte eine sichtbare Bounding Box haben').not.toBeNull();

		const abstand = distance(centerOf(mapBox!), centerOf(nodeBox!));
		expect(abstand, 'Feature sollte nach der Zentrierung nahe der Bildschirmmitte liegen').toBeLessThan(
			10
		);
	});

	// F-14-AK: "Löschen eines Features mit drei Kanten fragt zurück und nennt die Zahl 3; nach
	// dem Bestätigen sind Feature und Kanten aus Karte und Verzeichnis verschwunden." FR-05,
	// AK-09.
	test('fragt beim Löschen eines Features mit drei Beziehungen zurück und entfernt danach Feature und Kanten', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'target', label: 'Ziel', impact: 5, effort: 5 },
				{ id: 'x1', impact: 1, effort: 1 },
				{ id: 'x2', impact: 2, effort: 2 },
				{ id: 'x3', impact: 3, effort: 3 }
			],
			[
				{ from: 'target', to: 'x1', type: 'requires' },
				{ from: 'x2', to: 'target', type: 'relates' },
				{ from: 'target', to: 'x3', type: 'excludes' }
			]
		);
		await page.goto('/');
		await openDirectory(page);

		let dialogMessage = '';
		page.once('dialog', (dialog) => {
			dialogMessage = dialog.message();
			void dialog.accept();
		});

		const zeile = rowOf(page, 'target');
		await zeile.hover();
		await zeile.getByRole('button', { name: 'Löschen' }).click();

		await expect.poll(() => dialogMessage).toContain('3');
		await expect(rowOf(page, 'target')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-target')).toHaveCount(0);
		await expect(page.getByTestId('edge-target-x1-requires')).toHaveCount(0);
		await expect(page.getByTestId('edge-x2-target-relates')).toHaveCount(0);
		await expect(page.getByTestId('edge-target-x3-excludes')).toHaveCount(0);
	});

	// FR-05: "Bestehen Beziehungen, erfolgt eine Rückfrage" — im Umkehrschluss keine Rückfrage
	// ohne Beziehungen.
	test('löscht ein Feature ohne Beziehungen sofort, ohne Rückfrage', async ({ page }) => {
		await seedMap(page, [{ id: 'einsam', label: 'Einsam', impact: 1, effort: 1 }]);
		await page.goto('/');
		await openDirectory(page);

		let dialogShown = false;
		page.once('dialog', (dialog) => {
			dialogShown = true;
			void dialog.accept();
		});

		const zeile = rowOf(page, 'einsam');
		await zeile.hover();
		await zeile.getByRole('button', { name: 'Löschen' }).click();

		await expect(rowOf(page, 'einsam')).toHaveCount(0);
		expect(dialogShown, 'ohne Beziehungen sollte keine Rückfrage erscheinen').toBe(false);
	});

	// FR-05: Bricht die Rückfrage ab, bleibt das Feature samt Beziehung erhalten.
	test('behält Feature und Beziehung, wenn die Rückfrage abgebrochen wird', async ({ page }) => {
		await seedMap(
			page,
			[
				{ id: 'target', label: 'Ziel', impact: 5, effort: 5 },
				{ id: 'x1', impact: 1, effort: 1 }
			],
			[{ from: 'target', to: 'x1', type: 'requires' }]
		);
		await page.goto('/');
		await openDirectory(page);

		page.once('dialog', (dialog) => void dialog.dismiss());

		const zeile = rowOf(page, 'target');
		await zeile.hover();
		await zeile.getByRole('button', { name: 'Löschen' }).click();

		await expect(rowOf(page, 'target')).toBeVisible();
		await expect(page.getByTestId('feature-node-target')).toBeVisible();
		await expect(page.getByTestId('edge-target-x1-requires')).toBeVisible();
	});

	// F-14, Abschnitt "Verhalten": Aktion "Beziehung anlegen" setzt das Feature als Start des
	// Verbindungsvorgangs (F-16, nicht Teil dieses Features) und schließt das Panel — hier wird
	// nur das für F-14 beobachtbare Verhalten geprüft, das Schließen.
	test('schließt das Verzeichnis nach "Beziehung anlegen"', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 1, effort: 1 }]);
		await page.goto('/');
		await openDirectory(page);

		const zeile = rowOf(page, 'a');
		await zeile.hover();
		await zeile.getByRole('button', { name: 'Beziehung anlegen' }).click();

		await expect(directoryPanel(page)).toHaveCount(0);
	});

	// FR-55, FR-04 (bereits auf main, F-13): "Bearbeiten" öffnet das vorbefüllte Formular.
	test('öffnet über "Bearbeiten" das vorbefüllte Formular für das Feature', async ({ page }) => {
		await seedMap(page, [{ id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 }]);
		await page.goto('/');
		await openDirectory(page);

		const zeile = rowOf(page, 'rollen');
		await zeile.hover();
		await zeile.getByRole('button', { name: 'Bearbeiten' }).click();

		const dialog = page.getByRole('dialog', { name: 'Feature bearbeiten' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByLabel('Anzeigename')).toHaveValue('Rollen & Rechte');
		await expect(dialog.getByLabel('Kennung')).toHaveValue('rollen');
	});

	// F-14-AK: "Die Liste aktualisiert sich sofort nach jeder Änderung." FR-24.
	test('zeigt ein neu angelegtes Feature ohne Neuladen sofort im geöffneten Verzeichnis', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 1, effort: 1 }]);
		await page.goto('/');
		await openDirectory(page);

		await expect(rowOf(page, 'b')).toHaveCount(0);

		await createFeatureViaModal(page, { label: 'B', id: 'b', impact: 3, effort: 2 });

		await expect(directoryPanel(page)).toBeVisible();
		await expect(rowOf(page, 'b')).toBeVisible();
		await expect(rowOf(page, 'b')).toContainText('3 · 2');
	});

	// F-14-AK: "Alle Einträge und Aktionen sind mit der Tastatur erreichbar." Geprüft wird die
	// Erreichbarkeit und Bedienbarkeit über Tastaturfokus plus Enter, nicht eine bestimmte
	// Tab-Reihenfolge (die legt der Feature-Agent fest).
	test('sind Suchfeld und Zeilenaktionen mit der Tastatur bedienbar', async ({ page }) => {
		await seedMap(page, [
			{ id: 'sso', impact: 5, effort: 13 },
			{ id: 'audit-log', label: 'Audit-Log', impact: 3, effort: 3 },
			{ id: 'einsam', label: 'Einsam', impact: 1, effort: 1 }
		]);
		await page.goto('/');
		await openDirectory(page);

		const suchfeld = page.getByPlaceholder('Label oder ID suchen');
		await suchfeld.focus();
		await page.keyboard.type('sso');
		await expect(rowOf(page, 'sso')).toBeVisible();
		await expect(rowOf(page, 'audit-log')).toHaveCount(0);
		await suchfeld.fill('');

		const bearbeitenKnopf = rowOf(page, 'sso').getByRole('button', { name: 'Bearbeiten' });
		await bearbeitenKnopf.focus();
		await expect(bearbeitenKnopf).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog', { name: 'Feature bearbeiten' })).toBeVisible();
		await page.keyboard.press('Escape');

		await openDirectory(page);
		const loeschenKnopf = rowOf(page, 'einsam').getByRole('button', { name: 'Löschen' });
		await loeschenKnopf.focus();
		await expect(loeschenKnopf).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(rowOf(page, 'einsam')).toHaveCount(0);
	});

	// NFR-21: "Labels … werden ausschließlich als Text gerendert, niemals als HTML/SVG-Markup
	// interpretiert." Analog zu PRD AK-13, hier für das Verzeichnis statt die Karte.
	test('rendert ein Label mit spitzen Klammern als sichtbaren Text, ohne es auszuführen', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'unsicher', label: '<script>window.__xss = true</script>', impact: 1, effort: 1 }
		]);
		await page.goto('/');
		await openDirectory(page);

		await expect(rowOf(page, 'unsicher')).toContainText('<script>window.__xss = true</script>');
		const wurdeAusgefuehrt = await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss === true);
		expect(wurdeAusgefuehrt).toBe(false);
	});

	// CLAUDE.md „QA-Abgleich": Nachttafel. Das Panel läuft über dieselben Farbtoken wie der Rest
	// der Anwendung (--paper), kein Hexwert außerhalb von src/app.css (design/03-seekarte.html,
	// `.index{background:var(--paper)}`).
	test('färbt das Verzeichnis mit dem Farbtoken --paper, in Tag- wie in Nachttafel', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 1, effort: 1 }]);
		await page.goto('/');
		await openDirectory(page);

		await expect(directoryPanel(page)).toHaveCSS('background-color', hexToRgb(tokenHex('light', 'paper')));

		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(directoryPanel(page)).toHaveCSS('background-color', hexToRgb(tokenHex('dark', 'paper')));
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich): Verzeichnis öffnet, filtert und überläuft nicht
	// horizontal bei 375, 834 und 1440 px.
	for (const breite of BREAKPOINTS) {
		test(`öffnet, filtert und überläuft nicht horizontal bei ${breite}px`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, [
				{ id: 'sso', impact: 5, effort: 13 },
				{ id: 'audit-log', label: 'Audit-Log', impact: 3, effort: 3 }
			]);
			await page.goto('/');
			await openDirectory(page);

			const suchfeld = page.getByPlaceholder('Label oder ID suchen');
			await suchfeld.fill('sso');
			await expect(rowOf(page, 'sso')).toBeVisible();
			await expect(rowOf(page, 'audit-log')).toHaveCount(0);

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}

	// design/03-seekarte.html: `.index{width:298px}`, `@media (max-width:1080px){.index{width:250px}}`.
	// Bei 1440 px (> 1080) gilt die Grundbreite, bei 834 px (< 1080, ≥ 768) die schmalere Breite.
	test('ist bei 1440px 298px und bei 834px 250px breit', async ({ page }) => {
		await seedMap(page, [{ id: 'a', label: 'A', impact: 1, effort: 1 }]);

		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await openDirectory(page);
		let box = await directoryPanel(page).boundingBox();
		expect(box, 'Verzeichnis sollte eine sichtbare Bounding Box haben').not.toBeNull();
		expect(box!.width).toBeCloseTo(298, 0);

		await page.setViewportSize({ width: 834, height: 900 });
		box = await directoryPanel(page).boundingBox();
		expect(box, 'Verzeichnis sollte eine sichtbare Bounding Box haben').not.toBeNull();
		expect(box!.width).toBeCloseTo(250, 0);
	});
});
