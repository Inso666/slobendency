// F-17 · Beziehungen bearbeiten und löschen — E2E-Tests.
// Quellen: features/F-17-beziehungen-pflegen.md (Abschnitte "Umfang", "Verhalten",
// "Fachregeln", "Akzeptanzkriterien"), PRD.md (FR-16, INT-03, INT-04, INT-05, NFR-23),
// design/README.md ("Kontextmenü ... noch zu entwerfen; die Bausteine dafür — Rahmen,
// Kartusche, Panel — stehen ... bereits fest": kein fertiges Mockup für das Kantenmenü, ebenso
// keines für den Bearbeitungsmodus des Dialogs, deshalb hier über Rolle/Text zugänglich statt
// über eine Bildvorlage nachgebaut), features/README.md (Ubiquitous Language: Beziehung,
// Beziehungsart, benötigt/hängt zusammen/schließt aus), features/STATUS.md ("F-11-Testkonflikt
// durch die Kartuschenposition, korrigiert": obere linke Ecke als freie Fläche).
//
// Wiederverwendete, bereits vergebene Kennzeichen aus F-09 bis F-16: feature-node-<id>,
// edge-<from>-<to>-<type>, edge-label-<from>-<to>-<type>, edge-ring-<id>, detail-cartouche,
// detail-outgoing, detail-incoming, bearing-<from>-<to>-<type>.
// Diese Datei vergibt selbst keine neuen data-testid — jedes neue Element ist über Rolle und
// sichtbaren Text eindeutig erreichbar (Menü/Dialog jeweils mit eigenem zugänglichen Namen,
// Knöpfe/Menüeinträge mit dem in F-17 wörtlich vorgegebenen Text "Ändern"/"Entfernen").
//
// Designentscheidungen dieses Test-Agenten (in den Quellen nicht mit einem Mockup oder Wortlaut
// festgelegt, design/README.md-Zitat oben):
//   1. Zugänglicher Name des wiederverwendeten RelationDialog.svelte im Modus "Ändern":
//      "Beziehung ändern" (F-16 legt für den Anlegemodus "Beziehung anlegen" fest; derselbe
//      Dialog braucht im anderen Modus einen davon unterscheidbaren Namen).
//   2. Beschriftung des Übernehmen-Knopfs im Modus "Ändern": "Speichern" — dieselbe
//      Beschriftung, die FeatureModal.svelte (F-13) bereits einheitlich für "Anlegen" *und*
//      "Bearbeiten" verwendet (dort gibt es keinen eigenen "Anlegen"-Knopf); RelationDialog
//      selbst unterscheidet im Anlegemodus bereits mit "Anlegen" (F-16) von "Speichern" im
//      Formular — dieselbe Unterscheidung Anlegen/Ändern wird hier fortgeschrieben, statt ein
//      drittes Wort einzuführen.
//   3. Zugänglicher Name des Kontextmenüs auf einer Kante: "Beziehungsmenü" — in derselben
//      Musterlinie wie "Feature-Menü" und "Kartenmenü" aus F-16, hier auf den Fachbegriff
//      "Beziehung" (nicht die zeichnerische "Kante") bezogen, weil Ändern/Entfernen Operationen
//      auf der Beziehung sind (features/README.md, Ubiquitous Language).
//   4. Auslöser des Kantenmenüs: Rechtsklick (Maus) bzw. Long-Press (Touch) — F-17 selbst
//      schreibt an der betreffenden Stelle nur "Klick auf eine Kante ... öffnet ihr Menü" ohne
//      das Wort "Rechtsklick", nennt den Vorgang aber unmittelbar zuvor "Kontextmenü auf einer
//      Kante" und direkt danach "Auf Touchgeräten öffnet Long-Press ... dasselbe Menü" — genau
//      das Begriffspaar Rechtsklick/Long-Press, mit dem FR-10 und F-16 jedes andere
//      Kontextmenü dieser Anwendung auslösen. Ein zweiter, per einfachem Linksklick
//      erreichbarer Mechanismus stünde im Widerspruch zur bestehenden Selektion durch
//      Linksklick (FR-40) und würde das App-weite Muster verdoppeln (features/README.md,
//      Leitplanke 3 sinngemäß auch für Bedienmuster). "Klick" im Feature-Dokument wird deshalb
//      als Kurzform für denselben Vorgang gelesen, den F-16 an jeder anderen Stelle
//      "Rechtsklick" nennt.
//
// Kein Widerspruch zwischen den Quellen gefunden, der eine Rückfrage an den Orchestrator
// nötig gemacht hätte.

