// F-13 · Feature-Formular — E2E-Tests.
// Quellen: features/F-13-feature-formular.md (Akzeptanzkriterien, Abschnitte "Umfang",
// "Werte außerhalb der Schätzreihe", "Darstellung", "Fachregeln"), PRD.md (FR-01 bis FR-04,
// FR-06, FR-07, INT-01, INT-03, INT-04, INT-06, NFR-23, AK-01, AK-10, AK-15, UI-13),
// design/03-seekarte.html (Knopf "+ Feature" im Kopfband, `.cartouche`-Rahmen, Fraunces/Azeret
// Mono), features/README.md (Sprachtabelle: "benötigt"/"hängt zusammen"/"schließt aus" für
// RelationType, "Speichern" aus F-13, Abschnitt "Darstellung": "ESC schließt ohne zu
// speichern").
//
// Neu vergebene data-testid:
//   - relation-row-<index>   Container einer Zeile im Beziehungs-Abschnitt (0-basiert, laufende
//                             Nummer in der aktuellen Liste). Nötig, weil sich die
//                             Feldbeschriftungen "Ziel", "Art" und "Beschriftung" über mehrere
//                             Zeilen wiederholen und ohne Container-Kennzeichen nicht eindeutig
//                             ansprechbar wären.
//
// Alles andere wird über Rolle/Text angesprochen. Verbindlicher Wortlaut, den der
// Feature-Agent rendern muss:
//   - Knopf "+ Feature" (design/03-seekarte.html, Kopfband) öffnet das Formular zum Anlegen.
//   - Dialog: role="dialog" mit barrierefreiem Namen "Feature anlegen" (Anlegen) bzw.
//     "Feature bearbeiten" (Bearbeiten) — "Feature anlegen" ist derselbe Wortlaut wie der
//     spätere Menüeintrag in features/F-16-verbindungsvorgang.md.
//   - Felder über getByLabel: "Anzeigename", "Kennung".
//   - Gruppen über getByRole('group', { name }): "Nutzen", "Aufwand" — Knöpfe darin über ihren
//     sichtbaren Zahlenwert (z. B. "5", exact), die abweichende Zusatzoption über ihren Text
//     "<Wert> (abweichend)" (F-13, Abschnitt "Werte außerhalb der Schätzreihe").
//   - Beziehungs-Abschnitt: Knopf "Beziehung hinzufügen" fügt eine neue relation-row-<index>
//     an; darin je ein Feld "Ziel" (<select>, Option-`value` = Feature-Kennung — die sichtbare
//     Beschriftung der Option ist dem Feature-Agenten überlassen), "Art" (<select>,
//     Option-`value` exakt "requires" | "relates" | "excludes", sichtbarer Text nach der
//     Sprachtabelle "benötigt" / "hängt zusammen" / "schließt aus"), "Beschriftung" (Freitext)
//     sowie ein Knopf "Entfernen" innerhalb der Zeile.
//   - Knöpfe "Speichern" und "Abbrechen" (F-13, Abschnitt "Darstellung": "ESC schließt ohne zu
//     speichern" — derselbe Wortstamm für den Knopf).
//
// Lücke zwischen den Quellen (dem Orchestrator zu melden, siehe Abschlussbericht): FR-04
// ("Bearbeiten nutzt dasselbe, vorbefüllte Formular") ist F-13 selbst zugeordnet und dieses
// Feature verlangt einen eigenen E2E-Test "Bearbeiten mit Umbenennen" — F-13 hängt aber nur von
// F-03 ab, nicht von F-15 (Detail-Kartusche, dort lebt der einzige in den Quellen benannte
// "Bearbeiten"-Knopf) oder F-16 (Kontextmenü). Ohne einen der beiden existiert in F-13 keine
// spezifizierte Oberfläche, um den Bearbeiten-Vorgang auszulösen. Entscheidung dieses
// Test-Agenten, damit das Kriterium prüfbar ist: ein über Rolle und Text erreichbarer Knopf
// "Bearbeiten", sichtbar/verfügbar, sobald ein Feature selektiert ist (F-11 `selectedId`,
// bereits auf main). Wo der Feature-Agent ihn platziert, ist ihm überlassen. Diese Wahl kann zu
// F-15 in Konflikt geraten und ist vom Orchestrator zu bestätigen oder zu revidieren.

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

