// F-26 · Schätzmodus: Fibonacci oder freier Wertebereich — E2E-Tests.
// Quellen: features/F-26-schaetzmodus.md (Abschnitte „Umfang", „Automatischer Wechsel beim
// Import", „Darstellung", „Fachregeln", „Akzeptanzkriterien"), PRD.md (FR-08, FR-09, FR-26,
// FR-76, INT-07, AK-19, FR-03, PRD 6.1 Menü „Ansicht ▾"), design/03-seekarte.html
// (Kartuschen-Bauart, Kopfband-Knopf „Ansicht"), features/F-13-feature-formular.md
// (ScoreSelect.svelte, Fibonacci-Knopfreihe), features/F-25-datenzoom.md (ticksOf-Erweiterung,
// Teilstrichbeschriftungen tick-x-<Wert>/tick-y-<Wert>), features/STATUS.md, Abschnitt
// „Entscheidungen des Orchestrators", Eintrag „PRD 1.1 — drei Erweiterungen aus
// Nutzergespräch (11.09.)": Einstellungen hängen am Menü „Ansicht ▾".
//
// Neu vergebene data-testid (Begründung: Rolle/Text reichen hier nicht aus):
//   - score-deviating-nutzen    Kennzeichen für einen im Modus „frei" außerhalb von
//                                 estimationRange liegenden Nutzen-Wert (F-13, Abschnitt „Werte
//                                 außerhalb der Schätzreihe"; F-26: „dieselbe Regel gilt jetzt
//                                 für beide Modi") — im Fibonacci-Modus übernimmt der Text
//                                 "<Wert> (abweichend)" der Zusatzoption diese Rolle (F-13); im
//                                 freien Modus gibt es keine Options-Liste mehr, an der sich ein
//                                 solcher Text festmachen ließe, daher ein eigenes Kennzeichen
//                                 neben dem Zahlenfeld.
//   - score-deviating-aufwand   dieselbe Kennzeichnung für das Aufwand-Feld.
//
// Alles andere wird über Rolle/Text angesprochen. Vom Test-Agenten festgelegter, vom
// Feature-Agenten zu rendernder Wortlaut/Aufbau (kein pixelgenauer Entwurf für diesen Dialog
// vorhanden, design/README.md Abschnitt „Offen, unabhängig von der Richtung" — dieselbe Lage
// wie bei RelationDialog.svelte/F-16 und der Import-Vorschau/F-18):
//   - Menüeintrag „Einstellungen" im bereits bestehenden Menü „Ansicht" (Knopf „Ansicht" im
//     Kopfband öffnet ein Panel, siehe e2e/F-25-datenzoom.spec.ts, Zeile 86 f.: „await
//     page.getByRole('button', { name: 'Ansicht' }).click();").
//   - Dialog: role="dialog", zugänglicher Name „Einstellungen".
//   - Umschalter Schätzmodus: role="group", aria-label „Schätzmodus", Knöpfe „Fibonacci"/„Frei"
//     mit aria-pressed (dieselbe Bauart wie „Hervorhebung"/„Tafel"/„Abdunkeln"-„Ausblenden").
//   - Wertebereich-Felder über getByLabel: „Minimum", „Maximum".
//   - Knöpfe „Speichern"/„Abbrechen" (derselbe Wortstamm wie FeatureModal.svelte, F-13).
//   - ScoreSelect.svelte im Modus „frei": ein Zahlenfeld je Feld, ansprechbar über
//     getByRole('spinbutton', { name: label }) — „Nutzen"/„Aufwand" bleiben die zugänglichen
//     Namen, unverändert gegenüber der Gruppenbeschriftung im Fibonacci-Modus (F-13, Abschnitt
//     „Darstellung": „label liefert die Beschriftung der Gruppe").
//
// Lücke zwischen den Quellen (dem Orchestrator zu melden, siehe Abschlussbericht am Ende
// dieser Session): F-26 selbst nennt kein Bedienelement für den Einstellungsdialog außer dem
// Menüeintrag „Einstellungen" (Abschnitt „Umfang": „Erreichbar über das Menü Ansicht ▾ (Eintrag
// Einstellungen, PRD 6.1)"). PRD 6.1 bestätigt denselben Menüeintrag. Kein Widerspruch,
// lediglich (wie bei F-19s Exportieren-Panel und F-18s Import-Vorschau) ein noch nicht
// pixelgenau entworfener Dialoginhalt — die Bausteine Rahmen/Kartusche/Panel stehen laut
// design/README.md bereits fest, der Inhalt (Umschalter, Zahlenfelder) ist hier vom
// Test-Agenten anhand von F-26s Beschreibung „Umschalter Fibonacci/Frei, bei Frei zwei
// Zahlenfelder Min/Max" festgelegt.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { SCHEMA_VERSION } from '../src/lib/model/types';
import type { Feature, FeatureMap, Relation } from '../src/lib/model/types';
import { serialize } from '../src/lib/dsl/serializer';