import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Liest den aktuell in LocalStorage gespeicherten Kartenzustand (Muster aus F-11, F-13, F-15). */
async function readStoredMap(
	page: Page
): Promise<{ features: SeedFeature[]; relations: SeedRelation[] }> {
	const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
	expect(raw, 'Testaufbau: LocalStorage sollte eine Karte enthalten').not.toBeNull();
	return JSON.parse(raw!);
}

/** Zwei unabhängige Features ohne Beziehung, damit jeder Test seine eigene(n) Beziehung(en)
 * anlegt, ohne mit anderen Tests zu kollidieren. */
const BASE_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'Feature A', impact: 3, effort: 2 },
	{ id: 'b', label: 'Feature B', impact: 5, effort: 3 },
	{ id: 'c', label: 'Feature C', impact: 2, effort: 5 }
];

/** Öffnet die Detail-Kartusche über einen Klick auf das Feature (F-15). */
async function openCartouche(page: Page, id: string): Promise<Locator> {
	await page.getByTestId(`feature-node-${id}`).click();
	const cartouche = page.getByTestId('detail-cartouche');
	await expect(cartouche).toBeVisible();
	return cartouche;
}

/** Zeile einer Beziehung in der Kartusche (F-15, wiederverwendet in F-17). */
function bearingRow(page: Page, from: string, to: string, type: SeedRelation['type']): Locator {
	return page.getByTestId(`bearing-${from}-${to}-${type}`);
}

/**
 * Öffnet den RelationDialog im Modus "Ändern" über die Aktion "Ändern" einer Beziehungszeile
 * der Kartusche (F-17, Abschnitt "Umfang": "je Beziehungszeile die Aktionen Ändern und
 * Entfernen, sichtbar bei Hover und bei Tastaturfokus"). Hover macht die sonst zurückgenommene
 * Aktion bedienbar — dasselbe Muster wie "Beziehung anlegen" in FeatureListRow.svelte (F-14/F-16).
 */