/** Liest den aktuell in LocalStorage gespeicherten Kartenzustand (Muster aus F-11). */
async function readStoredMap(
	page: Page
): Promise<{ features: SeedFeature[]; relations: SeedRelation[] }> {
	const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
	expect(raw, 'Testaufbau: LocalStorage sollte eine Karte enthalten').not.toBeNull();
	return JSON.parse(raw!);
}

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel), wie in F-11. */
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

/** Öffnet das Anlegeformular über den Knopf "+ Feature" im Kopfband. */
async function openCreateModal(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: '+ Feature' }).click();
	return page.getByRole('dialog', { name: 'Feature anlegen' });
}

/**
 * Selektiert ein Feature auf der Karte und öffnet dessen Bearbeitungsformular über den Knopf
 * "Bearbeiten" (Entscheidung dieses Test-Agenten, siehe Kommentar am Dateianfang).
 */
async function openEditModal(page: Page, id: string): Promise<Locator> {
	await page.getByTestId(`feature-node-${id}`).click();
	await page.getByRole('button', { name: 'Bearbeiten' }).click();
	return page.getByRole('dialog', { name: 'Feature bearbeiten' });
}

const NUTZEN = (dialog: Locator) => dialog.getByRole('group', { name: 'Nutzen' });
const AUFWAND = (dialog: Locator) => dialog.getByRole('group', { name: 'Aufwand' });

