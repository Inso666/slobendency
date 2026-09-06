// F-15 · Detail-Kartusche — E2E-Tests.
// Quellen: features/F-15-detail-kartusche.md (Akzeptanzkriterien, Abschnitte "Umfang",
// "Verhalten", "Fachregeln"), PRD.md (FR-40, FR-05, FR-31, NFR-21, UI-15, AK-05, AK-13),
// design/03-seekarte.html (Kartusche `.detail` oben rechts, 300 px, `.cartouche`-Rahmen;
// Abschnitte `.hd`, `.sounding`, `.bearings`, `.detail .btns`; Signaturen `.s-ink`, `.s-sea`,
// `.s-mag`), features/README.md (Ubiquitous Language: Revier, Lotung, Kartusche),
// features/STATUS.md (Auflage zu F-15: der Knopf "Bearbeiten" aus F-13 wird in die Kartusche
// übernommen, nicht danebengestellt).
//
// Verbindlicher Wortlaut, den der Feature-Agent rendern muss (design/03-seekarte.html,
// Abschnitt `.detail`, und features/F-15-detail-kartusche.md, Abschnitt "Umfang"):
//   - Kopf: Anzeigename als Überschrift (role="heading"), darunter die Kennung.
//   - Lotung: die drei Beschriftungen "Impact", "Effort", "Revier"; Reviername einer von
//     "Quick Wins" | "Große Vorhaben" | "Nebenbei" | "Vermeiden".
//   - Abschnittsüberschriften "Geht aus von hier" und "Führt hierher" (im Entwurf durch
//     text-transform in Versalien gesetzt, im Markup also in gemischter Schreibung).
//   - Ohne jede Beziehung: der Hinweis "Keine Beziehungen" in --ink-soft.
//   - Aktionen: "Bearbeiten", "Als Start verwenden", "Löschen" (letzteres in --magenta).
//   - Jede Zeile eines Beziehungsabschnitts enthält einen Knopf, dessen zugänglicher Name mit
//     dem Anzeigenamen des Gegenübers beginnt; ein Klick darauf selektiert dieses Feature.
//   - Die Rückfrage vor dem Löschen (FR-05) ist ein role="dialog" mit der Anzahl der
//     betroffenen Kanten im Text und den Knöpfen "Löschen" und "Abbrechen". Bewusst kein
//     window.confirm: die Rückfrage muss dem Entwurf folgen und für die Prüfung sichtbar sein.
//
// Neu vergebene data-testid (über Rolle/Text nicht eindeutig greifbar, weil dieselben Zahlen
// auch an den Achsen und in der Lotung der Karte stehen und die Signaturen Eigentext haben):
//   - detail-cartouche              Behälter der Kartusche
//   - detail-impact                 Wert der Spalte "Impact"
//   - detail-effort                 Wert der Spalte "Effort"
//   - detail-revier                 Wert der Spalte "Revier"
//   - detail-outgoing               Abschnitt "Geht aus von hier"
//   - detail-incoming               Abschnitt "Führt hierher"
//   - bearing-<from>-<to>-<type>    eine Zeile eines der beiden Abschnitte, benannt nach der
//                                   Beziehung selbst (gleiche Bildung wie edge-<from>-<to>-<type>
//                                   aus F-10)
//
// Bereits vergebene Kennzeichen aus F-09 bis F-11 werden weiterverwendet: feature-node-<id>,
// feature-halo-<id>, edge-<from>-<to>-<type>.
//
// Zu erwartende Rückwirkung auf F-11 (dem Orchestrator gemeldet, nicht selbst geändert):
// e2e/F-11-selektion.spec.ts wählt in `clickBlankArea` die obere rechte Ecke der Plotfläche als
// "freie Fläche" — genau dort liegt laut F-15 und design/03-seekarte.html die Kartusche. Sobald
// sie gerendert wird, fängt sie diesen Klick ab. Der Test dieser Datei klickt deshalb unten
// rechts. Die Anpassung in F-11 ist eine Teständerung und damit dem Orchestrator vorbehalten.
//
// Der Knopf "Als Start verwenden" startet den Verbindungsvorgang aus F-16; dessen sichtbare
// Markierung des Startpunkts gehört ausdrücklich zu F-16 und wird hier nicht geprüft. Ebenso
// bleibt das Bottom Sheet unter 768 px laut F-15 der Umsetzung in F-22 vorbehalten; bei 375 px
// wird deshalb nur geprüft, dass die Kartusche erreichbar bleibt und die Seite nicht waagerecht
// überläuft.

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

