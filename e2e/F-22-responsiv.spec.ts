// F-22 · Responsives Verhalten und Touch — E2E-Tests.
// Quellen: features/F-22-responsiv.md (Abschnitte „Umfang", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (UI-10 bis UI-18, NFR-07, AK-16, Abschnitte 6.2/6.3),
// design/03-seekarte.html (`@media max-width:1080px`/`768px`, Klassen `.index`, `.detail`,
// `.legend`, `.ribbon`), design/README.md (Abschnitt „Offen, unabhängig von der Richtung":
// „Modal, Kontextmenü und Import-Vorschau sind noch zu entwerfen" — für das im Entwurf noch
// nicht gezeichnete Bottom Sheet/Vollbild-Verhalten gilt dasselbe wie schon für Kontextmenü und
// RelationDialog in e2e/F-16-verbindungsvorgang.spec.ts: über Rolle/Text statt über eine
// Bildvorlage geprüft), features/README.md (Ubiquitous Language), CLAUDE.md (QA-Abgleich:
// Breakpoints 375/834/1440 px), bereits gemergte Features F-08 bis F-21 und F-23 (bestehende
// Komponenten, die F-22 anpasst, siehe Kopfkommentare der jeweiligen *.svelte-Dateien).
//
// F-22 baut keine neuen fachlichen Bausteine (features/F-22-responsiv.md, Abschnitt „Umfang":
// „Anpassungen an bestehenden Komponenten, keine neuen fachlichen Bausteine"). Diese Tests
// laufen deshalb ausschließlich gegen bereits vorhandene Komponenten (FeatureList.svelte,
// DetailCartouche.svelte, ContextMenu.svelte, FeatureNodes.svelte, MapCanvas.svelte,
// StatusBar.svelte, das Kopfband in routes/+page.svelte) — ohne dass eine ihrer Signaturen
// verändert wird.
//
// Neu vergebene data-testid (Begründung: Rolle/Text reichen hier nicht aus):
//   - feature-hitarea-<id>      die in F-22 geforderte unsichtbare Trefferfläche um eine
//                               Feature-Signatur (Abschnitt „Trefferflächen": „Jede
//                               Feature-Signatur bekommt einen unsichtbaren Kreis von mindestens
//                               44 px Bildschirmgröße"). Ein reines Signaturelement ohne
//                               Eigentext — wie schon feature-halo-<id> (F-11) und
//                               connect-start-<id> (F-16) nicht über Rolle/Text ansprechbar.
//   - detail-drag-handle        der in F-22 geforderte „Zuggriff" der Detail-Kartusche im
//                               Bottom-Sheet-Zustand (Umfang-Tabelle, Zeile „Detail-Kartusche").
//                               Ein reines Bedienelement ohne Eigentext (ein Ziehgriff trägt
//                               keine sinnvolle Beschriftung), deshalb kein Zugriff über
//                               Rolle/Text möglich.
//
// Designentscheidungen dieses Test-Agenten (in den Quellen nicht mit einem Wortlaut oder Mockup
// festgelegt — design/README.md bestätigt für Modal/Kontextmenü ausdrücklich, dass kein
// pixelgenauer Entwurf besteht, und das Bottom-Sheet/Vollbild-Verhalten aus F-22 ist im
// bestehenden Mockup design/03-seekarte.html überhaupt nicht abgebildet):
//   1. Der sichtbare Schließen-Knopf des Verzeichnis-Vollbilds (AK „Das Verzeichnis öffnet als
//      Vollbild und schließt über einen sichtbaren Knopf") trägt die Beschriftung "Schließen" —
//      derselbe Wortstamm wie der bereits vorhandene Kopfband-Knopf "Verzeichnis" nennt keinen
//      eigenen Schließen-Text; "Schließen" ist in dieser Anwendung noch nirgends anders belegt
//      (anders als "Abbrechen", das hier durchgehend für das Verwerfen einer Eingabe reserviert
//      ist, siehe FeatureModal.svelte/RelationDialog.svelte/ImportDialog.svelte).
//   2. „44 px Bildschirmgröße" eines Trefferkreises (Abschnitt „Trefferflächen") wird als
//      Mindestdurchmesser gelesen, wie bereits in src/lib/interaction/hitArea.ts begründet
//      (dieselbe Maßeinheit, mit der e2e/F-16-verbindungsvorgang.spec.ts Menüeinträge nach
//      UI-16 prüft: Kantenlänge, nicht Radius).
//   3. UI-16 ("Interaktive Trefferflächen … mindestens 44 × 44 px") steht in PRD.md unter
//      Abschnitt 6.2 "Layout Mobil" und wird hier deshalb nur unterhalb des Mobil-Breakpoints
//      (< 768 px) durchgesetzt, nicht bei 834/1440 px — die dort schon geltenden, engeren
//      Desktop-Maße (z. B. FeatureListRow.svelte, 22 × 22 px, sichtbar bei Hover) verändert
//      dieses Feature laut Umfang-Tabelle nicht.
//   4. Bewusst NICHT geprüft: die konkrete Aufteilung des Kopfbands in "Symbole" und
//      Überlaufmenü (Umfang-Tabelle, Zeile „Kopfband"; UI-17). Welche Knöpfe als „seltener
//      gebraucht" gelten und welchen zugänglichen Namen ein Überlauf-Auslöser trägt, legt keine
//      Quelle fest — ein Test, der das dennoch festlegte, verlangte eine bestimmte
//      Kopfband-Aufteilung statt eines beobachtbaren Verhaltens (CLAUDE.md, Regeln für den
//      Test-Agenten: „Ein Test, der eine bestimmte Implementierung erzwingt, ist ein
//      QA-Befund"). Die tatsächliche Erreichbarkeit jeder Kopfband-Aktion bei 375 px prüft
//      bereits der Kernablauf-Test unten (AK-16) über Rolle/Text, unabhängig davon, ob die
//      jeweilige Aktion als Symbol oder in einem Überlaufmenü liegt.
//
// Dem Orchestrator zu melden (siehe Abschlussbericht): AK „Zwischen 768 und 1024 px bleibt das
// Verzeichnis seitlich, die Zeichenerklärung entfällt" scheint durch die bereits gemergten
// Features F-10 (Legend.svelte, `@media max-width:1080px`) und F-14 (FeatureList.svelte,
// dieselbe Schwelle) im Bestand bereits erfüllt — der zugehörige Test unten kombiniert die
// AK-Zusicherung deshalb mit der noch fehlenden Trefferfläche (s. o.), damit er aus einem
// echten, auf F-22 zurückgehenden Grund rot ist statt trivial bereits grün zu sein.

