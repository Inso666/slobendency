// F-18 · Import-Dialog — E2E-Tests.
// Quellen: features/F-18-import.md (Abschnitte "Umfang", "Verhalten", "Fachregeln",
// "Akzeptanzkriterien"), PRD.md (FR-61, FR-62, DSL-01, DSL-02, DSL-03, NFR-21, NFR-30, AK-03,
// AK-14), design/03-seekarte.html (Kopfband-Knopf "Importieren", Zeile 223), design/README.md
// (Abschnitt "Offen, unabhängig von der Richtung": Import-Vorschau FR-61 ist noch nicht
// pixelgenau entworfen — nur die Bausteine Rahmen/Kartusche/Panel stehen fest, wie bereits bei
// RelationDialog.svelte aus F-16 vermerkt), features/README.md (Ubiquitous Language: "Karte" =
// FeatureMap).
//
// Neu vergebene data-testid (Begründung: Rolle/Text reichen hier nicht aus, siehe jeweils
// unten):
//   - import-file-input        das <input type="file">, unabhängig von seiner Sichtbarkeit
//                               ansprechbar. Ein sichtbarer Knopf "Datei wählen" triggert native
//                               Dateiauswahl, die Playwright nicht bedienen kann — der Zugriff
//                               muss auf das Eingabeelement selbst zielen (setInputFiles()).
//   - import-preview-row-<id>  eine Zeile der Feature-Vorschau. Mehrere Zeilen zeigen
//                               möglicherweise denselben Anzeigenamen nicht, aber dieselbe
//                               Lotung — ohne Kennzeichen nicht eindeutig je Feature ansprechbar.
//   - import-error-<line>      ein Eintrag der Fehlerliste (Zeilennummer, Originalzeile,
//                               Meldung). Mehrere Fehler können dieselbe Meldung tragen (DSL-03).
//   - import-error-line-<line> der anklickbare Zeilennummer-Knopf eines Fehlereintrags (F-18,
//                               Abschnitt "Umfang": "Die Zeilennummer ist anklickbar und springt
//                               im Textfeld an die Stelle").
// Alles andere wird über Rolle/Text angesprochen.
//
// Designentscheidungen dieses Test-Agenten (weder in PRD noch im Entwurf pixelgenau
// festgelegt, design/README.md bestätigt das für die Import-Vorschau ausdrücklich — dieselbe
// Lage wie bei RelationDialog.svelte, F-16):
//   - Dialogname "Karte importieren" (role="dialog"), ausgelöst über den im Entwurf bereits
//     vorhandenen Kopfband-Knopf "Importieren" (design/03-seekarte.html Zeile 223) — derselbe
//     Wortstamm wie bei FeatureModal.svelte ("+ Feature" öffnet "Feature anlegen") und
//     RelationDialog.svelte, statt den Knopftext wörtlich als Dialogname zu wiederholen.
//   - Rückfrage als role="alertdialog" mit dem in F-18 selbst im Wortlaut vorgegebenen Namen
//     "Bestehende Karte ersetzen?", Knöpfe "Ersetzen"/"Abbrechen" — dasselbe Muster wie die
//     Löschrückfrage aus F-14/F-15 (features/STATUS.md, Entscheidungen des Orchestrators zu
//     FR-05), hier auf FR-62 angewendet, statt ein zweites Bestätigungsmuster einzuführen.
//   - Formatierung "n Features · m Beziehungen" mit Einzahl/Mehrzahl wie bereits in
//     DetailCartouche.svelte (F-15, "1 Beziehung"/"n Beziehungen") und FeatureList.svelte
//     (F-14, "1 Feature"/"n Features") umgesetzt — keine dritte Schreibweise.
//
// Dem Orchestrator zu melden (siehe Abschlussbericht):
//   1. F-18s eigenes Akzeptanzkriterium verlangt, dass nach der Übernahme "Karte, Verzeichnis
//      und Fußleiste" den neuen Bestand zeigen. Die Fußleiste (StatusBar.svelte) ist erst
//      F-23s Umfang und F-18 hängt nicht von F-23 ab — aktuell ist <footer class="foot"></footer>
//      leer. Die Tests unten prüfen deshalb nur Karte und Verzeichnis; eine Prüfung der
//      Fußleiste würde einen Test erzeugen, der ohne F-23 nie grün werden kann.
//   2. AK-03 ("Export → neuer Browser-Tab → Import erzeugt eine identische Karte") setzt einen
//      Export-Dialog voraus; F-19 (Export-Dialog) ist nicht Teil der F-18-Abhängigkeiten und
//      noch nicht umgesetzt. Der Round-Trip-Test unten erzeugt den DSL-Text stattdessen direkt
//      über serialize() aus src/lib/dsl/serializer.ts (F-06, bereits gemergt) — derselben
//      Funktion, die der künftige Export-Dialog aufrufen wird — statt eine zweite Übersetzung
//      zu erfinden (features/README.md, Leitplanke 3), und öffnet einen zweiten, unabhängigen
//      Browser-Kontext als "frischen Tab".