/** Liest den aktuell in LocalStorage gespeicherten Kartenzustand (Muster aus F-11, F-13). */
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

/**
 * Karte nach dem Vorbild aus design/03-seekarte.html. "Rollen & Rechte" hat drei ausgehende
 * (benötigt, hängt zusammen, schließt aus) und eine eingehende Beziehung; "Dark Mode" hat gar
 * keine; "Öffentliche API" hat nur eine ausgehende.
 */
const SEEKARTE_FEATURES: SeedFeature[] = [
	{ id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 },
	{ id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 },
	{ id: 'audit', label: 'Audit-Log', impact: 5, effort: 5 },
	{ id: 'gast', label: 'Gastzugang', impact: 3, effort: 2 },
	{ id: 'api', label: 'Öffentliche API', impact: 8, effort: 21 },
	{ id: 'dark', label: 'Dark Mode', impact: 2, effort: 3 }
];

const SEEKARTE_RELATIONS: SeedRelation[] = [
	{ from: 'rollen', to: 'sso', type: 'requires', label: 'nutzt Identität' },
	{ from: 'rollen', to: 'audit', type: 'relates', label: 'gemeinsame Events' },
	{ from: 'rollen', to: 'gast', type: 'excludes', label: 'widerspricht sich' },
	{ from: 'api', to: 'rollen', type: 'requires' }
];

/** Lädt die Seekarte und selektiert ein Feature; liefert die Kartusche. */
async function openCartouche(page: Page, id: string): Promise<Locator> {
	await seedMap(page, SEEKARTE_FEATURES, SEEKARTE_RELATIONS);
	await page.goto('/');
	await page.getByTestId(`feature-node-${id}`).click();
	const cartouche = page.getByTestId('detail-cartouche');
	await expect(cartouche).toBeVisible();
	return cartouche;
}

/**
 * Klickt auf freie Kartenfläche (FR-46, F-11). Gewählt ist die untere rechte Ecke der
 * Plotfläche: Sie liegt außerhalb der Kartusche (oben rechts) und ist in den Karten dieser
 * Datei von keinem Feature belegt — dort läge ein Feature mit sehr hohem Aufwand und sehr
 * niedrigem Nutzen.
 */
async function clickBlankArea(page: Page): Promise<void> {
	const karte = page.getByRole('img', { name: /Streudiagramm/ });
	const box = await karte.boundingBox();
	expect(box, 'Testaufbau: Kartenfläche sollte eine Bounding Box haben').not.toBeNull();
	await karte.click({ position: { x: box!.width * 0.95, y: box!.height * 0.95 } });
}

/** Waagerechter Mittelpunkt eines Elements, für die Richtung der Pfeilspitze in einer Zeile. */
async function centerX(locator: Locator): Promise<number> {
	const box = await locator.boundingBox();
	expect(box, 'Testaufbau: Element sollte eine Bounding Box haben').not.toBeNull();
	return box!.x + box!.width / 2;
}