import { expect, test, type Locator, type Page } from '@playwright/test';

const STORAGE_KEY = 'featuremap.map';
const BREAKPOINTS = [375, 834, 1440];
const MOBILE_HEIGHT = 812;
const TABLET_HEIGHT = 1112;
const DESKTOP_HEIGHT = 900;

function heightFor(width: number): number {
	if (width === 375) return MOBILE_HEIGHT;
	if (width === 834) return TABLET_HEIGHT;
	return DESKTOP_HEIGHT;
}

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04), wie
 * bereits in den Testdateien der übrigen Features. */
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

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
	const box = await locator.boundingBox();
	expect(box, 'Testaufbau: Element sollte eine Bounding Box haben').not.toBeNull();
	return box!;
}

function centerOf(box: Box): { x: number; y: number } {
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
	return page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth
	);
}

/** Öffnet das Anlegeformular über den Kopfband-Knopf "+ Feature" (F-13) und legt ein Feature mit
 * dem übergebenen Anzeigenamen an (Kennung wird automatisch aus dem Namen abgeleitet, F-13,
 * slugify()). */
async function createFeature(page: Page, label: string): Promise<void> {
	await page.getByRole('button', { name: '+ Feature' }).click();
	const dialog = page.getByRole('dialog', { name: 'Feature anlegen' });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('Anzeigename').fill(label);
	await dialog.getByRole('button', { name: 'Speichern' }).click();
	await expect(dialog).toHaveCount(0);
}