test.describe('F-13 · Feature-Formular', () => {
	// AK-01 (F-13, PRD): "Ein neu angelegtes Feature erscheint ohne Neuladen sofort an der
	// richtigen Stelle auf der Karte."
	test('zeigt ein neu angelegtes Feature ohne Neuladen sofort auf der Karte', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Anzeigename').fill('Rollen & Rechte');
		await dialog.getByLabel('Kennung').fill('rollen-rechte');
		await NUTZEN(dialog).getByRole('button', { name: '13', exact: true }).click();
		await AUFWAND(dialog).getByRole('button', { name: '8', exact: true }).click();
		await dialog.getByRole('button', { name: 'Speichern' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-rollen-rechte')).toBeVisible();
	});

	// F-13-AK: "Eine bereits vergebene Kennung wird abgelehnt; die Meldung steht am Feld
	// Kennung, das Modal bleibt offen, keine Daten gehen verloren." INT-01, Meldung im
	// Wortlaut aus src/lib/model/validation.ts: "Kennung ist bereits vergeben".
	test('lehnt eine bereits vergebene Kennung mit Meldung am Feld ab und verliert keine Daten', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'login', label: 'Login', impact: 5, effort: 3 }]);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Anzeigename').fill('Zweiter Login');
		await dialog.getByLabel('Kennung').fill('login');
		await NUTZEN(dialog).getByRole('button', { name: '5', exact: true }).click();
		await AUFWAND(dialog).getByRole('button', { name: '3', exact: true }).click();
		await dialog.getByRole('button', { name: 'Speichern' }).click();

		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Kennung ist bereits vergeben')).toBeVisible();
		await expect(dialog.getByLabel('Anzeigename')).toHaveValue('Zweiter Login');
		await expect(dialog.getByLabel('Kennung')).toHaveValue('login');
	});

	// F-13-AK: "Anzeigename Rollen & Rechte schlägt die Kennung rollen-rechte vor; nach
	// manueller Änderung der Kennung folgt sie weiteren Namensänderungen nicht mehr." FR-07.
	test('schlägt die Kennung aus dem Anzeigenamen vor und folgt ihm nach manueller Änderung nicht mehr', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		const kennung = dialog.getByLabel('Kennung');
		await dialog.getByLabel('Anzeigename').fill('Rollen & Rechte');
		await expect(kennung).toHaveValue('rollen-rechte');

		await kennung.fill('rr');
		await dialog.getByLabel('Anzeigename').fill('Rollen & Rechte, erweitert');
		// Die Kennung folgt der manuellen Änderung nicht mehr nach.
		await expect(kennung).toHaveValue('rr');
	});

	// F-13-AK / PRD AK-15: "Ein Feature mit impact = 7 zeigt im Formular 7 als vorausgewählte,
	// gekennzeichnete Zusatzoption; nach Abbruch bleibt der Wert 7 erhalten."
	test('zeigt einen abweichenden Nutzen-Wert als vorausgewählte Zusatzoption und erhält ihn nach Abbruch', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'x', label: 'X', impact: 7, effort: 5 }]);
		await page.goto('/');

		let dialog = await openEditModal(page, 'x');
		const zusatzoption = NUTZEN(dialog).getByRole('button', { name: '7 (abweichend)' });
		await expect(zusatzoption).toBeVisible();
		await expect(zusatzoption).toHaveAttribute('aria-pressed', 'true');
		await expect(zusatzoption).toHaveCSS('color', hexToRgb(tokenHex('light', 'magenta')));

		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);

		const stored = await readStoredMap(page);
		expect(stored.features.find((f) => f.id === 'x')?.impact).toBe(7);

		// Erneutes Öffnen bestätigt: der Wert wurde nicht stillschweigend gerundet (FR-03).
		dialog = await openEditModal(page, 'x');
		await expect(NUTZEN(dialog).getByRole('button', { name: '7 (abweichend)' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	// PRD FR-02: "Impact und Effort werden im Formular ausschließlich als Fibonacci-Werte
	// angeboten." Ohne abweichenden Wert erscheinen genau die sieben Werte der Schätzreihe.
	test('bietet ohne abweichenden Wert genau die sieben Werte der Schätzreihe an', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		const buttons = NUTZEN(dialog).getByRole('button');
		await expect(buttons).toHaveCount(7);
		await expect(buttons).toHaveText(['1', '2', '3', '5', '8', '13', '21']);
	});

	// F-13-AK: "Ein Feature, das im Formular mit zwei Beziehungen angelegt wird, hat danach
	// zwei Kanten auf der Karte." FR-06.
	test('legt beim Anlegen zwei Beziehungen an, die danach als zwei Kanten erscheinen', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'b', label: 'B', impact: 2, effort: 2 },
			{ id: 'c', label: 'C', impact: 3, effort: 3 }
		]);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Anzeigename').fill('A');
		await dialog.getByLabel('Kennung').fill('a');
		await NUTZEN(dialog).getByRole('button', { name: '5', exact: true }).click();
		await AUFWAND(dialog).getByRole('button', { name: '5', exact: true }).click();

		await dialog.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
		const row0 = dialog.getByTestId('relation-row-0');
		await row0.getByLabel('Ziel').selectOption({ value: 'b' });
		await row0.getByLabel('Art').selectOption('requires');

		await dialog.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
		const row1 = dialog.getByTestId('relation-row-1');
		await row1.getByLabel('Ziel').selectOption({ value: 'c' });
		await row1.getByLabel('Art').selectOption('relates');

		await dialog.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		await expect(page.getByTestId('feature-node-a')).toBeVisible();
		await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		await expect(page.getByTestId('edge-a-c-relates')).toBeVisible();
	});

	// F-13, Abschnitt "Fachregeln": "Beziehungen aus dem Formular werden erst nach dem
	// erfolgreichen Speichern des Features angelegt; scheitert eine einzelne Beziehung an einer
	// Invariante, bleibt das Feature gespeichert und die betroffene Zeile zeigt den Fehler."
	// INT-04, Meldung im Wortlaut aus src/lib/model/validation.ts: "Beziehung existiert bereits".
	test('speichert das Feature trotz einer an INT-04 scheiternden Beziehungszeile und zeigt den Fehler an der Zeile', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'b', label: 'B', impact: 2, effort: 2 }]);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Anzeigename').fill('A');
		await dialog.getByLabel('Kennung').fill('a');
		await NUTZEN(dialog).getByRole('button', { name: '5', exact: true }).click();
		await AUFWAND(dialog).getByRole('button', { name: '5', exact: true }).click();

		for (const index of [0, 1]) {
			await dialog.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
			const row = dialog.getByTestId(`relation-row-${index}`);
			await row.getByLabel('Ziel').selectOption({ value: 'b' });
			await row.getByLabel('Art').selectOption('requires');
		}

		await dialog.getByRole('button', { name: 'Speichern' }).click();

		// Das Feature ist trotz der scheiternden zweiten Zeile gespeichert.
		await expect(page.getByTestId('feature-node-a')).toBeVisible();
		await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		// Die zweite, doppelte Zeile zeigt den Fehler; das Modal bleibt für die Korrektur offen.
		await expect(dialog).toBeVisible();
		await expect(dialog.getByTestId('relation-row-1').getByText('Beziehung existiert bereits')).toBeVisible();
	});

	// F-13-AK / PRD AK-10: "Beim Umbenennen der Kennung bleiben alle Beziehungen intakt." FR-04
	// (Bearbeiten nutzt dasselbe Formular), INT-06.
	test('hält beim Umbenennen der Kennung im Bearbeitungsformular alle Beziehungen intakt', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 3, effort: 1 },
				{ id: 'b', label: 'B', impact: 2, effort: 2 }
			],
			[{ from: 'a', to: 'b', type: 'requires', label: 'nutzt Identität' }]
		);
		await page.goto('/');

		const dialog = await openEditModal(page, 'a');
		await expect(dialog.getByLabel('Anzeigename')).toHaveValue('A');
		await dialog.getByLabel('Kennung').fill('a2');
		await dialog.getByRole('button', { name: 'Speichern' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-a2')).toBeVisible();
		await expect(page.getByTestId('feature-node-a')).toHaveCount(0);
		await expect(page.getByTestId('edge-a2-b-requires')).toBeVisible();
		await expect(page.getByTestId('edge-a-b-requires')).toHaveCount(0);
	});

	// F-13-AK: "ESC schließt ohne zu speichern; der Fokus bleibt im Modal gefangen, solange es
	// offen ist." Zusätzlich: Fokus beim Öffnen auf das erste Feld, Rückkehr auf das auslösende
	// Element beim Schließen (Abschnitt "Darstellung").
	test('schließt bei ESC ohne zu speichern und ohne Daten verloren zu geben', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const auslöser = page.getByRole('button', { name: '+ Feature' });
		const dialog = await openCreateModal(page);
		await expect(dialog.getByLabel('Anzeigename')).toBeFocused();

		await dialog.getByLabel('Anzeigename').fill('Verworfen');
		await dialog.getByLabel('Kennung').fill('verworfen');
		await page.keyboard.press('Escape');

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-verworfen')).toHaveCount(0);
		await expect(auslöser).toBeFocused();
	});

	// F-13, Abschnitt "Darstellung": "Klick auf den Hintergrund" schließt ebenso ohne zu
	// speichern.
	test('schließt bei Klick auf den Hintergrund ohne zu speichern', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Anzeigename').fill('Verworfen');
		// Linke obere Ecke der Seite: außerhalb jeder denkbaren Kartuschen-Platzierung des
		// Formulars (F-13, Abschnitt "Darstellung": Kartusche über der Karte).
		await page.mouse.click(2, 2);

		await expect(page.getByRole('dialog')).toHaveCount(0);
	});

	// F-13-AK: "der Fokus bleibt im Modal gefangen, solange es offen ist."
	test('hält den Tastaturfokus im Modal gefangen', async ({ page }) => {
		await seedMap(page, [{ id: 'b', label: 'B', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openCreateModal(page);

		for (let i = 0; i < 25; i++) {
			await page.keyboard.press('Tab');
			const withinDialog = await page.evaluate(() => {
				const active = document.activeElement;
				const dialogEl = document.querySelector('[role="dialog"]');
				return !!dialogEl && !!active && dialogEl.contains(active);
			});
			expect(withinDialog, `Fokus sollte nach ${i + 1} Tab-Schritten im Modal bleiben`).toBe(
				true
			);
		}
	});

	// PRD NFR-23: "Eingabelängen sind begrenzt (ID max. 64 Zeichen, Label max. 200,
	// Kantenlabel max. 120)."
	test('begrenzt die Eingabelänge von Kennung, Anzeigename und Kantenbeschriftung', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'b', label: 'B', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		await dialog.getByLabel('Kennung').fill('k'.repeat(100));
		expect((await dialog.getByLabel('Kennung').inputValue()).length).toBeLessThanOrEqual(64);

		await dialog.getByLabel('Anzeigename').fill('n'.repeat(300));
		expect((await dialog.getByLabel('Anzeigename').inputValue()).length).toBeLessThanOrEqual(
			200
		);

		await dialog.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
		const row = dialog.getByTestId('relation-row-0');
		await row.getByLabel('Beschriftung').fill('l'.repeat(200));
		expect((await row.getByLabel('Beschriftung').inputValue()).length).toBeLessThanOrEqual(120);
	});

	// F-13, Abschnitt "Darstellung": Titel in Fraunces, Feldbeschriftungen in gesperrten
	// Versalien in --ink-soft, Rahmen der Kartusche 1 px --rule.
	test('stellt die Kartusche mit Fraunces-Titel, Versal-Feldbeschriftungen und --rule-Rahmen dar', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		const heading = dialog.getByRole('heading', { name: 'Feature anlegen' });
		await expect(heading).toBeVisible();
		await expect(heading).toHaveCSS('font-family', /Fraunces/);

		const label = dialog.getByText('Kennung', { exact: true });
		await expect(label).toHaveCSS('text-transform', 'uppercase');
		await expect(label).toHaveCSS('color', hexToRgb(tokenHex('light', 'ink-soft')));

		await expect(dialog).toHaveCSS('border-color', hexToRgb(tokenHex('light', 'rule')));
		await expect(dialog).toHaveCSS('border-width', '1px');
	});

	// F-13, Abschnitt "Darstellung": "Zahlenwerte in Azeret Mono. Die Schätzreihe erscheint als
	// Reihe gleich breiter Knöpfe, der gewählte Wert in --ink mit Schrift in --paper."
	test('zeigt Score-Knöpfe in Azeret Mono, gleicher Breite, und den gewählten Wert in --ink/--paper', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		const gruppe = NUTZEN(dialog);
		const erster = gruppe.getByRole('button', { name: '1', exact: true });
		const zweiter = gruppe.getByRole('button', { name: '2', exact: true });
		await expect(erster).toHaveCSS('font-family', /Azeret Mono/);

		const [breite1, breite2] = await Promise.all([
			erster.evaluate((el) => el.getBoundingClientRect().width),
			zweiter.evaluate((el) => el.getBoundingClientRect().width)
		]);
		expect(Math.abs(breite1 - breite2)).toBeLessThanOrEqual(2);

		const fuenf = gruppe.getByRole('button', { name: '5', exact: true });
		await fuenf.click();
		await expect(fuenf).toHaveCSS('background-color', hexToRgb(tokenHex('light', 'ink')));
		await expect(fuenf).toHaveCSS('color', hexToRgb(tokenHex('light', 'paper')));
	});

	// CLAUDE.md "QA-Abgleich": Nachttafel. Derselbe gewählte Wert muss auch mit den
	// Nacht-Tokens für --ink/--paper gerendert werden.
	test('zeigt den gewählten Score-Wert in der Nachttafel mit den Nacht-Tokens für --ink/--paper', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		const dialog = await openCreateModal(page);
		const fuenf = NUTZEN(dialog).getByRole('button', { name: '5', exact: true });
		await fuenf.click();
		await expect(fuenf).toHaveCSS('background-color', hexToRgb(tokenHex('dark', 'ink')));
		await expect(fuenf).toHaveCSS('color', hexToRgb(tokenHex('dark', 'paper')));
	});

	// UI-13: "Modale Formulare werden im Vollbild dargestellt" unter 768 px.
	for (const breite of BREAKPOINTS) {
		test(`Formular ${breite < 768 ? 'füllt den Bildschirm (UI-13)' : 'bleibt als Kartusche über der Karte'} bei ${breite}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, []);
			await page.goto('/');

			const dialog = await openCreateModal(page);
			const box = await dialog.boundingBox();
			expect(box, 'Testaufbau: Dialog sollte eine Bounding Box haben').not.toBeNull();

			if (breite < 768) {
				expect(box!.width).toBeGreaterThanOrEqual(breite - 2);
			} else {
				expect(box!.width).toBeLessThan(breite);
			}

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