test.describe('F-15 · Detail-Kartusche', () => {
	// F-15-AK: "Selektion eines Features mit drei ausgehenden und einer eingehenden Beziehung
	// zeigt beide Abschnitte mit den richtigen Signaturen." PRD FR-40.
	test('zeigt zu einem Feature mit drei ausgehenden und einer eingehenden Beziehung beide Abschnitte', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		await expect(cartouche.getByRole('heading', { name: 'Rollen & Rechte' })).toBeVisible();
		await expect(cartouche.getByText('rollen', { exact: true })).toBeVisible();

		const ausgehend = page.getByTestId('detail-outgoing');
		const eingehend = page.getByTestId('detail-incoming');
		await expect(ausgehend.getByText('Geht aus von hier', { exact: true })).toBeVisible();
		await expect(eingehend.getByText('Führt hierher', { exact: true })).toBeVisible();

		await expect(page.getByTestId('bearing-rollen-sso-requires')).toBeVisible();
		await expect(page.getByTestId('bearing-rollen-audit-relates')).toBeVisible();
		await expect(page.getByTestId('bearing-rollen-gast-excludes')).toBeVisible();
		await expect(page.getByTestId('bearing-api-rollen-requires')).toBeVisible();

		// Ziel und Beschriftung stehen in der Zeile (F-15: "das Ziel und die Beschriftung nach
		// einem Mittelpunkt").
		await expect(page.getByTestId('bearing-rollen-sso-requires')).toContainText('Single Sign-On');
		await expect(page.getByTestId('bearing-rollen-sso-requires')).toContainText('nutzt Identität');
		await expect(page.getByTestId('bearing-api-rollen-requires')).toContainText('Öffentliche API');
	});

	// F-15-AK (Fortsetzung): "… mit den richtigen Signaturen." design/03-seekarte.html,
	// PRD 5.6: Die drei Arten unterscheiden sich über Linienform und Endmarke, nicht allein
	// über die Farbe.
	test('zeichnet je Zeile die Signatur ihrer Beziehungsart', async ({ page }) => {
		await openCartouche(page, 'rollen');

		const benoetigt = page.getByTestId('bearing-rollen-sso-requires').locator('svg line').first();
		await expect(benoetigt).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'ink')));
		await expect(benoetigt).toHaveCSS('stroke-dasharray', 'none');

		const haengtZusammen = page
			.getByTestId('bearing-rollen-audit-relates')
			.locator('svg line')
			.first();
		await expect(haengtZusammen).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'sea')));
		await expect(haengtZusammen).not.toHaveCSS('stroke-dasharray', 'none');

		const schliesstAus = page
			.getByTestId('bearing-rollen-gast-excludes')
			.locator('svg line')
			.first();
		await expect(schliesstAus).toHaveCSS('stroke', hexToRgb(tokenHex('light', 'magenta')));
	});

	// F-15, Abschnitt "Umfang": "Führt hierher — Eingehende Beziehungen, Signatur mit
	// Pfeilspitze nach links." Geprüft wird die Richtung, nicht die Koordinate.
	test('richtet die Pfeilspitze ausgehender Zeilen nach rechts und eingehender nach links', async ({
		page
	}) => {
		await openCartouche(page, 'rollen');

		const ausgehend = page.getByTestId('bearing-rollen-sso-requires');
		const eingehend = page.getByTestId('bearing-api-rollen-requires');

		const ausgehendeSpitze = await centerX(ausgehend.locator('svg path').first());
		const ausgehendeLinie = await centerX(ausgehend.locator('svg line').first());
		expect(
			ausgehendeSpitze,
			'Ausgehend: die Pfeilspitze liegt rechts von der Mitte der Linie'
		).toBeGreaterThan(ausgehendeLinie);

		const eingehendeSpitze = await centerX(eingehend.locator('svg path').first());
		const eingehendeLinie = await centerX(eingehend.locator('svg line').first());
		expect(
			eingehendeSpitze,
			'Eingehend: die Pfeilspitze liegt links von der Mitte der Linie'
		).toBeLessThan(eingehendeLinie);
	});

	// F-15-AK: "Ein Feature mit impact = 7 zeigt in der Lotung 7, nicht 8." PRD FR-03, FR-31.
	test('zeigt in der Lotung den Originalwert impact = 7, nicht den nächsten Wert der Schätzreihe', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'sieben', label: 'Sieben', impact: 7, effort: 5 }]);
		await page.goto('/');
		await page.getByTestId('feature-node-sieben').click();

		await expect(page.getByTestId('detail-impact')).toHaveText('7');
		await expect(page.getByTestId('detail-effort')).toHaveText('5');
	});

	// F-15-AK: "Ein versetzt gezeichnetes Feature zeigt seine Originalwerte." PRD FR-31, AK-05.
	test('zeigt bei drei versetzt gezeichneten Features die gespeicherten Originalwerte', async ({
		page
	}) => {
		await seedMap(page, [
			{ id: 'a', label: 'A', impact: 5, effort: 5 },
			{ id: 'b', label: 'B', impact: 5, effort: 5 },
			{ id: 'c', label: 'C', impact: 5, effort: 5 }
		]);
		await page.goto('/');

		// Die drei Features teilen sich ein Wertepaar und werden deshalb gegeneinander versetzt
		// gezeichnet (F-09, FR-30): drei verschiedene Zeichenpunkte.
		const punkte = await Promise.all(
			['a', 'b', 'c'].map(async (id) => {
				const knoten = page.getByTestId(`feature-node-${id}`);
				return `${await knoten.getAttribute('cx')}|${await knoten.getAttribute('cy')}`;
			})
		);
		expect(new Set(punkte).size, 'Alle drei Features werden versetzt gezeichnet').toBe(3);

		// Selektiert wird das zuletzt gezeichnete Feature — die versetzten Beschriftungen der
		// Gruppe überdecken einander, nur der oberste Punkt ist zuverlässig anklickbar.
		await page.getByTestId('feature-node-c').click();

		await expect(page.getByTestId('detail-impact')).toHaveText('5');
		await expect(page.getByTestId('detail-effort')).toHaveText('5');

		// FR-31: Der Versatz ist rein visuell, die gespeicherten Werte bleiben unverändert.
		const stored = await readStoredMap(page);
		expect(stored.features.find((f) => f.id === 'c')).toMatchObject({ impact: 5, effort: 5 });
	});

	// F-15, Abschnitt "Fachregeln": "Das Revier wird über quadrantOf mit dem aktuellen
	// domainMax bestimmt und in der Sprache der Oberfläche benannt." features/README.md,
	// Präzisierung 1: Schwelle ist domainMax / 2.
	test('benennt das Revier des selektierten Features in der Sprache der Oberfläche', async ({
		page
	}) => {
		// domainMax = 22 (größter Wert 21, plus 1), Schwelle also 11: Impact 13 hoch,
		// Effort 8 niedrig — Quick Wins.
		await openCartouche(page, 'rollen');
		await expect(page.getByTestId('detail-revier')).toHaveText('Quick Wins');

		// Vor dem nächsten Klick auf die Karte wird die Selektion aufgehoben, damit die
		// Kartusche das anzuklickende Feature nicht verdeckt.
		await page.keyboard.press('Escape');

		// Impact 8 niedrig, Effort 21 hoch — Vermeiden.
		await page.getByTestId('feature-node-api').click();
		await expect(page.getByTestId('detail-revier')).toHaveText('Vermeiden');
		await page.keyboard.press('Escape');

		// Impact 2 und Effort 3, beide niedrig — Nebenbei.
		await page.getByTestId('feature-node-dark').click();
		await expect(page.getByTestId('detail-revier')).toHaveText('Nebenbei');
	});

	// F-15-AK: "Löschen bei bestehenden Beziehungen fragt zurück und nennt die Anzahl; Abbruch
	// ändert nichts." PRD FR-05.
	test('fragt vor dem Löschen mit Beziehungen zurück, nennt deren Anzahl und ändert bei Abbruch nichts', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		await cartouche.getByRole('button', { name: 'Löschen' }).click();

		const rueckfrage = page.getByRole('dialog');
		await expect(rueckfrage).toBeVisible();
		// Vier Kanten sind betroffen: drei ausgehende und eine eingehende.
		await expect(rueckfrage).toContainText('4');

		await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
		await expect(rueckfrage).not.toBeVisible();

		await expect(page.getByTestId('feature-node-rollen')).toBeVisible();
		await expect(page.getByTestId('edge-rollen-sso-requires')).toBeVisible();

		const stored = await readStoredMap(page);
		expect(stored.features.map((f) => f.id)).toContain('rollen');
		expect(stored.relations).toHaveLength(4);
	});

	// F-15, Abschnitt "Verhalten": "… danach deleteFeature." PRD AK-09: Löschen entfernt alle
	// zugehörigen Kanten.
	test('löscht das Feature samt seiner Kanten, sobald die Rückfrage bestätigt wird', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		await cartouche.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();

		await expect(page.getByTestId('feature-node-rollen')).toHaveCount(0);
		await expect(page.getByTestId('edge-rollen-sso-requires')).toHaveCount(0);
		await expect(page.getByTestId('edge-api-rollen-requires')).toHaveCount(0);
		// Ohne Selektion verschwindet die Kartusche (F-15, Abschnitt "Verhalten").
		await expect(page.getByTestId('detail-cartouche')).not.toBeVisible();

		const stored = await readStoredMap(page);
		expect(stored.features.map((f) => f.id)).not.toContain('rollen');
		expect(stored.relations).toHaveLength(0);
	});

	// PRD FR-05: Die Rückfrage ist an bestehende Beziehungen geknüpft — ohne sie wird direkt
	// gelöscht.
	test('löscht ein Feature ohne Beziehungen ohne Rückfrage', async ({ page }) => {
		const cartouche = await openCartouche(page, 'dark');

		await cartouche.getByRole('button', { name: 'Löschen' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-dark')).toHaveCount(0);
	});

	// F-15-AK: "Klick auf ein Beziehungsziel wechselt die Selektion, und die Hervorhebung auf
	// der Karte wandert mit." F-15, Abschnitt "Verhalten".
	test('wechselt bei Klick auf ein Beziehungsziel die Selektion samt Hervorhebung auf der Karte', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');
		await expect(page.getByTestId('feature-halo-rollen')).toBeVisible();

		await page
			.getByTestId('bearing-rollen-sso-requires')
			.getByRole('button', { name: 'Single Sign-On' })
			.click();

		await expect(cartouche.getByRole('heading', { name: 'Single Sign-On' })).toBeVisible();
		await expect(page.getByTestId('feature-halo-sso')).toBeVisible();
		await expect(page.getByTestId('feature-halo-rollen')).toHaveCount(0);
	});

	// F-15, Abschnitt "Verhalten": "Klick auf ein Beziehungsziel" gilt in beiden Abschnitten —
	// auch die eingehende Zeile führt zu ihrer Quelle.
	test('wechselt auch über eine eingehende Zeile die Selektion auf deren Quelle', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		await page
			.getByTestId('bearing-api-rollen-requires')
			.getByRole('button', { name: 'Öffentliche API' })
			.click();

		await expect(cartouche.getByRole('heading', { name: 'Öffentliche API' })).toBeVisible();
		await expect(page.getByTestId('feature-halo-api')).toBeVisible();
	});

	// F-15, Abschnitt "Verhalten": "Selektion wechselt — Inhalt wechselt mit, ohne dass die
	// Kartusche verschwindet."
	test('wechselt bei neuer Selektion den Inhalt, ohne dass die Kartusche verschwindet', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');
		await expect(page.getByTestId('detail-impact')).toHaveText('13');

		await page.getByTestId('feature-node-gast').click();

		await expect(cartouche).toBeVisible();
		await expect(cartouche.getByRole('heading', { name: 'Gastzugang' })).toBeVisible();
		await expect(page.getByTestId('detail-impact')).toHaveText('3');
		await expect(page.getByTestId('detail-effort')).toHaveText('2');
		await expect(cartouche.getByRole('heading', { name: 'Rollen & Rechte' })).toHaveCount(0);
	});

	// F-15, Abschnitt "Verhalten": "Selektion aufgehoben — Kartusche wird ausgeblendet."
	// PRD FR-46: ESC und Klick auf freie Fläche heben die Selektion auf (F-11).
	test('blendet die Kartusche aus, sobald die Selektion aufgehoben wird', async ({ page }) => {
		await openCartouche(page, 'rollen');

		await page.keyboard.press('Escape');
		await expect(page.getByTestId('detail-cartouche')).not.toBeVisible();

		await page.getByTestId('feature-node-rollen').click();
		await expect(page.getByTestId('detail-cartouche')).toBeVisible();

		await clickBlankArea(page);
		await expect(page.getByTestId('detail-cartouche')).not.toBeVisible();
	});

	// F-15, Abschnitt "Verhalten": "Bearbeiten — Öffnet das Formular aus F-13, vorbefüllt."
	// features/STATUS.md, Auflage zu F-15: der Knopf aus F-13 wird übernommen, nicht
	// danebengestellt — es gibt ihn deshalb genau einmal, und zwar in der Kartusche.
	test('öffnet über den einzigen Knopf "Bearbeiten" der Seite das vorbefüllte Formular aus F-13', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(1);
		await expect(cartouche.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(1);

		await cartouche.getByRole('button', { name: 'Bearbeiten' }).click();

		const dialog = page.getByRole('dialog', { name: 'Feature bearbeiten' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByLabel('Anzeigename')).toHaveValue('Rollen & Rechte');
		await expect(dialog.getByLabel('Kennung')).toHaveValue('rollen');
	});

	// F-15, Abschnitt "Verhalten": "Als Start verwenden — Startet den Verbindungsvorgang
	// (F-16)." Die sichtbare Markierung des Startpunkts gehört zu F-16; hier wird geprüft, dass
	// der Knopf vorhanden ist und der Vorgang die Selektion nicht verliert (F-16, Abschnitt
	// "Abbruch": erst ESC beendet den Vorgang, ein zweites ESC die Selektion).
	test('bietet "Als Start verwenden" an, ohne die Selektion zu verlieren', async ({ page }) => {
		const cartouche = await openCartouche(page, 'rollen');

		await cartouche.getByRole('button', { name: 'Als Start verwenden' }).click();

		await expect(cartouche).toBeVisible();
		await expect(cartouche.getByRole('heading', { name: 'Rollen & Rechte' })).toBeVisible();
		await expect(page.getByTestId('feature-halo-rollen')).toBeVisible();
	});

	// F-15-AK: "Ein Feature ohne Beziehungen zeigt einen erklärenden Hinweis statt leerer
	// Abschnitte." F-15, Abschnitt "Umfang": "steht dort Keine Beziehungen in --ink-soft".
	test('zeigt für ein Feature ohne Beziehungen den Hinweis "Keine Beziehungen" statt leerer Abschnitte', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'dark');

		const hinweis = cartouche.getByText('Keine Beziehungen', { exact: true });
		await expect(hinweis).toBeVisible();
		await expect(hinweis).toHaveCSS('color', hexToRgb(tokenHex('light', 'ink-soft')));

		await expect(page.getByTestId('detail-outgoing')).toHaveCount(0);
		await expect(page.getByTestId('detail-incoming')).toHaveCount(0);
		await expect(cartouche.getByText('Geht aus von hier', { exact: true })).toHaveCount(0);
		await expect(cartouche.getByText('Führt hierher', { exact: true })).toHaveCount(0);
	});

	// F-15, Abschnitt "Umfang": "Hat ein Feature keine Beziehungen, entfällt der jeweilige
	// Abschnitt." Geprüft an einem Feature mit nur ausgehender Beziehung.
	test('lässt den Abschnitt "Führt hierher" entfallen, wenn es keine eingehende Beziehung gibt', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'api');

		await expect(page.getByTestId('detail-outgoing')).toBeVisible();
		await expect(page.getByTestId('bearing-api-rollen-requires')).toBeVisible();
		await expect(page.getByTestId('detail-incoming')).toHaveCount(0);
		await expect(cartouche.getByText('Führt hierher', { exact: true })).toHaveCount(0);
		await expect(cartouche.getByText('Keine Beziehungen', { exact: true })).toHaveCount(0);
	});

	// PRD NFR-21, AK-13: Anzeigenamen werden ausschließlich als Text gerendert, niemals als
	// Markup.
	test('rendert einen Anzeigenamen mit Markup als sichtbaren Text ohne Skriptausführung', async ({
		page
	}) => {
		const ausfuehrungen: string[] = [];
		page.on('dialog', async (dialog) => {
			ausfuehrungen.push(dialog.message());
			await dialog.dismiss();
		});

		await seedMap(page, [
			{ id: 'xss', label: '<script>alert(1)</script>', impact: 5, effort: 5 }
		]);
		await page.goto('/');
		await page.getByTestId('feature-node-xss').click();

		const cartouche = page.getByTestId('detail-cartouche');
		await expect(
			cartouche.getByRole('heading', { name: '<script>alert(1)</script>' })
		).toBeVisible();
		expect(ausfuehrungen, 'Es darf kein Skript ausgeführt worden sein').toEqual([]);
	});

	// F-15, Abschnitt "Umfang": "Kopf — Anzeigename in Fraunces 20 px, darunter die Kennung in
	// Azeret Mono in --ink-soft." design/03-seekarte.html, `.detail h3` und `.detail .sub`.
	test('setzt den Kopf in Fraunces 20 px und die Kennung in Azeret Mono in --ink-soft', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		const ueberschrift = cartouche.getByRole('heading', { name: 'Rollen & Rechte' });
		await expect(ueberschrift).toHaveCSS('font-family', /Fraunces/);
		await expect(ueberschrift).toHaveCSS('font-size', '20px');

		const kennung = cartouche.getByText('rollen', { exact: true });
		await expect(kennung).toHaveCSS('font-family', /Azeret Mono/);
		await expect(kennung).toHaveCSS('color', hexToRgb(tokenHex('light', 'ink-soft')));
	});

	// F-15, Abschnitt "Umfang": "Lotung — Drei Spalten mit Haarlinien getrennt: Impact, Effort,
	// Revier. Werte in Fraunces 23 px, Beschriftungen in gesperrten Versalien."
	// design/03-seekarte.html, `.sounding`.
	test('zeigt die Lotung als drei Spalten mit Versal-Beschriftungen und Werten in Fraunces 23 px', async ({
		page
	}) => {
		const cartouche = await openCartouche(page, 'rollen');

		for (const beschriftung of ['Impact', 'Effort', 'Revier']) {
			const zelle = cartouche.getByText(beschriftung, { exact: true });
			await expect(zelle).toBeVisible();
			await expect(zelle).toHaveCSS('text-transform', 'uppercase');
			await expect(zelle).toHaveCSS('color', hexToRgb(tokenHex('light', 'ink-soft')));
			const abstand = await zelle.evaluate((el) => getComputedStyle(el).letterSpacing);
			expect(parseFloat(abstand), `"${beschriftung}" ist gesperrt gesetzt`).toBeGreaterThan(0);
		}

		const impact = page.getByTestId('detail-impact');
		await expect(impact).toHaveText('13');
		await expect(impact).toHaveCSS('font-family', /Fraunces/);
		await expect(impact).toHaveCSS('font-size', '23px');
		await expect(page.getByTestId('detail-effort')).toHaveText('8');

		// Drei Spalten nebeneinander: gleiche Oberkante, aufsteigende linke Kanten.
		const kaesten = await Promise.all(
			[
				page.getByTestId('detail-impact'),
				page.getByTestId('detail-effort'),
				page.getByTestId('detail-revier')
			].map((l) => l.boundingBox())
		);
		expect(kaesten.every((b) => b !== null)).toBe(true);
		expect(kaesten[0]!.x).toBeLessThan(kaesten[1]!.x);
		expect(kaesten[1]!.x).toBeLessThan(kaesten[2]!.x);
		expect(Math.abs(kaesten[0]!.y - kaesten[1]!.y)).toBeLessThanOrEqual(2);
	});

	// F-15, Abschnitt "Umfang": "Die Kartusche liegt oben rechts über der Karte, 300 px breit,
	// mit dem doppelten Rahmen aus .cartouche." design/03-seekarte.html, `.detail`,
	// `.cartouche`.
	test('liegt oben rechts über der Karte, 300 px breit, mit dem doppelten Rahmen', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		const cartouche = await openCartouche(page, 'rollen');

		const box = await cartouche.boundingBox();
		expect(box, 'Testaufbau: Kartusche sollte eine Bounding Box haben').not.toBeNull();
		expect(box!.width).toBe(300);

		// Oben rechts: in der rechten und in der oberen Hälfte des Fensters.
		expect(box!.x).toBeGreaterThan(1440 / 2);
		expect(box!.y).toBeLessThan(900 / 2);

		await expect(cartouche).toHaveCSS('border-width', '1px');
		await expect(cartouche).toHaveCSS('border-color', hexToRgb(tokenHex('light', 'rule')));
		await expect(cartouche).toHaveCSS('background-color', hexToRgb(tokenHex('light', 'paper')));
		// Doppelter Rahmen: äußerer Ring aus --paper und --hair (design: box-shadow).
		const schatten = await cartouche.evaluate((el) => getComputedStyle(el).boxShadow);
		expect(schatten).toContain(hexToRgb(tokenHex('light', 'paper')));
		expect(schatten).toContain(hexToRgb(tokenHex('light', 'hair')));
	});

	// F-15, Abschnitt "Umfang": "Aktionen — Bearbeiten, Als Start verwenden, Löschen (letzteres
	// in --magenta)." design/03-seekarte.html, `.detail .btns .rm`.
	test('zeigt die drei Aktionen, Löschen in --magenta', async ({ page }) => {
		const cartouche = await openCartouche(page, 'rollen');

		await expect(cartouche.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
		await expect(cartouche.getByRole('button', { name: 'Als Start verwenden' })).toBeVisible();

		const loeschen = cartouche.getByRole('button', { name: 'Löschen' });
		await expect(loeschen).toBeVisible();
		await expect(loeschen).toHaveCSS('color', hexToRgb(tokenHex('light', 'magenta')));
	});

	// CLAUDE.md, "QA-Abgleich": Tag- und Nachttafel. Dieselbe Kartusche muss mit den
	// Nacht-Tokens gerendert werden.
	test('rendert die Kartusche in der Nachttafel mit den Nacht-Tokens', async ({ page }) => {
		await seedMap(page, SEEKARTE_FEATURES, SEEKARTE_RELATIONS);
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await page.getByTestId('feature-node-rollen').click();
		const cartouche = page.getByTestId('detail-cartouche');
		await expect(cartouche).toBeVisible();

		await expect(cartouche).toHaveCSS('background-color', hexToRgb(tokenHex('dark', 'paper')));
		await expect(cartouche).toHaveCSS('border-color', hexToRgb(tokenHex('dark', 'rule')));
		await expect(cartouche.getByRole('button', { name: 'Löschen' })).toHaveCSS(
			'color',
			hexToRgb(tokenHex('dark', 'magenta'))
		);
		await expect(
			page.getByTestId('bearing-rollen-audit-relates').locator('svg line').first()
		).toHaveCSS('stroke', hexToRgb(tokenHex('dark', 'sea')));
	});

	// CLAUDE.md, "QA-Abgleich": Breakpoints 375, 834 und 1440 px. Das Bottom Sheet unter 768 px
	// (UI-15) ist laut F-15, Abschnitt "Verhalten", der Umsetzung in F-22 vorbehalten; geprüft
	// wird hier nur, dass die Kartusche auf jeder Breite erreichbar bleibt und die Seite nicht
	// waagerecht überläuft.
	for (const breite of BREAKPOINTS) {
		test(`bleibt bei ${breite}px sichtbar, ohne die Seite waagerecht überlaufen zu lassen`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			const cartouche = await openCartouche(page, 'rollen');

			await expect(cartouche.getByRole('heading', { name: 'Rollen & Rechte' })).toBeVisible();
			await expect(cartouche.getByRole('button', { name: 'Löschen' })).toBeVisible();

			const box = await cartouche.boundingBox();
			expect(box, 'Testaufbau: Kartusche sollte eine Bounding Box haben').not.toBeNull();
			expect(box!.width).toBeLessThanOrEqual(breite);

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