async function openChangeDialogFromCartouche(
	page: Page,
	from: string,
	to: string,
	type: SeedRelation['type']
): Promise<Locator> {
	const row = bearingRow(page, from, to, type);
	await row.hover();
	await row.getByRole('button', { name: 'Ändern', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Beziehung ändern' });
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Öffnet das Kontextmenü einer Kante über einen Rechtsklick innerhalb ihrer Trefferfläche
 * (F-17, Abschnitt "Umfang"/Absatz zur Trefferfläche). */
async function openEdgeMenu(
	page: Page,
	from: string,
	to: string,
	type: SeedRelation['type']
): Promise<Locator> {
	await page.getByTestId(`edge-${from}-${to}-${type}`).click({ button: 'right', force: true });
	const menu = page.getByRole('menu', { name: 'Beziehungsmenü' });
	await expect(menu).toBeVisible();
	return menu;
}

/** Simuliert einen Long-Press auf einer Kante (Touch, F-17: "Auf Touchgeräten öffnet Long-Press
 * auf der Kante dasselbe Menü"), nach demselben Muster wie e2e/F-16-verbindungsvorgang.spec.ts. */
async function longPressEdge(
	page: Page,
	from: string,
	to: string,
	type: SeedRelation['type'],
	ms: number
): Promise<void> {
	const testId = `edge-${from}-${to}-${type}`;
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

test.describe('F-17 · Beziehungen bearbeiten und löschen', () => {
	test.describe('Ändern über die Detail-Kartusche', () => {
		for (const width of BREAKPOINTS) {
			// F-17-Kernakzeptanzkriterium: "Eine relates-Beziehung lässt sich auf requires
			// ändern; die Kante wechselt sofort Linienform und Endmarke, und das Ziel erhält
			// den Vorbedingungsring." Über alle drei Referenz-Breakpoints (CLAUDE.md,
			// QA-Abgleich; UI-18).
			test(`ändert bei ${width}px eine relates- in eine requires-Beziehung, sofort sichtbar`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 900 });
				await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
				await page.goto('/');

				await openCartouche(page, 'a');
				const dialog = await openChangeDialogFromCartouche(page, 'a', 'b', 'relates');

				// Vorbefüllt mit der bisherigen Art (F-17, Abschnitt "Verhalten": "Dialog mit
				// vorbelegter Art und Beschriftung").
				await expect(
					dialog.getByRole('button', { name: 'hängt zusammen', exact: true })
				).toHaveAttribute('aria-pressed', 'true');

				await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
				await dialog.getByRole('button', { name: 'Speichern' }).click();

				await expect(dialog).toHaveCount(0);
				await expect(page.getByTestId('edge-a-b-relates')).toHaveCount(0);

				const edge = page.getByTestId('edge-a-b-requires');
				await expect(edge).toBeVisible();
				// Linienform: requires ist durchgezogen (relates war gestrichelt, F-10-Signaturenkatalog).
				await expect(edge).toHaveCSS('stroke-dasharray', 'none');
				// Endmarke: requires trägt die Pfeilspitze #tipInk, nicht #tipSea (F-10).
				await expect(edge).toHaveAttribute('marker-end', /tipInk/);
				// Das Ziel "b" erhält den Vorbedingungsring (F-10, "requires ... Ziel erhält
				// zusätzlich einen umschließenden Ring").
				await expect(page.getByTestId('edge-ring-b')).toBeVisible();

				// Auch die Kartusche selbst spiegelt die geänderte Art unmittelbar wider.
				await expect(bearingRow(page, 'a', 'b', 'relates')).toHaveCount(0);
				await expect(bearingRow(page, 'a', 'b', 'requires')).toBeVisible();
			});
		}

		// F-17-AK: "Eine geänderte Beschriftung erscheint bei Selektion an der Kante."
		test('übernimmt eine geänderte Beschriftung, sichtbar bei Selektion an der Kante', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'a', to: 'b', type: 'relates', label: 'vorher' }
			]);
			await page.goto('/');

			await openCartouche(page, 'a');
			const dialog = await openChangeDialogFromCartouche(page, 'a', 'b', 'relates');

			await expect(dialog.getByLabel('Beschriftung')).toHaveValue('vorher');
			await dialog.getByLabel('Beschriftung').fill('nachher');
			await dialog.getByRole('button', { name: 'Speichern' }).click();
			await expect(dialog).toHaveCount(0);

			// "a" bleibt selektiert (die Kartusche selbst hat sich nicht geschlossen) — die
			// Beziehung ist Teil der Hervorhebung des selektierten Features (F-11) und ihre
			// Beschriftung damit ohne zusätzlichen Hover sichtbar (FR-45: "bei Selektion oder
			// Hover").
			await expect(page.getByTestId('detail-cartouche')).toBeVisible();
			await expect(page.getByTestId('edge-label-a-b-relates')).toContainText('nachher');
		});

		// F-17-AK: "Eine Änderung, die ein vorhandenes Tripel erzeugen würde, wird abgelehnt;
		// die ursprüngliche Beziehung bleibt unverändert." INT-04.
		test('lehnt eine Änderung ab, die ein vorhandenes Tripel erzeugen würde, und lässt den Dialog offen', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'a', to: 'b', type: 'requires' },
				{ from: 'a', to: 'b', type: 'relates' }
			]);
			await page.goto('/');

			await openCartouche(page, 'a');
			const dialog = await openChangeDialogFromCartouche(page, 'a', 'b', 'relates');

			await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
			await dialog.getByRole('button', { name: 'Speichern' }).click();

			// Dialog bleibt offen, dieselbe Meldung wie beim Anlegen (INT-04, F-16).
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText('Beziehung existiert bereits')).toBeVisible();

			// Die ursprüngliche Beziehung besteht unverändert, keine der beiden Kanten hat sich
			// verändert.
			await dialog.getByRole('button', { name: 'Abbrechen' }).click();
			await expect(page.getByTestId('edge-a-b-relates')).toBeVisible();
			await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
			await expect(bearingRow(page, 'a', 'b', 'relates')).toBeVisible();
		});

		// F-17, Abschnitt "Verhalten": "Quelle und Ziel sind fest und werden nur angezeigt."
		test('zeigt Quelle und Ziel nur an, ohne sie im Ändern-Dialog editierbar zu machen', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			await openCartouche(page, 'a');
			const dialog = await openChangeDialogFromCartouche(page, 'a', 'b', 'relates');

			await expect(dialog).toContainText('Feature A');
			await expect(dialog).toContainText('Feature B');
			// Einziges Eingabefeld bleibt "Beschriftung" — kein Eingabe- oder Auswahlfeld für
			// Quelle/Ziel.
			await expect(dialog.getByRole('textbox')).toHaveCount(1);
			await expect(dialog.getByRole('combobox')).toHaveCount(0);
		});

		// F-17, Abschnitt "Umfang": Aktionen "sichtbar bei ... Tastaturfokus". Zugänglichkeit
		// über die Tastatur, ohne Maus/Hover.
		test('erreicht Ändern und Entfernen einer Beziehungszeile über die Tastatur', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			await openCartouche(page, 'a');
			const row = bearingRow(page, 'a', 'b', 'relates');

			// Von der bereits bestehenden Zeilenaktion (Gegenüber selektieren, F-15) aus per Tab
			// zu "Ändern" weiterspringen, ohne die Zeile zu überfahren.
			await row.getByRole('button').first().focus();
			await page.keyboard.press('Tab');
			await expect(row.getByRole('button', { name: 'Ändern', exact: true })).toBeFocused();
			await page.keyboard.press('Enter');

			const dialog = page.getByRole('dialog', { name: 'Beziehung ändern' });
			await expect(dialog).toBeVisible();
			await dialog.getByRole('button', { name: 'Abbrechen' }).click();
			await expect(dialog).toHaveCount(0);

			await row.getByRole('button', { name: 'Ändern', exact: true }).focus();
			await page.keyboard.press('Tab');
			await expect(row.getByRole('button', { name: 'Entfernen', exact: true })).toBeFocused();
			await page.keyboard.press('Enter');

			await expect(page.getByTestId('edge-a-b-relates')).toHaveCount(0);
		});

		// Tag- und Nachttafel (CLAUDE.md, QA-Abgleich: "Funktioniert Tag- und Nachttafel").
		test('funktioniert unverändert in der Nachttafel', async ({ page }) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');
			await page.getByRole('button', { name: 'Nacht' }).click();

			await openCartouche(page, 'a');
			const dialog = await openChangeDialogFromCartouche(page, 'a', 'b', 'relates');
			await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
			await dialog.getByRole('button', { name: 'Speichern' }).click();

			await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		});
	});

	test.describe('Entfernen über die Detail-Kartusche', () => {
		// F-17-AK: "Das Entfernen einer Beziehung nimmt sie aus Karte, Detail-Kartusche und
		// Export." Abschnitt "Verhalten": "Entfernt ohne Rückfrage."
		test('entfernt eine Beziehung sofort ohne Rückfrage, aus Karte, Kartusche und Export', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'a', to: 'b', type: 'relates', label: 'gemeinsame Nutzer' }
			]);
			await page.goto('/');

			await openCartouche(page, 'a');
			const row = bearingRow(page, 'a', 'b', 'relates');
			await row.hover();
			await row.getByRole('button', { name: 'Entfernen', exact: true }).click();

			// Keine Rückfrage — anders als beim Löschen eines ganzen Features (FR-05).
			await expect(page.getByRole('alertdialog')).toHaveCount(0);
			await expect(page.getByRole('dialog')).toHaveCount(0);

			// Aus der Karte (Kante verschwindet sofort).
			await expect(page.getByTestId('edge-a-b-relates')).toHaveCount(0);

			// Aus der Detail-Kartusche: Feature "a" bleibt selektiert, hat aber keine
			// Beziehungen mehr (F-15: "Keine Beziehungen").
			const cartouche = page.getByTestId('detail-cartouche');
			await expect(cartouche).toBeVisible();
			await expect(page.getByTestId('detail-outgoing')).toHaveCount(0);
			await expect(page.getByTestId('detail-incoming')).toHaveCount(0);
			await expect(cartouche.getByText('Keine Beziehungen')).toBeVisible();

			// Aus dem (künftigen) Export: die entfernte Beziehung ist nicht mehr Teil der
			// persistierten Karte, aus der ein Export erzeugt würde (F-19 exportiert die
			// aktive Karte unverändert; die Persistenz aus src/lib/store/persistence.ts
			// schreibt erst nach 400 ms, deshalb expect.poll statt einmaligem Lesen, wie in
			// features/STATUS.md, Entscheidung vom 06.09. "Debounce-Race im Löschtest von F-15").
			await expect.poll(async () => (await readStoredMap(page)).relations).toHaveLength(0);
		});
	});

	test.describe('Kontextmenü auf einer Kante', () => {
		// F-17-AK: "Klick auf eine Kante innerhalb der Trefferfläche öffnet ihr Menü." Abschnitt
		// "Umfang": "Kontextmenü auf einer Kante mit denselben zwei Einträgen [Ändern, Entfernen]."
		test('öffnet per Rechtsklick auf der Kante ein Menü mit genau Ändern und Entfernen', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			const menu = await openEdgeMenu(page, 'a', 'b', 'relates');

			const items = menu.getByRole('menuitem');
			await expect(items).toHaveCount(2);
			await expect(menu.getByRole('menuitem', { name: 'Ändern', exact: true })).toBeVisible();
			await expect(menu.getByRole('menuitem', { name: 'Entfernen', exact: true })).toBeVisible();
		});

		test('öffnet "Ändern" aus dem Kantenmenü denselben vorbefüllten Dialog wie die Kartusche', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [
				{ from: 'a', to: 'b', type: 'relates', label: 'gemeinsame Nutzer' }
			]);
			await page.goto('/');

			const menu = await openEdgeMenu(page, 'a', 'b', 'relates');
			await menu.getByRole('menuitem', { name: 'Ändern', exact: true }).click();

			const dialog = page.getByRole('dialog', { name: 'Beziehung ändern' });
			await expect(dialog).toBeVisible();
			await expect(
				dialog.getByRole('button', { name: 'hängt zusammen', exact: true })
			).toHaveAttribute('aria-pressed', 'true');
			await expect(dialog.getByLabel('Beschriftung')).toHaveValue('gemeinsame Nutzer');

			await dialog.getByRole('button', { name: 'benötigt', exact: true }).click();
			await dialog.getByRole('button', { name: 'Speichern' }).click();

			await expect(page.getByTestId('edge-a-b-requires')).toBeVisible();
		});

		test('entfernt eine Beziehung über "Entfernen" im Kantenmenü ohne Rückfrage', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'excludes' }]);
			await page.goto('/');

			const menu = await openEdgeMenu(page, 'a', 'b', 'excludes');
			await menu.getByRole('menuitem', { name: 'Entfernen', exact: true }).click();

			await expect(page.getByRole('alertdialog')).toHaveCount(0);
			await expect(page.getByTestId('edge-a-b-excludes')).toHaveCount(0);
			// Die Durchstreichung des Ziels aus F-10 verschwindet mit der excludes-Beziehung.
			await expect(page.getByTestId('edge-strike-b')).toHaveCount(0);
		});

		// F-17, Absatz zur Trefferfläche: "Auf Touchgeräten öffnet Long-Press auf der Kante
		// dasselbe Menü." Gleiches Muster wie e2e/F-16-verbindungsvorgang.spec.ts (UI-12).
		test('öffnet das Kantenmenü nach etwa 500 ms Long-Press auf einem Touchgerät', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			await longPressEdge(page, 'a', 'b', 'relates', 600);

			await expect(page.getByRole('menu', { name: 'Beziehungsmenü' })).toBeVisible();
		});

		test('öffnet bei einer kurzen Berührung der Kante kein Menü', async ({ page }) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			await longPressEdge(page, 'a', 'b', 'relates', 120);

			await expect(page.getByRole('menu', { name: 'Beziehungsmenü' })).toHaveCount(0);
		});

		test('schließt das Kantenmenü bei ESC, ohne die Beziehung zu verändern', async ({
			page
		}) => {
			await seedMap(page, BASE_FEATURES, [{ from: 'a', to: 'b', type: 'relates' }]);
			await page.goto('/');

			const menu = await openEdgeMenu(page, 'a', 'b', 'relates');
			await page.keyboard.press('Escape');

			await expect(menu).toHaveCount(0);
			await expect(page.getByTestId('edge-a-b-relates')).toBeVisible();
		});
	});
});
