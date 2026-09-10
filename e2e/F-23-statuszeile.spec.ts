// F-23 · Fußleiste, Hinweise, Zurücksetzen — E2E-Tests.
// Quellen: features/F-23-statuszeile.md (Abschnitte "Umfang", "Fachregeln",
// "Akzeptanzkriterien"), PRD.md (FR-70, FR-71, FR-74, FR-75, NFR-31, NFR-32, INT-05, AK-08),
// design/03-seekarte.html (Klasse `.foot`, Beispielzeile "Gespeichert 12:04 · 14 Features ·
// 9 Beziehungen · Keine Zyklen · Kurs: Rollen & Rechte → Single Sign-On → Benutzer-Login"),
// design/README.md ("Statuszeile mit Speicherzustand, Bestandsgröße und Zyklus-Hinweis"),
// features/README.md (Ubiquitous Language: "Kurs — requiresPath"), features/STATUS.md
// (Entscheidung vom 06.09. "Zyklus-Warnung AK-08 gehört zu F-23, nicht zu F-16": AK-08 ist
// vollständig Gegenstand dieser Datei, nicht von e2e/F-16-verbindungsvorgang.spec.ts).
//
// Neu vergebene data-testid (über Rolle/Text nicht eindeutig greifbar, siehe Kopfkommentare
// von StatusBar.svelte und NoticeBar.svelte):
//   - status-save        Speicherzustand-Feld der Fußleiste — eigener Kennzeichner, weil der
//                         Text ("Speicher voll" u. a.) sich mit anderswo vorkommenden Wörtern
//                         überschneiden könnte und die Farbprüfung (--magenta) ein einzelnes,
//                         eindeutiges Element braucht.
//   - status-inventory   Bestand-Feld (Feature-/Beziehungszahl).
//   - status-cycles      Zyklen-Feld — Text "Keine Zyklen" oder anklickbarer Knopf
//                         "n Zyklus-Warnung(en)" (letzterer zusätzlich über
//                         getByRole('button', { name: /Zyklus-Warnung/ }) erreichbar).
//   - status-course      Kurs-Feld.
//   - notice-bar         Hinweisband über der Karte (Behälter), analog zu `connect-banner`
//                         aus F-16 (src/routes/+page.svelte).
//
// Alles andere über Rolle/Text: Fußleiste als Landmark `role="contentinfo"` (natives
// `<footer>`, bereits in src/routes/+page.svelte vorhanden und in e2e/F-01-projektgeruest.spec.ts
// sowie e2e/F-04-persistenz.spec.ts geprüft); Schließen-Knopf des Hinweisbands
// "Hinweis schließen"; Menüeintrag "Karte zurücksetzen" im bereits bestehenden Menü "Ansicht"
// (design/03-seekarte.html Zeile 225, src/routes/+page.svelte `.view-menu-panel`, wie bereits
// "Ganze Karte zeigen" aus F-12); Rückfrage-Dialog `role="alertdialog"` mit dem zugänglichen
// Namen "Karte zurücksetzen", Knöpfe "Zurücksetzen" (bestätigt) und "Abbrechen" (verwirft) —
// dasselbe Muster wie die Löschrückfrage aus F-14/F-15/F-18 (features/STATUS.md, Entscheidungen
// des Orchestrators zu FR-05/FR-62).
//
// Designentscheidungen dieses Test-Agenten (in den Quellen nicht mit Wortlaut oder Algorithmus
// festgelegt):
//   1. Zugänglicher Name und Knopfbeschriftungen der Rückfrage zu "Karte zurücksetzen"
//      ("Karte zurücksetzen" / "Zurücksetzen" / "Abbrechen") — FR-75 nennt nur "eine
//      Rückfrage, die die Zahl der Features nennt und auf den Export als Sicherung hinweist",
//      keinen Wortlaut. Angelehnt an das bereits etablierte Muster "Feature löschen" /
//      "Löschen" / "Abbrechen" (F-14/F-15).
//   2. Wortlaut der drei Hinweisband-Texte (recovered/unavailable/quotaExceeded) — geprüft wird
//      nur, dass die jeweilige Kernaussage vorkommt (per Teiltext/Regex), nicht ein vollständiger
//      Satz, damit der Feature-Agent den genauen Wortlaut frei formulieren kann.
//   3. "Erneutes Auftreten" des Hinweisbands (siehe Kopfkommentar von NoticeBar.svelte): ein
//      voller Zustandswechsel (z. B. quotaExceeded → ready → quotaExceeded) lässt ein zuvor
//      geschlossenes Hinweisband erneut erscheinen; ein wiederholter, ununterbrochener
//      Schreibfehlschlag im selben Zustand tut es nicht (wird hier nicht separat geprüft, weil
//      ein Svelte-`writable`-Store bei unverändertem Wert ohnehin nicht erneut benachrichtigt —
//      es gäbe für die Komponente kein Ereignis, auf das sie reagieren könnte).
//   4. Bei mehreren ausgehenden requires-Kanten des selektierten Features folgt der Kurs dem
//      alphabetisch kleinsten Ziel (dieselbe Tie-Break-Regel wie `findRequiresCycles`, F-07) —
//      hier nicht eigens über E2E geprüft (siehe statusText.test.ts), weil das Bilden der Kette
//      reine Formatierungslogik ist.
//
// Zur Simulation von NFR-31 (QuotaExceededError) und NFR-32 (localStorage nicht erreichbar)
// wird wie in src/lib/store/persistence.test.ts (F-04, Unit-Ebene) `Storage.prototype.setItem`
// bzw. der Zugriff auf `window.localStorage` überschrieben — hier per `page.addInitScript`,
// weil es sich um reale Browser-APIs handelt, nicht um Mocks der Anwendung selbst.

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