import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMA_VERSION } from '../src/lib/model/types';
import type { Feature, FeatureMap, Relation } from '../src/lib/model/types';
import { serialize } from '../src/lib/dsl/serializer';

const STORAGE_KEY = 'featuremap.map';

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04),
 * wie bereits in e2e/F-13-feature-formular.spec.ts und den folgenden Feature-Tests. */
async function seedMap(
	page: Page,
	features: SeedFeature[],
	relations: SeedRelation[] = []
): Promise<void> {
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

/** Liest den aktuell in LocalStorage gespeicherten Kartenzustand (Muster aus F-11/F-13). */
async function readStoredMap(
	page: Page
): Promise<{ features: SeedFeature[]; relations: SeedRelation[] }> {
	const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
	expect(raw, 'Testaufbau: LocalStorage sollte eine Karte enthalten').not.toBeNull();
	return JSON.parse(raw!);
}

function doc(...lines: string[]): string {
	return lines.join('\n');
}

/** Öffnet den Import-Dialog über den Kopfband-Knopf "Importieren" (design/03-seekarte.html). */
async function openImportDialog(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Importieren' }).click();
	return page.getByRole('dialog', { name: 'Karte importieren' });
}

function textarea(dialog: Locator): Locator {
	return dialog.getByRole('textbox');
}

function uebernehmenButton(dialog: Locator): Locator {
	return dialog.getByRole('button', { name: 'Übernehmen' });
}

/** Erzeugt eine temporäre Datei mit der übergebenen Endung und dem übergebenen Inhalt. */
function writeTempFile(content: string, extension: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'f18-import-'));
	const path = join(dir, `dokument${extension}`);
	writeFileSync(path, content, 'utf-8');
	return path;
}

/** Zeichenindex des Zeilenanfangs (1-basiert wie ParseError.line) innerhalb von `text`. */
function lineStartIndex(text: string, line: number): number {
	const lines = text.split('\n');
	let index = 0;
	for (let i = 0; i < line - 1; i += 1) {
		index += lines[i].length + 1; // +1 für den entfernten "\n"
	}
	return index;
}

/** Baut aus Test-Fixtures eine FeatureMap, wie sie parse()/serialize() erwarten (für den
 * AK-03-Round-Trip-Test, siehe Kommentar am Dateianfang, Punkt 2). */
function buildMap(features: Feature[], relations: Relation[]): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