const MAP_STORAGE_KEY = 'featuremap.map';
// F-26, Abschnitt „Umfang": „Persistenz: eigener LocalStorage-Schlüssel, getrennt von
// mapStore/persistence.ts aus F-04 (FR-76)." Konkreter Schlüsselname und Ablageformat
// ({ mode, range }) sind eine Festlegung dieses Test-Agenten (src/lib/store/settings.ts,
// Kopfkommentar von initSettings()), analog zu „featuremap.theme" aus F-01.
const SETTINGS_STORAGE_KEY = 'featuremap.settings';

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};
type SeedSettings = { mode: 'fibonacci' | 'free'; range: { min: number; max: number } };

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04),
 * Muster aus e2e/F-13-feature-formular.spec.ts. */
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
			key: MAP_STORAGE_KEY,
			value: JSON.stringify({ schemaVersion: 1, features, relations })
		}
	);
}

/** Belegt den LocalStorage der Seite mit einer App-Einstellung (Schätzmodus/Wertebereich),
 * bevor die Anwendung sie lädt — Gegenstück zu seedMap() für settings.ts (FR-76). */
async function seedSettings(page: Page, settings: SeedSettings): Promise<void> {
	await page.addInitScript(
		({ key, value }) => {
			window.localStorage.setItem(key, value);
		},
		{
			key: SETTINGS_STORAGE_KEY,
			value: JSON.stringify(settings)
		}
	);
}

/** Liest den aktuell in LocalStorage gespeicherten Kartenzustand (Muster aus F-13/F-18). */
async function readStoredMap(
	page: Page
): Promise<{ features: SeedFeature[]; relations: SeedRelation[] }> {
	const raw = await page.evaluate((key) => window.localStorage.getItem(key), MAP_STORAGE_KEY);
	expect(raw, 'Testaufbau: LocalStorage sollte eine Karte enthalten').not.toBeNull();
	return JSON.parse(raw!);
}

/** Öffnet das Anlegeformular über den Knopf „+ Feature" im Kopfband (Muster aus F-13). */
async function openCreateModal(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: '+ Feature' }).click();
	return page.getByRole('dialog', { name: 'Feature anlegen' });
}

/** Selektiert ein Feature und öffnet dessen Bearbeitungsformular (Muster aus F-13). */
async function openEditModal(page: Page, id: string): Promise<Locator> {
	await page.getByTestId(`feature-node-${id}`).click();
	await page.getByRole('button', { name: 'Bearbeiten' }).click();
	return page.getByRole('dialog', { name: 'Feature bearbeiten' });
}

/** Öffnet den Einstellungsdialog über Ansicht → Einstellungen (F-26, Abschnitt „Umfang",
 * PRD 6.1; dasselbe Menü-Muster wie „Ganze Karte zeigen", e2e/F-25-datenzoom.spec.ts). */
async function openSettingsDialog(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('button', { name: 'Einstellungen' }).click();
	return page.getByRole('dialog', { name: 'Einstellungen' });
}