/** Öffnet das Verzeichnis über den Kopfband-Knopf (F-14). */
async function openDirectory(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Verzeichnis' }).click();
	const directory = page.getByRole('complementary', { name: 'Verzeichnis' });
	await expect(directory).toBeVisible();
	return directory;
}

/** Öffnet den Export-Dialog über "Exportieren → Als Text" (F-19), wie in
 * e2e/F-19-export-dsl.spec.ts. */
async function openExportDialog(page: Page): Promise<Locator> {
	await page.getByRole('button', { name: 'Exportieren' }).click();
	await page.getByRole('button', { name: 'Als Text' }).click();
	return page.getByRole('dialog', { name: 'Als Text' });
}

/** Rechtsklick auf ein Feature öffnet das Kontextmenü (F-16), wie in
 * e2e/F-16-verbindungsvorgang.spec.ts. */
async function rightClickAt(page: Page, point: { x: number; y: number }): Promise<void> {
	await page.mouse.move(point.x, point.y);
	await page.mouse.down({ button: 'right' });
	await page.mouse.up({ button: 'right' });
}

async function connectFeatures(
	page: Page,
	fromId: string,
	toId: string,
	typeLabel: 'benötigt' | 'hängt zusammen' | 'schließt aus'
): Promise<void> {
	const fromBox = await boxOf(page.getByTestId(`feature-node-${fromId}`));
	await rightClickAt(page, centerOf(fromBox));
	let menu = page.getByRole('menu', { name: 'Feature-Menü' });
	await expect(menu).toBeVisible();
	await menu.getByRole('menuitem', { name: 'Als Start verwenden' }).click();

	const toBox = await boxOf(page.getByTestId(`feature-node-${toId}`));
	await rightClickAt(page, centerOf(toBox));
	menu = page.getByRole('menu', { name: 'Feature-Menü' });
	await expect(menu).toBeVisible();
	await menu.getByRole('menuitem', { name: 'Als Ziel verwenden' }).click();

	const dialog = page.getByRole('dialog', { name: 'Beziehung anlegen' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: typeLabel, exact: true }).click();
	await dialog.getByRole('button', { name: 'Anlegen' }).click();
	await expect(dialog).toHaveCount(0);
}

/** Simuliert einen Long-Press mit optionaler Fingerbewegung während des Drucks (F-22, Abschnitt
 * „Trefferflächen"; Vorbild `longPress()`/`touchDrag()` aus e2e/F-16-verbindungsvorgang.spec.ts
 * und e2e/F-12-zoom-pan.spec.ts). Löst `touchstart` an `start` aus, bewegt nach `moveAfterMs`
 * Millisekunden Wartezeit zu `start + (dx, dy)` (ein einzelnes `touchmove`, falls `dx`/`dy`
 * gesetzt sind), wartet den Rest der Gesamtdauer `totalMs` ab und löst dann `touchend` aus. */