test.describe('F-18 · Import-Dialog', () => {
	// AK: "Ein gültiges Dokument wird übernommen; Karte, Verzeichnis … zeigen den neuen Bestand
	// ohne Neuladen." (Fußleiste bewusst ausgespart, siehe Kommentar am Dateianfang, Punkt 1.)
	test('übernimmt ein gültiges Dokument und zeigt den neuen Bestand auf Karte und im Verzeichnis ohne Neuladen', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(
			doc(
				'featuremap v1',
				'Login["Benutzer-Login"] :: impact=8, effort=3',
				'SSO["Single Sign-On"]   :: impact=5, effort=13',
				'SSO --> Login'
			)
		);

		await expect(dialog.getByText('2 Features · 1 Beziehung', { exact: true })).toBeVisible();
		await expect(uebernehmenButton(dialog)).toBeEnabled();
		await uebernehmenButton(dialog).click();

		// Karte leer → Übernehmen ersetzt direkt, keine Rückfrage (F-18, Abschnitt "Verhalten").
		await expect(page.getByRole('alertdialog')).toHaveCount(0);
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-Login')).toBeVisible();
		await expect(page.getByTestId('feature-node-SSO')).toBeVisible();

		// Verzeichnis (F-14) liest denselben Store — ohne Neuladen aktuell.
		await page.getByRole('button', { name: 'Verzeichnis' }).click();
		await expect(page.getByRole('complementary', { name: 'Verzeichnis' }).getByText('2 Features')).toBeVisible();

		// Persistenz (F-04) schreibt den neuen Bestand.
		await expect
			.poll(async () => (await readStoredMap(page)).features.length, { timeout: 2000 })
			.toBe(2);
	});

	// AK-03 (PRD): "Export → neuer Browser-Tab → Import erzeugt eine identische Map." F-19
	// (Export-Dialog) existiert noch nicht (siehe Kommentar am Dateianfang, Punkt 2) — der
	// DSL-Text kommt deshalb direkt aus serialize() (F-06), der "frische Tab" aus einem zweiten
	// BrowserContext.
	test('Import eines exportierten Dokuments in einem frischen Tab erzeugt eine identische Karte (AK-03)', async ({
		browser
	}) => {
		const original = buildMap(
			[
				{ id: 'Login', label: 'Benutzer-Login', impact: 8, effort: 3 },
				{ id: 'SSO', label: 'Single Sign-On', impact: 5, effort: 13 },
				{ id: 'Export', impact: 3, effort: 2 }
			],
			[
				{ from: 'SSO', to: 'Login', type: 'requires', label: 'nutzt Session' },
				{ from: 'Export', to: 'Login', type: 'relates' }
			]
		);
		const dslText = serialize(original);

		const context = await browser.newContext();
		const freshTab = await context.newPage();
		await seedMap(freshTab, []);
		await freshTab.goto('/');

		const dialog = await openImportDialog(freshTab);
		await textarea(dialog).fill(dslText);
		await expect(uebernehmenButton(dialog)).toBeEnabled();
		await uebernehmenButton(dialog).click();

		// Persistenz (F-04) schreibt den neuen Bestand über einen 400-ms-Debounce
		// (scheduleWrite) — vor dem Lesen aus LocalStorage muss darauf gewartet werden, wie im
		// Schwestertest oben.
		await expect
			.poll(async () => (await readStoredMap(freshTab)).features.length, { timeout: 2000 })
			.toBe(original.features.length);

		const stored = await readStoredMap(freshTab);
		const byId = (list: { id?: string; from?: string; to?: string }[]) =>
			[...list].sort((a, b) => (a.id ?? `${a.from}${a.to}`).localeCompare(b.id ?? `${b.from}${b.to}`));

		expect(byId(stored.features)).toEqual(byId(original.features));
		expect(byId(stored.relations)).toEqual(byId(original.relations));

		await context.close();
	});

	// AK-14 (PRD): "Import mit Referenz auf ein unbekanntes Feature liefert eine zeilengenaue
	// Fehlermeldung; der Bestand bleibt unverändert." INT-02-Meldung wörtlich aus
	// src/lib/model/validation.ts.
	test('zeigt bei einer Beziehung auf ein unbekanntes Feature eine zeilengenaue Fehlermeldung und lässt den Bestand unverändert (AK-14)', async ({
		page
	}) => {
		await seedMap(page, [{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		const relationLine = 'A --> Unbekannt';
		await textarea(dialog).fill(doc('featuremap v1', 'A :: impact=1, effort=1', relationLine));

		const entry = dialog.getByTestId('import-error-3');
		await expect(entry).toBeVisible();
		await expect(entry.getByText(relationLine, { exact: true })).toBeVisible();
		await expect(entry.getByText('Ziel der Beziehung existiert nicht')).toBeVisible();
		await expect(uebernehmenButton(dialog)).toBeDisabled();

		// Bestand unverändert (DSL-02): weder im laufenden Store noch in der Persistenz.
		await expect(page.getByTestId('feature-node-bestand')).toBeVisible();
		await expect(page.getByTestId('feature-node-A')).toHaveCount(0);
		expect((await readStoredMap(page)).features).toEqual([
			{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }
		]);
	});

	// AK: "Bei nicht leerer Karte erscheint die Rückfrage; Abbrechen lässt alles unverändert."
	test('fragt bei nicht leerer Karte zurück und lässt bei Abbrechen alles unverändert', async ({ page }) => {
		await seedMap(page, [{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(doc('featuremap v1', 'Neu :: impact=2, effort=2'));
		await uebernehmenButton(dialog).click();

		const confirm = page.getByRole('alertdialog', { name: 'Bestehende Karte ersetzen?' });
		await expect(confirm).toBeVisible();
		await confirm.getByRole('button', { name: 'Abbrechen' }).click();

		await expect(confirm).toHaveCount(0);
		// Bestand vollständig unverändert.
		await expect(page.getByTestId('feature-node-bestand')).toBeVisible();
		await expect(page.getByTestId('feature-node-Neu')).toHaveCount(0);
		expect((await readStoredMap(page)).features).toEqual([
			{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }
		]);
	});

	// Verhalten-Tabelle, Zeile "Text fehlerfrei, Karte nicht leer": "Ersetzen" führt die
	// Übernahme tatsächlich aus (Gegenstück zum Abbrechen-Test oben).
	test('ersetzt die Karte nach Bestätigung der Rückfrage', async ({ page }) => {
		await seedMap(page, [{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(doc('featuremap v1', 'Neu :: impact=2, effort=2'));
		await uebernehmenButton(dialog).click();

		const confirm = page.getByRole('alertdialog', { name: 'Bestehende Karte ersetzen?' });
		await confirm.getByRole('button', { name: 'Ersetzen' }).click();

		await expect(page.getByRole('alertdialog')).toHaveCount(0);
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-bestand')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-Neu')).toBeVisible();
	});

	// AK: "Eine hochgeladene .fmap-Datei erscheint im Textfeld und lässt sich vor der
	// Übernahme bearbeiten."
	test('übernimmt eine hochgeladene .fmap-Datei in das Textfeld und lässt sie sich vor der Übernahme bearbeiten', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const fileContent = doc('featuremap v1', 'A :: impact=1, effort=1');
		const filePath = writeTempFile(fileContent, '.fmap');

		const dialog = await openImportDialog(page);
		await expect(dialog.getByRole('button', { name: 'Datei wählen' })).toBeVisible();
		await dialog.getByTestId('import-file-input').setInputFiles(filePath);

		await expect(textarea(dialog)).toHaveValue(fileContent);

		// Vor der Übernahme bearbeitbar (F-18, Abschnitt "Umfang").
		await textarea(dialog).fill(doc('featuremap v1', 'A :: impact=1, effort=1', 'B :: impact=2, effort=2'));
		await expect(dialog.getByText('2 Features · 0 Beziehungen', { exact: true })).toBeVisible();
	});

	// F-18, Abschnitt "Umfang": Datei-Upload gilt gleichermaßen für .txt-Dateien.
	test('übernimmt eine hochgeladene .txt-Datei ebenso in das Textfeld', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const fileContent = doc('featuremap v1', 'A :: impact=1, effort=1');
		const filePath = writeTempFile(fileContent, '.txt');

		const dialog = await openImportDialog(page);
		await dialog.getByTestId('import-file-input').setInputFiles(filePath);

		await expect(textarea(dialog)).toHaveValue(fileContent);
	});

	// AK: "Ein Dokument mit drei Fehlern zeigt drei Einträge auf einmal." (DSL-03)
	test('zeigt bei drei Fehlern drei Einträge gleichzeitig', async ({ page }) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		// Zeile 2: fehlendes Pflichtattribut "effort" (DSL-06) an A — A wird deshalb nicht
		// angelegt. Zeile 4: zweite Definition von C, bereits vergebene Kennung (INT-01,
		// erzeugt für sich genau einen Verstoß). Zeile 5: C --> C — C existiert (aus Zeile 3),
		// daher genau ein Verstoß (INT-03), nicht zusätzlich INT-02.
		await textarea(dialog).fill(
			doc(
				'featuremap v1',
				'A :: impact=1',
				'C :: impact=1, effort=1',
				'C :: impact=2, effort=2',
				'C --> C'
			)
		);

		await expect(dialog.getByTestId('import-error-2')).toBeVisible();
		await expect(dialog.getByTestId('import-error-4')).toBeVisible();
		await expect(dialog.getByTestId('import-error-5')).toBeVisible();
		await expect(uebernehmenButton(dialog)).toBeDisabled();
	});

	// F-18, Abschnitt "Umfang": "Die Zeilennummer ist anklickbar und springt im Textfeld an die
	// Stelle."
	test('springt beim Klick auf eine Fehler-Zeilennummer im Textfeld an die betroffene Stelle', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const text = doc('featuremap v1', 'A :: impact=1, effort=1', 'A --> Unbekannt');
		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(text);

		await dialog.getByTestId('import-error-line-3').click();

		const field = textarea(dialog);
		await expect(field).toBeFocused();
		const selectionStart = await field.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
		expect(selectionStart).toBe(lineStartIndex(text, 3));
	});

	// AK: "Nach der Übernahme ist keine Selektion aktiv."
	test('hebt die Selektion nach der Übernahme auf', async ({ page }) => {
		await seedMap(page, [{ id: 'alt', label: 'Altes Feature', impact: 1, effort: 1 }]);
		await page.goto('/');

		await page.getByTestId('feature-node-alt').click();
		await expect(page.getByTestId('detail-cartouche')).toBeVisible();

		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(doc('featuremap v1', 'neu :: impact=2, effort=2'));
		await uebernehmenButton(dialog).click();

		const confirm = page.getByRole('alertdialog', { name: 'Bestehende Karte ersetzen?' });
		await confirm.getByRole('button', { name: 'Ersetzen' }).click();

		await expect(page.getByTestId('detail-cartouche')).toHaveCount(0);
	});

	// DSL-02 / NFR-30: "Ein Parser-Fehler bringt die Anwendung nicht in einen inkonsistenten
	// Zustand" — nach einem gescheiterten Importversuch bleibt die Anwendung voll bedienbar und
	// wirft keine unbehandelte Ausnahme.
	test('bleibt nach einem gescheiterten Importversuch voll bedienbar (NFR-30, DSL-02)', async ({ page }) => {
		const pageErrors: Error[] = [];
		page.on('pageerror', (error) => pageErrors.push(error));

		await seedMap(page, [{ id: 'bestand', label: 'Bestehendes Feature', impact: 1, effort: 1 }]);
		await page.goto('/');

		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(doc('nicht-featuremap'));
		await expect(uebernehmenButton(dialog)).toBeDisabled();

		await dialog.getByRole('button', { name: 'Abbrechen' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		// Bestehendes Feature weiterhin selektierbar — die Anwendung ist nicht "hängengeblieben".
		await page.getByTestId('feature-node-bestand').click();
		await expect(page.getByTestId('detail-cartouche')).toBeVisible();

		expect(pageErrors, `unerwartete Seitenfehler: ${pageErrors.map(String).join('; ')}`).toHaveLength(0);
	});

	// NFR-21: "Importierter DSL-Text ist als nicht vertrauenswürdig zu behandeln. Labels …
	// werden ausschließlich als Text gerendert, niemals als HTML/SVG-Markup interpretiert."
	test('rendert einen als Anzeigename eingefügten Markup-Versuch ausschließlich als Text (NFR-21)', async ({
		page
	}) => {
		await page.addInitScript(() => {
			(window as unknown as { __xssFired: boolean }).__xssFired = false;
		});
		await seedMap(page, []);
		await page.goto('/');

		const payload = '<img src=x onerror=window.__xssFired=true>';
		const dialog = await openImportDialog(page);
		await textarea(dialog).fill(doc('featuremap v1', `boese["${payload}"] :: impact=1, effort=1`));

		// Bereits in der Vorschau darf das Markup nicht ausgeführt werden.
		await expect(dialog.getByText(payload)).toBeVisible();
		expect(await page.evaluate(() => (window as unknown as { __xssFired: boolean }).__xssFired)).toBe(
			false
		);

		await uebernehmenButton(dialog).click();

		// Und ebenso wenig nach der Übernahme auf der Karte selbst (feature-label-<id>, F-09).
		await expect(page.getByTestId('feature-label-boese')).toContainText(payload);
		expect(await page.evaluate(() => (window as unknown as { __xssFired: boolean }).__xssFired)).toBe(
			false
		);
	});
});