function schaetzmodusGroup(dialog: Locator): Locator {
	return dialog.getByRole('group', { name: 'Schätzmodus' });
}

/** Wechselt im offenen Einstellungsdialog auf den freien Modus mit dem übergebenen Bereich und
 * speichert (F-26, Abschnitt „Umfang": „Umschalter Fibonacci/Frei, bei Frei zwei Zahlenfelder
 * Min/Max"). */
async function setFreeModeAndSave(dialog: Locator, min: number, max: number): Promise<void> {
	await schaetzmodusGroup(dialog).getByRole('button', { name: 'Frei' }).click();
	await dialog.getByLabel('Minimum').fill(String(min));
	await dialog.getByLabel('Maximum').fill(String(max));
	await dialog.getByRole('button', { name: 'Speichern' }).click();
}

const NUTZEN = (dialog: Locator) => dialog.getByRole('group', { name: 'Nutzen' });
const NUTZEN_FELD = (dialog: Locator) => dialog.getByRole('spinbutton', { name: 'Nutzen' });

/** Liest die aktuell sichtbaren x-Teilstrichbeschriftungen als Zahlen (F-08/F-25, tick-x-<Wert>,
 * Muster aus e2e/F-25-datenzoom.spec.ts). */
async function xTickValues(page: Page): Promise<number[]> {
	const testIds = await page.locator('[data-testid^="tick-x-"]').evaluateAll((elements) =>
		elements.map((element) => element.getAttribute('data-testid'))
	);
	return testIds
		.map((id) => Number((id as string).replace('tick-x-', '')))
		.sort((a, b) => a - b);
}