async function longPressWithMove(
	page: Page,
	testId: string,
	options: { totalMs: number; moveAfterMs?: number; dx?: number; dy?: number }
): Promise<void> {
	const { totalMs, moveAfterMs = 0, dx = 0, dy = 0 } = options;
	const start = await page.evaluate((testId) => {
		const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
		const rect = el.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	}, testId);

	await page.evaluate(
		({ testId, point }) => {
			const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
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
		},
		{ testId, point: start }
	);

	if (moveAfterMs > 0) await page.waitForTimeout(moveAfterMs);

	if (dx !== 0 || dy !== 0) {
		const movedPoint = { x: start.x + dx, y: start.y + dy };
		await page.evaluate(
			({ testId, point }) => {
				const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
				const touch = new Touch({ identifier: 1, target: el, clientX: point.x, clientY: point.y });
				el.dispatchEvent(
					new TouchEvent('touchmove', {
						bubbles: true,
						cancelable: true,
						touches: [touch],
						targetTouches: [touch],
						changedTouches: [touch]
					})
				);
			},
			{ testId, point: movedPoint }
		);
	}

	const remaining = totalMs - moveAfterMs;
	if (remaining > 0) await page.waitForTimeout(remaining);

	const endPoint = { x: start.x + dx, y: start.y + dy };
	await page.evaluate(
		({ testId, point }) => {
			const el = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`) as Element;
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
		},
		{ testId, point: endPoint }
	);
}

test.describe('F-22 · Responsives Verhalten und Touch', () => {
	test.describe('Kernablauf je Referenz-Breakpoint (Tests-Abschnitt, AK-16)', () => {
		for (const width of BREAKPOINTS) {
			// F-22, Abschnitt „Tests": „E2E mit den Viewports 375×812, 834×1112 und 1440×900:
			// je ein vollständiger Durchlauf Anlegen → Beziehung → Export." AK-16.
			test(`führt bei ${width}px Anlegen → Beziehung → Export vollständig durch und bietet konforme Trefferflächen`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: heightFor(width) });
				await seedMap(page, []);
				await page.goto('/');

				await createFeature(page, 'Feature A');
				await createFeature(page, 'Feature B');
				await expect(page.getByTestId('feature-node-feature-a')).toBeVisible();
				await expect(page.getByTestId('feature-node-feature-b')).toBeVisible();

				// F-22, Abschnitt „Trefferflächen": „Jede Feature-Signatur bekommt einen
				// unsichtbaren Kreis von mindestens 44 px Bildschirmgröße" — bei jedem
				// Referenz-Breakpoint, nicht nur mobil (Wortlaut nennt keine Einschränkung auf
				// eine Bildschirmbreite).
				for (const id of ['feature-a', 'feature-b']) {
					const hitArea = await boxOf(page.getByTestId(`feature-hitarea-${id}`));
					expect(hitArea.width).toBeGreaterThanOrEqual(44);
					expect(hitArea.height).toBeGreaterThanOrEqual(44);
				}

				await connectFeatures(page, 'feature-a', 'feature-b', 'benötigt');
				await expect(page.getByTestId('edge-feature-a-feature-b-requires')).toBeVisible();

				// AK „Das Verzeichnis öffnet als Vollbild und schließt über einen sichtbaren
				// Knopf" (nur unterhalb 768 px — Umfang-Tabelle, Zeile „Verzeichnis").
				const directory = await openDirectory(page);
				if (width < 768) {
					const directoryBox = await boxOf(directory);
					const viewport = page.viewportSize();
					expect(viewport).not.toBeNull();
					expect(directoryBox.width).toBeGreaterThanOrEqual(viewport!.width - 2);
					const closeButton = directory.getByRole('button', { name: 'Schließen' });
					await expect(closeButton).toBeVisible();
					await closeButton.click();
					await expect(directory).toHaveCount(0);
				} else {
					const directoryBox = await boxOf(directory);
					const viewport = page.viewportSize();
					expect(viewport).not.toBeNull();
					// AK „Zwischen 768 und 1024 px bleibt das Verzeichnis seitlich" — hier auch
					// bei 1440 px unverändert gültig (design/03-seekarte.html, `.index`).
					expect(directoryBox.width).toBeLessThan(viewport!.width * 0.5);
					await page.getByRole('button', { name: 'Verzeichnis' }).click();
					await expect(directory).toHaveCount(0);
				}

				expect(await hasHorizontalOverflow(page)).toBe(false);

				const exportDialog = await openExportDialog(page);
				const exportText = await exportDialog.getByRole('textbox').inputValue();
				expect(exportText).toContain('feature-a');
				expect(exportText).toContain('feature-b');
				expect(exportText).toContain('requires');
				await page.keyboard.press('Escape');
				await expect(page.getByRole('dialog')).toHaveCount(0);
			});
		}
	});

	test.describe('Bearbeiten, Löschen und Importieren bei 375 px (AK-16)', () => {
		// AK-16: „Auf 375 px Breite lassen sich Feature anlegen, bearbeiten, löschen, …
		// importieren … vollständig durchführen." Der hier geprüfte Anteil: bearbeiten, löschen,
		// importieren — anlegen, Beziehung anlegen und exportieren prüft der Kernablauf-Test
		// oben. Bearbeiten/Löschen laufen über das Verzeichnis (F-14), das laut Umfang-Tabelle
		// dieses Features auf Mobilgeräten die primäre Bedienfläche für Feature-Aktionen ist.
		test('bearbeitet, löscht und importiert bei 375 px vollständig über das Verzeichnis', async ({
			page
		}) => {
			await page.setViewportSize({ width: 375, height: MOBILE_HEIGHT });
			await seedMap(page, [
				{ id: 'a', label: 'Ursprung', impact: 3, effort: 2 },
				{ id: 'b', label: 'Zweitfeature', impact: 5, effort: 5 }
			]);
			await page.goto('/');

			const directory = await openDirectory(page);
			const row = directory.getByTestId('directory-row-a');
			await row.hover();

			// F-22, Abschnitt „Trefferflächen"/UI-16: mindestens 44 × 44 px, hier für die
			// Verzeichnis-Zeilenaktionen (FeatureListRow.svelte, aktuell 22 × 22 px und nur bei
			// Hover/Fokus sichtbar — auf einem Touchgerät ohne Hover-Zustand nicht bedienbar).
			const editButton = row.getByRole('button', { name: 'Bearbeiten' });
			const editBox = await boxOf(editButton);
			expect(editBox.width).toBeGreaterThanOrEqual(44);
			expect(editBox.height).toBeGreaterThanOrEqual(44);

			await editButton.click();
			const editDialog = page.getByRole('dialog', { name: 'Feature bearbeiten' });
			await expect(editDialog).toBeVisible();
			await editDialog.getByLabel('Anzeigename').fill('Ursprung geändert');
			await editDialog.getByRole('button', { name: 'Speichern' }).click();
			await expect(editDialog).toHaveCount(0);
			await expect(page.getByTestId('feature-label-a')).toContainText('Ursprung geändert');

			const directoryAgain = await openDirectory(page);
			const rowB = directoryAgain.getByTestId('directory-row-b');
			await rowB.hover();
			const deleteButton = rowB.getByRole('button', { name: 'Löschen' });
			const deleteBox = await boxOf(deleteButton);
			expect(deleteBox.width).toBeGreaterThanOrEqual(44);
			expect(deleteBox.height).toBeGreaterThanOrEqual(44);
			await deleteButton.click();
			// "Zweitfeature" hat keine Beziehungen — löscht ohne Rückfrage (FR-05).
			await expect(page.getByTestId('feature-node-b')).toHaveCount(0);
			await expect(directoryAgain.getByTestId('directory-row-b')).toHaveCount(0);
			await page.getByRole('button', { name: 'Verzeichnis' }).click();

			// Importieren (F-18) bei 375 px: das Formular ist laut F-18/UI-13 bereits vollbild —
			// hier wird nur die Vollständigkeit des Ablaufs bei diesem Breakpoint geprüft
			// (AK-16), nicht das Verhalten von ImportDialog.svelte selbst erneut
			// (e2e/F-18-import.spec.ts, features/README.md Leitplanke 3).
			await page.getByRole('button', { name: 'Importieren' }).click();
			const importDialog = page.getByRole('dialog', { name: 'Karte importieren' });
			await expect(importDialog).toBeVisible();
			await importDialog.getByLabel('Dokument').fill('feature neu impact=8 effort=13\n');
			await importDialog.getByRole('button', { name: 'Übernehmen' }).click();
			await expect(importDialog).toHaveCount(0);
			await expect(page.getByTestId('feature-node-neu')).toBeVisible();
		});
	});

	test.describe('Long-Press und Drag unterscheiden (F-22, Abschnitt „Trefferflächen"; Tests-Abschnitt)', () => {
		// AK: „Long-Press auf einem Feature öffnet das Kontextmenü" — auch bei einer
		// Fingerbewegung von weniger als 10 px während des Drucks (kein Drag).
		test('öffnet das Kontextmenü bei einer Fingerbewegung unter 10 px während des Long-Press', async ({
			page
		}) => {
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
			await page.goto('/');

			await longPressWithMove(page, 'feature-node-a', {
				totalMs: 600,
				moveAfterMs: 200,
				dx: 3,
				dy: 2
			});

			await expect(page.getByRole('menu', { name: 'Feature-Menü' })).toBeVisible();
		});

		// AK: „Long-Press mit Fingerbewegung verschiebt stattdessen die Karte." F-22, Abschnitt
		// „Trefferflächen": „Bewegt sich der Finger … um mehr als 10 px, gilt es als Drag und das
		// Menü öffnet nicht."
		test('verschiebt bei einer Fingerbewegung über 10 px während des Long-Press die Karte statt das Kontextmenü zu öffnen', async ({
			page
		}) => {
			await seedMap(page, [
				{ id: 'a', label: 'A', impact: 5, effort: 5 },
				{ id: 'b', label: 'B', impact: 18, effort: 18 }
			]);
			await page.goto('/');

			const before = await centerOf(await boxOf(page.getByTestId('feature-node-b')));

			await longPressWithMove(page, 'feature-node-a', {
				totalMs: 600,
				moveAfterMs: 150,
				dx: 60,
				dy: 40
			});

			await expect(page.getByRole('menu', { name: 'Feature-Menü' })).toHaveCount(0);
			const after = await centerOf(await boxOf(page.getByTestId('feature-node-b')));
			expect(distance(before, after)).toBeGreaterThan(20);
		});
	});

	test.describe('Verzeichnis-Vollbild bei 375 px (AK: Vollbild und sichtbarer Schließen-Knopf)', () => {
		test('öffnet das Verzeichnis bei 375 px als Vollbild-Overlay mit sichtbarem Schließen-Knopf', async ({
			page
		}) => {
			await page.setViewportSize({ width: 375, height: MOBILE_HEIGHT });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
			await page.goto('/');

			const directory = await openDirectory(page);
			const box = await boxOf(directory);
			const viewport = page.viewportSize();
			expect(viewport).not.toBeNull();

			// „Vollbild": deckt die gesamte Fensterbreite und -höhe ab.
			expect(box.width).toBeGreaterThanOrEqual(viewport!.width - 2);
			expect(box.height).toBeGreaterThanOrEqual(viewport!.height - 2);
			expect(await hasHorizontalOverflow(page)).toBe(false);

			// „… und schließt über einen sichtbaren Knopf" — nicht nur über den ursprünglich
			// öffnenden Kopfband-Knopf (der laut UI-17 im Überlaufmenü verschwinden kann).
			const closeButton = directory.getByRole('button', { name: 'Schließen' });
			await expect(closeButton).toBeVisible();
			const closeBox = await boxOf(closeButton);
			expect(closeBox.width).toBeGreaterThanOrEqual(44);
			expect(closeBox.height).toBeGreaterThanOrEqual(44);

			await closeButton.click();
			await expect(directory).toHaveCount(0);
		});
	});

	test.describe('Detail-Kartusche als Bottom Sheet bei 375 px', () => {
		// AK: „Die Detail-Kartusche erscheint als Bottom Sheet und verdeckt die Karte nicht
		// vollständig." Umfang-Tabelle: „Bottom Sheet über die volle Breite, von unten
		// eingeschoben, mit Zuggriff (UI-15)."
		test('zeigt die Detail-Kartusche bei 375 px unten verankert über die volle Breite, mit Zuggriff, ohne die Karte vollständig zu verdecken', async ({
			page
		}) => {
			await page.setViewportSize({ width: 375, height: MOBILE_HEIGHT });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
			await page.goto('/');

			await page.getByTestId('feature-node-a').click();
			const cartouche = page.getByTestId('detail-cartouche');
			await expect(cartouche).toBeVisible();

			const box = await boxOf(cartouche);
			const viewport = page.viewportSize();
			expect(viewport).not.toBeNull();

			// „Über die volle Breite" und „von unten eingeschoben": am unteren Fensterrand
			// verankert, über die gesamte Breite.
			expect(box.width).toBeGreaterThanOrEqual(viewport!.width - 2);
			expect(Math.abs(box.y + box.height - viewport!.height)).toBeLessThan(4);

			// „Verdeckt die Karte nicht vollständig": Ein sichtbarer Streifen oberhalb der
			// Kartusche bleibt frei.
			expect(box.y).toBeGreaterThan(viewport!.height * 0.25);

			await expect(page.getByTestId('detail-drag-handle')).toBeVisible();
			expect(await hasHorizontalOverflow(page)).toBe(false);
		});
	});

	test.describe('Trefferflächen skalieren mit dem Maßstab (F-22, Abschnitt „Trefferflächen")', () => {
		// „… da die Karte skaliert, wird dieser Radius aus dem aktuellen Maßstab gerechnet" —
		// der Bildschirmdurchmesser bleibt deshalb auch bei kleinerem Maßstab (nach mehrfachem
		// Herauszoomen) mindestens 44 px, nicht nur bei Maßstab 1.
		test('hält die Trefferfläche bei mindestens 44 × 44 px, auch nach dem Herauszoomen auf den kleinsten Maßstab', async ({
			page
		}) => {
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
			await page.goto('/');

			const node = page.getByTestId('feature-node-a');
			const nodeBox = await boxOf(node);
			await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
			// Viele Rad-Ereignisse zum Verkleinern, wie in e2e/F-12-zoom-pan.spec.ts, um sicher
			// den geklemmten Mindestmaßstab 0,5 zu erreichen.
			for (let i = 0; i < 60; i++) {
				await page.mouse.wheel(0, 240);
			}

			const hitArea = await boxOf(page.getByTestId('feature-hitarea-a'));
			expect(hitArea.width).toBeGreaterThanOrEqual(44);
			expect(hitArea.height).toBeGreaterThanOrEqual(44);
		});
	});

	test.describe('Tablet-Breakpoint 768–1024 px (AK: Verzeichnis bleibt seitlich, Zeichenerklärung entfällt)', () => {
		test('zeigt bei 834 px das Verzeichnis weiterhin seitlich, blendet die Zeichenerklärung aus und hält die Trefferflächen ein', async ({
			page
		}) => {
			await page.setViewportSize({ width: 834, height: TABLET_HEIGHT });
			await seedMap(page, [{ id: 'a', label: 'A', impact: 5, effort: 5 }]);
			await page.goto('/');

			const directory = await openDirectory(page);
			const box = await boxOf(directory);
			expect(box.width).toBeLessThan(834 * 0.5);

			// Umfang-Tabelle: „Zeichenerklärung: Ausgeblendet" gilt laut AK auch im
			// Tablet-Bereich (768–1024 px), nicht erst unterhalb von 768 px.
			await expect(page.getByTestId('legend')).not.toBeVisible();

			// F-22, Abschnitt „Trefferflächen" gilt breakpoint-unabhängig (siehe Designentscheidung
			// 3 am Dateianfang: nur UI-16s 44-px-Knopfregel ist auf < 768 px beschränkt, die
			// Signatur-Trefferfläche selbst nicht) — deshalb hier zusätzlich geprüft, damit dieser
			// Test aus einem tatsächlich auf F-22 zurückgehenden Grund rot ist (siehe
			// Abschlussbericht: die übrige AK-Zusicherung ist durch F-10/F-14 bereits erfüllt).
			const hitArea = await boxOf(page.getByTestId('feature-hitarea-a'));
			expect(hitArea.width).toBeGreaterThanOrEqual(44);
			expect(hitArea.height).toBeGreaterThanOrEqual(44);
		});
	});
});