/** Liest den Hexwert eines Farbtokens aus src/app.css (Tag- oder Nachttafel), wie in
 * e2e/F-16-verbindungsvorgang.spec.ts und e2e/F-13-feature-formular.spec.ts. */
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

/** Grundkarte: drei unabhängige Features ohne Beziehungen (wie in e2e/F-16-verbindungsvorgang.spec.ts). */
const BASE_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'Feature A', impact: 3, effort: 2 },
	{ id: 'b', label: 'Feature B', impact: 5, effort: 3 },
	{ id: 'c', label: 'Feature C', impact: 2, effort: 5 }
];

/** Öffnet das Anlegeformular über den Knopf "+ Feature" im Kopfband (wie in
 * e2e/F-13-feature-formular.spec.ts) und legt ein minimales Feature an. */
async function createFeatureViaForm(page: Page, id: string): Promise<void> {
	await page.getByRole('button', { name: '+ Feature' }).click();
	const dialog = page.getByRole('dialog', { name: 'Feature anlegen' });
	await dialog.getByLabel('Anzeigename').fill(id);
	await dialog.getByLabel('Kennung').fill(id);
	await dialog.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Öffnet das Menü "Ansicht" im Kopfband (wie in e2e/F-12-zoom-pan.spec.ts). */
async function openViewMenu(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Ansicht' }).click();
}

/** Öffnet das Kontextmenü auf einem Feature per Rechtsklick (wie in
 * e2e/F-16-verbindungsvorgang.spec.ts). */
async function openFeatureMenu(page: Page, id: string): Promise<Locator> {
	const node = page.getByTestId(`feature-node-${id}`);
	const box = await node.boundingBox();
	expect(box, 'Testaufbau: Feature sollte eine Bounding Box haben').not.toBeNull();
	await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
	await page.mouse.down({ button: 'right' });
	await page.mouse.up({ button: 'right' });
	const menu = page.getByRole('menu', { name: 'Feature-Menü' });
	await expect(menu).toBeVisible();
	return menu;
}

/** Legt über zwei Rechtsklicke (F-16) eine requires-Beziehung von `fromId` nach `toId` an. */
async function connectRequires(page: Page, fromId: string, toId: string): Promise<void> {
	const startMenu = await openFeatureMenu(page, fromId);
	await startMenu.getByRole('menuitem', { name: 'Als Start verwenden' }).click();
	const targetMenu = await openFeatureMenu(page, toId);
	await targetMenu.getByRole('menuitem', { name: 'Als Ziel verwenden' }).click();
	const dialog = page.getByRole('dialog', { name: 'Beziehung anlegen' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
	await dialog.getByRole('button', { name: 'Anlegen' }).click();
	await expect(dialog).toHaveCount(0);
}

test.describe('F-23 · Fußleiste, Hinweise, Zurücksetzen', () => {
	test.describe('Bestand (F-23-AK: "zeigt jederzeit die richtige Zahl an Features und Beziehungen")', () => {
		for (const width of BREAKPOINTS) {
			test(`zeigt bei ${width}px die korrekte Zahl an Features und Beziehungen`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 900 });
				await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
				await page.goto('/');

				await expect(page.getByRole('contentinfo')).toBeVisible();
				await expect(page.getByTestId('status-inventory')).toHaveText(
					'3 Features · 1 Beziehung'
				);
			});
		}

		// F-23-AK: "jederzeit" — aktualisiert sich sofort nach einer Änderung, ohne Neuladen.
		test('aktualisiert den Bestand sofort nach dem Anlegen eines Features', async ({ page }) => {
			await seedMap(page, []);
			await page.goto('/');

			await expect(page.getByTestId('status-inventory')).toHaveText('0 Features · 0 Beziehungen');

			await createFeatureViaForm(page, 'x');

			await expect(page.getByTestId('status-inventory')).toHaveText('1 Feature · 0 Beziehungen');
		});
	});

	// F-23-AK: "Nach einer Änderung wechselt der Speicherzustand auf 'Wird gespeichert …' und
	// danach auf 'Gespeichert' mit aktueller Uhrzeit." FR-70, FR-71.
	test('wechselt den Speicherzustand nach einer Änderung auf "Wird gespeichert …" und danach auf "Gespeichert HH:MM"', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const status = page.getByTestId('status-save');
		// Bereits der allererste, automatische Schreibvorgang (FR-70) durchläuft beide Phasen.
		await expect(status).toHaveText(/^Gespeichert \d{2}:\d{2}$/, { timeout: 3000 });

		await createFeatureViaForm(page, 'x');
		await expect(status).toHaveText('Wird gespeichert …');
		await expect(status).toHaveText(/^Gespeichert \d{2}:\d{2}$/, { timeout: 3000 });
	});

	test.describe('Zyklen (INT-05, AK-08 — features/STATUS.md, Entscheidung vom 06.09.: gehört vollständig zu F-23)', () => {
		// F-23-AK: "Das Anlegen von A → B → A erzeugt eine sichtbare Zyklus-Warnung; die beiden
		// Kanten sind auf der Karte in Warnfarbe gezeichnet (AK-08)." Ohne jede Selektion (F-23,
		// Abschnitt "Umfang": "auch ohne Selektion").
		test('erzeugt beim Anlegen von A → B → A eine sichtbare Zyklus-Warnung mit Kanten in --magenta', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
			await page.goto('/');

			await expect(page.getByTestId('status-cycles')).toHaveText('Keine Zyklen');

			await connectRequires(page, 'b', 'a');

			await expect(page.getByTestId('status-cycles')).toHaveText('1 Zyklus-Warnung');
			const magenta = hexToRgb(tokenHex('light', 'magenta'));
			await expect(page.getByTestId('edge-a-b-requires')).toHaveCSS('stroke', magenta);
			await expect(page.getByTestId('edge-b-a-requires')).toHaveCSS('stroke', magenta);
		});

		// F-23-AK: "Das Auflösen des Zyklus lässt die Warnung verschwinden."
		test('lässt die Zyklus-Warnung nach dem Auflösen des Zyklus verschwinden', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'a', to: 'b', type: 'requires' },
				{ from: 'b', to: 'a', type: 'requires' }
			]);
			await page.goto('/');

			await expect(page.getByTestId('status-cycles')).toHaveText('1 Zyklus-Warnung');

			await page.getByTestId('feature-node-b').click();
			const cartouche = page.getByTestId('detail-cartouche');
			await expect(cartouche).toBeVisible();
			await cartouche
				.getByTestId('bearing-b-a-requires')
				.getByRole('button', { name: 'Entfernen', exact: true })
				.click();

			await expect(page.getByTestId('status-cycles')).toHaveText('Keine Zyklen');
			await expect(page.getByTestId('edge-a-b-requires')).not.toHaveCSS(
				'stroke',
				hexToRgb(tokenHex('light', 'magenta'))
			);
		});

		// F-23, Abschnitt "Umfang": "Ein Klick auf die Zyklus-Warnung selektiert das erste
		// Feature des Zyklus und hebt dessen Kanten hervor." Der Zyklus a→b→a wird von
		// findRequiresCycles (F-07) auf den kleinsten Bezeichner rotiert — hier "a".
		test('selektiert bei Klick auf die Zyklus-Warnung das erste Feature des Zyklus und hebt seine Kanten hervor', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'b', to: 'a', type: 'requires' },
				{ from: 'a', to: 'b', type: 'requires' }
			]);
			await page.goto('/');

			await page.getByRole('button', { name: '1 Zyklus-Warnung' }).click();

			const cartouche = page.getByTestId('detail-cartouche');
			await expect(cartouche).toBeVisible();
			await expect(cartouche.getByRole('heading', { name: 'Feature A' })).toBeVisible();
			// Hervorhebung der Kanten des selektierten Features (F-11, bereits an anderer Stelle
			// vollständig geprüft — hier nur der Anschluss an die Selektion aus dieser Aktion).
			await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		});
	});

	// F-23-AK: "Bei Selektion zeigt die Fußleiste den Kurs; ohne Selektion bleibt das Feld leer."
	test('zeigt bei Selektion den Kurs und lässt ihn ohne Selektion leer', async ({ page }) => {
		await seedMap(
			page,
			[
				{ id: 'rollen-rechte', label: 'Rollen & Rechte', impact: 13, effort: 8 },
				{ id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 },
				{ id: 'login', label: 'Benutzer-Login', impact: 8, effort: 3 }
			],
			[
				{ from: 'rollen-rechte', to: 'sso', type: 'requires' },
				{ from: 'sso', to: 'login', type: 'requires' }
			]
		);
		await page.goto('/');

		await expect(page.getByTestId('status-course')).toHaveText('');

		await page.getByTestId('feature-node-rollen-rechte').click();
		await expect(page.getByTestId('status-course')).toHaveText(
			'Rollen & Rechte → Single Sign-On → Benutzer-Login'
		);

		await page.keyboard.press('Escape');
		await expect(page.getByTestId('status-course')).toHaveText('');
	});

	// F-23-AK: "'Karte zurücksetzen' fragt zurück, nennt die Anzahl und leert nach Bestätigung
	// Karte, Verzeichnis und Speicher." FR-75.
	test.describe('Karte zurücksetzen (FR-75)', () => {
		test('fragt zurück, nennt die Anzahl der Features und weist auf den Export hin; Abbrechen lässt die Karte unverändert', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
			await page.goto('/');

			await openViewMenu(page);
			await page.getByRole('button', { name: 'Karte zurücksetzen' }).click();

			const confirm = page.getByRole('alertdialog', { name: 'Karte zurücksetzen' });
			await expect(confirm).toBeVisible();
			await expect(confirm).toContainText('3');
			await expect(confirm).toContainText(/[Ee]xport/);

			await confirm.getByRole('button', { name: 'Abbrechen' }).click();
			await expect(confirm).toHaveCount(0);
			await expect(page.getByTestId('feature-node-a')).toBeVisible();
			await expect(page.getByTestId('status-inventory')).toHaveText('3 Features · 1 Beziehung');
		});

		test('leert nach Bestätigung Karte, Verzeichnis und Speicher', async ({ page }) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'requires' }]);
			await page.goto('/');

			await openViewMenu(page);
			await page.getByRole('button', { name: 'Karte zurücksetzen' }).click();
			const confirm = page.getByRole('alertdialog', { name: 'Karte zurücksetzen' });
			await confirm.getByRole('button', { name: 'Zurücksetzen' }).click();

			await expect(confirm).toHaveCount(0);
			await expect(page.getByTestId('feature-node-a')).toHaveCount(0);
			await expect(page.getByTestId('status-inventory')).toHaveText('0 Features · 0 Beziehungen');

			// Verzeichnis (F-14): keine Einträge mehr.
			await page.getByRole('button', { name: 'Verzeichnis' }).click();
			await expect(page.locator('[data-testid^="directory-row-"]')).toHaveCount(0);

			// Speicher (F-04): der geleerte Bestand wird ebenfalls geschrieben (FR-70).
			await expect
				.poll(
					async () => {
						const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
						return raw !== null ? JSON.parse(raw) : null;
					},
					{ timeout: 3000 }
				)
				.toEqual({ schemaVersion: 1, features: [], relations: [] });
		});
	});

	test.describe('Hinweisband (F-23, Abschnitt "Umfang": "Es ist schließbar und kehrt erst bei erneutem Auftreten zurück")', () => {
		// F-23-AK: "Ein beschädigter Speicherwert führt beim Start zu leerer Karte samt
		// Hinweisband." FR-74.
		test('zeigt bei beschädigtem Speicher eine leere Karte samt schließbarem Hinweisband', async ({
			page
		}) => {
			await page.addInitScript((key) => window.localStorage.setItem(key, '{kaputt'), STORAGE_KEY);
			await page.goto('/');

			await expect(page.getByTestId('status-inventory')).toHaveText('0 Features · 0 Beziehungen');

			const notice = page.getByTestId('notice-bar');
			await expect(notice).toBeVisible();
			await expect(notice).toContainText(/beschädigt|ersetzt/);

			await notice.getByRole('button', { name: 'Hinweis schließen' }).click();
			await expect(notice).toHaveCount(0);
		});

		// NFR-32: "läuft die App im Sitzungsmodus weiter und weist auf die fehlende Persistenz hin."
		test('zeigt den Sitzungsmodus-Hinweis, wenn localStorage nicht erreichbar ist', async ({
			page
		}) => {
			await page.addInitScript(() => {
				Object.defineProperty(window, 'localStorage', {
					configurable: true,
					get(): Storage {
						throw new DOMException('Zugriff verweigert', 'SecurityError');
					}
				});
			});
			await page.goto('/');

			await expect(page.getByTestId('status-save')).toHaveText('Nicht gespeichert — Sitzungsmodus');
			const notice = page.getByTestId('notice-bar');
			await expect(notice).toBeVisible();
			await expect(notice).toContainText(/Sitzungsmodus/);
		});

		// NFR-31: "erhält der Nutzer einen klaren Hinweis mit Aufforderung zum Export." Zusätzlich
		// F-23, Abschnitt "Umfang": das Hinweisband kehrt bei einem neuen Anlass zurück, nicht
		// bloß, weil derselbe Zustand fortbesteht.
		test('zeigt "Speicher voll" mit Exporthinweis und lässt das Hinweisband bei einem neuen Anlass zurückkehren', async ({
			page
		}) => {
			await seedMap(page, []);
			await page.addInitScript(() => {
				(window as unknown as { __forceQuotaError: boolean }).__forceQuotaError = false;
				const original = Storage.prototype.setItem;
				Storage.prototype.setItem = function (key: string, value: string) {
					if ((window as unknown as { __forceQuotaError: boolean }).__forceQuotaError) {
						throw new DOMException('Kontingent überschritten', 'QuotaExceededError');
					}
					return original.call(this, key, value);
				};
			});
			await page.goto('/');

			async function setForceQuota(value: boolean): Promise<void> {
				await page.evaluate((v) => {
					(window as unknown as { __forceQuotaError: boolean }).__forceQuotaError = v;
				}, value);
			}

			const status = page.getByTestId('status-save');
			const notice = page.getByTestId('notice-bar');

			await setForceQuota(true);
			await createFeatureViaForm(page, 'f1');

			await expect(status).toHaveText('Speicher voll', { timeout: 3000 });
			await expect(status).toHaveCSS('color', hexToRgb(tokenHex('light', 'magenta')));
			await expect(notice).toBeVisible();
			await expect(notice).toContainText(/[Ee]xport/);

			await notice.getByRole('button', { name: 'Hinweis schließen' }).click();
			await expect(notice).toHaveCount(0);

			// Erfolgreicher Schreibvorgang dazwischen — ein anderer Zustand, kein "erneutes
			// Auftreten" des vollen Speichers.
			await setForceQuota(false);
			await createFeatureViaForm(page, 'f2');
			await expect(status).toHaveText(/^Gespeichert \d{2}:\d{2}$/, { timeout: 3000 });
			await expect(notice).toHaveCount(0);

			// Neuer Anlass: der Speicher wird erneut voll — das Hinweisband kehrt zurück.
			await setForceQuota(true);
			await createFeatureViaForm(page, 'f3');
			await expect(status).toHaveText('Speicher voll', { timeout: 3000 });
			await expect(notice).toBeVisible();
		});
	});

	// Tag- und Nachttafel (CLAUDE.md, QA-Abgleich: "Funktioniert Tag- und Nachttafel").
	test('zeigt Zyklus-Kanten auch in der Nachttafel in --magenta', async ({ page }) => {
		await seedMap(page, BASE_FEATURES, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'a', type: 'requires' }
		]);
		await page.goto('/');
		await page.getByRole('button', { name: 'Nacht' }).click();

		await expect(page.getByTestId('edge-a-b-requires')).toHaveCSS(
			'stroke',
			hexToRgb(tokenHex('dark', 'magenta'))
		);
	});
});