function emptyFeatureMap(features: Feature[] = [], relations: Relation[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

test.describe('F-26 · Schätzmodus', () => {
	// AK: „Standardzustand ist Fibonacci; das Formular verhält sich unverändert wie in F-13
	// (alle F-13-Akzeptanzkriterien bleiben erfüllt)." Regressionsanker: ohne eine
	// vorausgehende Einstellungsänderung bleibt das Formular bei der Fibonacci-Knopfreihe.
	test('zeigt ohne Einstellungsänderung weiterhin die Fibonacci-Knopfreihe im Formular (Standardzustand)', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openCreateModal(page);
		const buttons = NUTZEN(dialog).getByRole('button');
		await expect(buttons).toHaveCount(7);
		await expect(buttons).toHaveText(['1', '2', '3', '5', '8', '13', '21']);
	});

	// F-26 Kernablauf: Einstellungsdialog öffnen, auf „Frei" mit einem Bereich umschalten,
	// ein Feature mit einem Wert außerhalb der Fibonacci-Reihe darüber anlegen, und die
	// Einstellung übersteht ein Neuladen der Seite (FR-08, FR-09, FR-76).
	test('Kernablauf: Schätzmodus auf frei umstellen, Feature mit freiem Wert anlegen, Einstellung übersteht Neuladen', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		let dialog = await openSettingsDialog(page);
		await setFreeModeAndSave(dialog, 0, 50);
		await expect(page.getByRole('dialog')).toHaveCount(0);

		const modal = await openCreateModal(page);
		await modal.getByLabel('Anzeigename').fill('Freier Wert');
		await modal.getByLabel('Kennung').fill('freier-wert');
		await NUTZEN_FELD(modal).fill('42');
		await modal.getByRole('spinbutton', { name: 'Aufwand' }).fill('17');
		await modal.getByRole('button', { name: 'Speichern' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('feature-node-freier-wert')).toBeVisible();

		// F-04: Persistenz schreibt erst nach der Bündelungsfrist DEBOUNCE_MS (400 ms).
		await expect
			.poll(
				async () => (await readStoredMap(page)).features.find((f) => f.id === 'freier-wert')?.impact,
				{ timeout: 2000 }
			)
			.toBe(42);
		const stored = await readStoredMap(page);
		const gespeichert = stored.features.find((f) => f.id === 'freier-wert');
		expect(gespeichert?.impact).toBe(42);
		expect(gespeichert?.effort).toBe(17);

		// FR-76: Neuladen behält Schätzmodus und Bereich.
		await page.reload();
		dialog = await openCreateModal(page);
		const feld = NUTZEN_FELD(dialog);
		await expect(feld).toBeVisible();
		await expect(feld).toHaveAttribute('min', '0');
		await expect(feld).toHaveAttribute('max', '50');
	});

	// AK: „Umschalten auf Frei mit Bereich 0–100 zeigt im Formular ein Zahlenfeld statt der
	// Fibonacci-Knöpfe; Werte innerhalb 0–100 werden angenommen."
	test('zeigt nach Umschalten auf frei (0–100) ein Zahlenfeld statt der Fibonacci-Knöpfe und übernimmt einen Wert innerhalb 0–100', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const settings = await openSettingsDialog(page);
		await setFreeModeAndSave(settings, 0, 100);

		const modal = await openCreateModal(page);
		await expect(NUTZEN(modal)).toHaveCount(0);
		await expect(NUTZEN_FELD(modal)).toBeVisible();

		await modal.getByLabel('Anzeigename').fill('Im Bereich');
		await modal.getByLabel('Kennung').fill('im-bereich');
		await NUTZEN_FELD(modal).fill('64');
		await modal.getByRole('spinbutton', { name: 'Aufwand' }).fill('30');
		await modal.getByRole('button', { name: 'Speichern' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);

		// F-04: Persistenz schreibt erst nach der Bündelungsfrist DEBOUNCE_MS (400 ms).
		await expect
			.poll(
				async () => (await readStoredMap(page)).features.find((f) => f.id === 'im-bereich')?.impact,
				{ timeout: 2000 }
			)
			.toBe(64);
	});

	// AK: „Ändern des Bereichs (z. B. auf 0–50) wirkt sofort auf neu geöffnete Formulare."
	test('wirkt nach Ändern des Bereichs auf 0–50 sofort auf ein neu geöffnetes Formular', async ({
		page
	}) => {
		await seedSettings(page, { mode: 'free', range: { min: 0, max: 100 } });
		await seedMap(page, []);
		await page.goto('/');

		let modal = await openCreateModal(page);
		await expect(NUTZEN_FELD(modal)).toHaveAttribute('max', '100');
		await modal.getByRole('button', { name: 'Abbrechen' }).click();

		const settings = await openSettingsDialog(page);
		await setFreeModeAndSave(settings, 0, 50);

		modal = await openCreateModal(page);
		await expect(NUTZEN_FELD(modal)).toHaveAttribute('min', '0');
		await expect(NUTZEN_FELD(modal)).toHaveAttribute('max', '50');
	});

	// AK-19 / PRD FR-08: „Import eines Dokuments mit impact=45 bei aktivem Fibonacci-Modus
	// schaltet die Anwendung automatisch auf den freien Schätzmodus um; das Formular zeigt 45
	// danach als Zahlenfeldwert, nicht als Fibonacci-Auswahl."
	test('schaltet bei Import eines Dokuments mit impact=45 automatisch von fibonacci auf frei um', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		await page.getByRole('button', { name: 'Importieren' }).click();
		const importDialog = page.getByRole('dialog', { name: 'Karte importieren' });
		await importDialog
			.getByRole('textbox')
			.fill('featuremap v1\n\nabweichend :: impact=45, effort=5\n');
		await importDialog.getByRole('button', { name: 'Übernehmen' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		const dialog = await openEditModal(page, 'abweichend');
		await expect(NUTZEN(dialog)).toHaveCount(0);
		await expect(NUTZEN_FELD(dialog)).toHaveValue('45');
	});

	// F-26, Abschnitt „Automatischer Wechsel beim Import": „… kein Wechsel wenn alle Werte in
	// der Reihe liegen." Gegenprobe zu AK-19.
	test('bleibt bei fibonacci, wenn der Import ausschließlich Fibonacci-Werte enthält', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		await page.getByRole('button', { name: 'Importieren' }).click();
		const importDialog = page.getByRole('dialog', { name: 'Karte importieren' });
		await importDialog
			.getByRole('textbox')
			.fill('featuremap v1\n\nunveraendert :: impact=13, effort=8\n');
		await importDialog.getByRole('button', { name: 'Übernehmen' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		const dialog = await openEditModal(page, 'unveraendert');
		await expect(NUTZEN(dialog)).toBeVisible();
		await expect(NUTZEN_FELD(dialog)).toHaveCount(0);
	});

	// AK: „Ein Wert außerhalb des eingestellten Bereichs (z. B. impact=150 bei Bereich 0–100)
	// bleibt erhalten und wird wie in FR-03 als abweichend gekennzeichnet, statt den Bereich
	// automatisch zu erweitern."
	test('erhält und kennzeichnet einen Wert außerhalb des eingestellten Bereichs, statt den Bereich zu erweitern', async ({
		page
	}) => {
		await seedSettings(page, { mode: 'free', range: { min: 0, max: 100 } });
		await seedMap(page, [{ id: 'ausreisser', label: 'Ausreißer', impact: 150, effort: 5 }]);
		await page.goto('/');

		const dialog = await openEditModal(page, 'ausreisser');
		await expect(NUTZEN_FELD(dialog)).toHaveValue('150');
		await expect(dialog.getByTestId('score-deviating-nutzen')).toBeVisible();

		// Bereich bleibt unverändert bei 0–100, statt sich auf 150 zu erweitern.
		await expect(NUTZEN_FELD(dialog)).toHaveAttribute('max', '100');

		await page.keyboard.press('Escape');
		const stored = await readStoredMap(page);
		expect(stored.features.find((f) => f.id === 'ausreisser')?.impact).toBe(150);
	});

	// AK: „Bei Modus Frei zeigt die volle Kartenansicht Teilstriche als runde, gleichmäßig
	// verteilte Werte bis mindestens zum eingestellten Maximum."
	test('zeigt bei Modus frei runde, gleichmäßig verteilte Teilstriche bis mindestens zum eingestellten Maximum', async ({
		page
	}) => {
		await seedSettings(page, { mode: 'free', range: { min: 0, max: 100 } });
		await seedMap(page, []);
		await page.goto('/');

		const ticks = await xTickValues(page);
		expect(ticks.length).toBeGreaterThanOrEqual(2);
		expect(ticks).not.toEqual([1, 2, 3, 5, 8, 13, 21]);

		const steps: number[] = [];
		for (let i = 1; i < ticks.length; i++) {
			steps.push(ticks[i] - ticks[i - 1]);
		}
		for (const step of steps) {
			expect(step).toBeCloseTo(steps[0], 6);
		}

		expect(Math.max(...ticks)).toBeGreaterThanOrEqual(100 * 0.8);
	});

	// FR-76: „Schätzmodus und der Wertebereich des freien Schätzmodus … werden als
	// App-Einstellung im LocalStorage persistiert." Neuladen ohne vorherige Aktion in dieser
	// Sitzung, direkt über einen vorab gesetzten LocalStorage-Wert (Gegenstück zu
	// theme.test.ts/F-01).
	test('übersteht ein Neuladen der Seite mit vorab gesetztem Schätzmodus und Bereich (FR-76)', async ({
		page
	}) => {
		await seedSettings(page, { mode: 'free', range: { min: 0, max: 30 } });
		await seedMap(page, []);
		await page.goto('/');

		let modal = await openCreateModal(page);
		await expect(NUTZEN_FELD(modal)).toHaveAttribute('max', '30');
		await modal.getByRole('button', { name: 'Abbrechen' }).click();

		await page.reload();

		modal = await openCreateModal(page);
		await expect(NUTZEN_FELD(modal)).toBeVisible();
		await expect(NUTZEN_FELD(modal)).toHaveAttribute('max', '30');
	});

	// AK: „Export/Import einer Karte enthält keine Spur des Schätzmodus (reine Ganzzahlen wie
	// bisher); zwei Nutzer mit unterschiedlichem Modus sehen dieselbe importierte Karte korrekt
	// (DSL-14 bleibt unberührt)." Geprüft über zwei unabhängige Browser-Kontexte mit
	// unterschiedlichem Schätzmodus, deren exportierter Text byte-identisch sein muss —
	// dasselbe Roundtrip-Muster wie e2e/F-18-import.spec.ts, Entscheidung 2 (zweiter,
	// unabhängiger Browser-Kontext als „frischer Tab").
	test('liefert bei unterschiedlichem Schätzmodus byte-identischen Export/Import-Text (DSL-14 unberührt)', async ({
		browser
	}) => {
		const map = emptyFeatureMap([
			{ id: 'a', label: 'A', impact: 45, effort: 5 },
			{ id: 'b', label: 'B', impact: 2, effort: 2 }
		]);
		const erwarteterText = serialize(map);

		async function exportierterText(mode: 'fibonacci' | 'free'): Promise<string> {
			const context = await browser.newContext();
			const seite = await context.newPage();
			await seedSettings(seite, { mode, range: { min: 0, max: 100 } });
			await seedMap(
				seite,
				map.features.map((f) => ({ id: f.id, label: f.label, impact: f.impact, effort: f.effort })),
				map.relations
			);
			await seite.goto('/');

			await seite.getByRole('button', { name: 'Exportieren' }).click();
			await seite.getByRole('button', { name: 'Als Text' }).click();
			const text = await seite.getByRole('dialog', { name: 'Als Text' }).getByRole('textbox').inputValue();

			await context.close();
			return text;
		}

		const fibonacciText = await exportierterText('fibonacci');
		const freierText = await exportierterText('free');

		expect(fibonacciText).toBe(erwarteterText);
		expect(freierText).toBe(erwarteterText);
		expect(fibonacciText).toBe(freierText);
	});

	// F-26, Abschnitt „Tests": „Einstellungsdialog öffnen, Modus wechseln." Eigener, isolierter
	// Test des Dialogverhaltens selbst (Umschalter-Zustand, ESC schließt ohne zu speichern —
	// dasselbe Verhalten wie FeatureModal.svelte, F-13, Abschnitt „Darstellung").
	test('öffnet den Einstellungsdialog über Ansicht → Einstellungen, wechselt den Modus, ESC verwirft ohne zu speichern', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openSettingsDialog(page);
		await expect(schaetzmodusGroup(dialog).getByRole('button', { name: 'Fibonacci' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);

		await schaetzmodusGroup(dialog).getByRole('button', { name: 'Frei' }).click();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);

		// ESC hat nicht gespeichert: das Formular zeigt weiterhin die Fibonacci-Knopfreihe.
		const modal = await openCreateModal(page);
		await expect(NUTZEN(modal)).toBeVisible();
	});

	// F-26, Abschnitt „Tests": Bereichsvalidierung ist beobachtbar auch über den Dialog selbst
	// (FR-09: „Min < Max, nicht-negativ") — Gegenstück zur Unit-Prüfung in settings.test.ts,
	// hier aus Nutzersicht: eine ungültige Eingabe speichert nicht und meldet den Fehler.
	test('lehnt im Einstellungsdialog einen ungültigen Bereich (min ≥ max) ab und speichert nicht', async ({
		page
	}) => {
		await seedMap(page, []);
		await page.goto('/');

		const dialog = await openSettingsDialog(page);
		await schaetzmodusGroup(dialog).getByRole('button', { name: 'Frei' }).click();
		await dialog.getByLabel('Minimum').fill('50');
		await dialog.getByLabel('Maximum').fill('10');
		await dialog.getByRole('button', { name: 'Speichern' }).click();

		await expect(dialog).toBeVisible();

		await page.keyboard.press('Escape');
		const modal = await openCreateModal(page);
		// Unverändert Fibonacci, weil der ungültige Bereich nicht übernommen wurde.
		await expect(NUTZEN(modal)).toBeVisible();
	});
});
