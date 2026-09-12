// F-24 · Hervorhebung: Abdunkeln oder Ausblenden — E2E-Tests.
// Quellen: features/F-24-hervorhebung-sichtbarkeit.md (Akzeptanzkriterien, Abschnitte
// „Darstellung", „Interaktion", „Fachregeln"), PRD.md (FR-43, FR-47, NFR-03, AK-17),
// design/03-seekarte.html (Klasse `.dim`, Kopfband-Container `.scope` mit den Umschaltern
// „Hervorhebung"/„Tafel"), features/F-11-selektion.md (highlightMode, `.dim`, Bauart und Ort
// des bestehenden Umschalters „Hervorhebung" im Kopfband), e2e/F-11-selektion.spec.ts (Testmuster
// seedMap, effectiveOpacity), features/STATUS.md, Abschnitt „Bekannte Fehler / Bugfixes",
// Eintrag „Bug B" (12.09., wörtliche Nutzeranweisung: „Der Schalter zur Auswahl zwischen
// Abdunkeln und Ausblenden sollte in die Headerleiste links neben den Schalter für die
// Hervorhebung [stehen].").
//
// Bug B ersetzt ausdrücklich die frühere, am 11.09. getroffene Festlegung, den Umschalter im
// Menü „Ansicht ▾" unterzubringen (festgehalten in features/STATUS.md, Abschnitt
// „Entscheidungen des Orchestrators", 11.09., und zuvor in diesen Tests umgesetzt). Der Nutzer
// hat den Ort jetzt direkt und wörtlich neu bestimmt: das Kopfband, unmittelbar links neben dem
// bestehenden Umschalter „Hervorhebung" — kein Menü mehr. Diese Tests bilden nur noch den neuen
// Ort ab; die frühere Menü-Platzierung ist kein gültiger Zustand mehr.
//
// Vertrag für den Feature-Agenten — keine neuen data-testid nötig, alles über Rolle/Text bzw.
// bereits vergebene Kennzeichen aus F-08/F-09/F-10/F-11 ansprechbar
// (feature-node-<id>, feature-hitarea-<id>, feature-halo-<id>, edge-<from>-<to>-<type>):
//   - Der Umschalter sitzt direkt im Kopfband (demselben Container wie der Umschalter
//     „Hervorhebung" aus F-11, `.scope` in src/routes/+page.svelte), nicht mehr im Menü
//     „Ansicht" und nicht mehr hinter einem Menü-Knopf verborgen — ohne jede Interaktion nach
//     dem Laden der Seite sichtbar.
//   - Er steht im Kopfband unmittelbar VOR (links von) dem Umschalter „Hervorhebung", innerhalb
//     desselben Containers.
//   - Bauart unverändert: `role="group"` mit `aria-label="Sichtbarkeit nicht beteiligter
//     Elemente"`, zwei Knöpfe mit sichtbarem Text „Abdunkeln" und „Ausblenden" (`aria-pressed`
//     je nachdem, ob `highlightVisibility` „dim" oder „hide" ist) — dieselbe Bauart wie der
//     bestehende Umschalter „Hervorhebung" aus F-11 (`role="group"`, Knöpfe mit `aria-pressed`).

import { expect, test, type Page } from '@playwright/test';

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

/**
 * Tatsächliche (multiplizierte) Deckkraft eines Elements: läuft die Vorfahrenkette bis zum
 * SVG-Wurzelelement hoch und multipliziert jede gesetzte `opacity` (Muster aus
 * e2e/F-11-selektion.spec.ts, dort ausführlich begründet).
 */
async function effectiveOpacity(page: Page, testId: string): Promise<number> {
	return page.evaluate((id) => {
		const el = document.querySelector(`[data-testid="${CSS.escape(id)}"]`);
		if (!el) throw new Error(`Testaufbau: Element mit data-testid ${id} nicht gefunden`);
		let node: Element | null = el;
		let opacity = 1;
		while (node && node.tagName.toLowerCase() !== 'svg') {
			const value = parseFloat(getComputedStyle(node).opacity);
			if (!Number.isNaN(value)) opacity *= value;
			node = node.parentElement;
		}
		return opacity;
	}, testId);
}

/** Der Umschalter aus F-24/Bug B (Vertragsbeschreibung oben) — direkt im Kopfband. */
function sichtbarkeitGruppe(page: Page) {
	return page.getByRole('group', { name: 'Sichtbarkeit nicht beteiligter Elemente' });
}

/**
 * Schaltet auf „Abdunkeln" oder „Ausblenden" um. Der Umschalter steht seit Bug B direkt im
 * Kopfband und ist ohne jede Interaktion (kein Menü zu öffnen) erreichbar.
 */
async function setVisibility(page: Page, value: 'dim' | 'hide'): Promise<void> {
	const knopf = sichtbarkeitGruppe(page).getByRole('button', {
		name: value === 'dim' ? 'Abdunkeln' : 'Ausblenden'
	});
	await knopf.click();
}

/** Der bestehende Umschalter aus F-11 im Kopfband. */
function hervorhebungGruppe(page: Page) {
	return page.getByRole('group', { name: 'Hervorhebung' });
}

const KETTE: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 3, effort: 1 },
	{ id: 'b', label: 'B', impact: 2, effort: 2 },
	{ id: 'c', label: 'C', impact: 1, effort: 3 }
];

test.describe('F-24 · Hervorhebung: Abdunkeln oder Ausblenden', () => {
	// F-24-Akzeptanzkriterien: „Standardzustand ist Abdunkeln; alle bestehenden
	// F-11-Akzeptanzkriterien (AK-06, AK-07) bleiben unverändert erfüllt." Kein Toggle wird
	// betätigt — reiner Ausgangszustand.
	test('startet mit Abdunkeln als Standardzustand, bei dem AK-06 unverändert gilt', async ({
		page
	}) => {
		const UNBETEILIGT: SeedFeature = { id: 'z', label: 'Z', impact: 1, effort: 1 };
		await seedMap(page, [...KETTE, UNBETEILIGT], [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();

		// AK-06 (F-11, unverändert): die Kette bleibt voll sichtbar, ein unbeteiligtes Feature
		// abgedunkelt — nicht ausgeblendet, ohne dass der neue Umschalter je betätigt wurde.
		await expect.poll(() => effectiveOpacity(page, 'feature-node-b')).toBeCloseTo(1, 1);
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);
		await expect(page.getByTestId('feature-node-z')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-z')).toBeCloseTo(0.24, 1);

		// Der Umschalter ist ohne jede weitere Interaktion sichtbar — kein Menü zu öffnen (Bug B).
		await expect(
			sichtbarkeitGruppe(page).getByRole('button', { name: 'Abdunkeln' })
		).toHaveAttribute('aria-pressed', 'true');
		await expect(
			sichtbarkeitGruppe(page).getByRole('button', { name: 'Ausblenden' })
		).toHaveAttribute('aria-pressed', 'false');
	});

	// Bug B, wörtliche Nutzeranweisung: „Der Schalter zur Auswahl zwischen Abdunkeln und
	// Ausblenden sollte in die Headerleiste links neben den Schalter für die Hervorhebung
	// [stehen]." Zwei beobachtbare Prüfungen, keine Implementierungsdetails (keine CSS-Klassen):
	// (1) der Umschalter ist ohne jede Interaktion sichtbar — nicht mehr hinter einem
	// Menü-Knopf erreichbar; (2) er steht im DOM unmittelbar vor dem Umschalter „Hervorhebung"
	// und liegt links von ihm auf derselben Zeile.
	test('steht im Kopfband unmittelbar links neben dem Umschalter „Hervorhebung", nicht mehr hinter dem Menü „Ansicht" erreichbar', async ({
		page
	}) => {
		await seedMap(page, KETTE);
		await page.goto('/');

		// (1) Sichtbar ohne jede Interaktion — insbesondere ohne das Menü „Ansicht" zu öffnen.
		await expect(sichtbarkeitGruppe(page)).toBeVisible();
		await expect(hervorhebungGruppe(page)).toBeVisible();

		// (2a) Reihenfolge im DOM: von allen derzeit sichtbaren `role="group"`-Elementen der
		// Seite steht „Sichtbarkeit nicht beteiligter Elemente" unmittelbar vor „Hervorhebung" —
		// kein anderes sichtbares Element dazwischen.
		const gruppen = await page.getByRole('group').all();
		const namen = await Promise.all(gruppen.map((gruppe) => gruppe.getAttribute('aria-label')));
		const indexSichtbarkeit = namen.indexOf('Sichtbarkeit nicht beteiligter Elemente');
		const indexHervorhebung = namen.indexOf('Hervorhebung');
		expect(
			indexSichtbarkeit,
			`Umschalter „Sichtbarkeit nicht beteiligter Elemente" nicht unter den sichtbaren Gruppen gefunden: ${JSON.stringify(namen)}`
		).toBeGreaterThanOrEqual(0);
		expect(
			indexHervorhebung,
			'Umschalter „Sichtbarkeit nicht beteiligter Elemente" steht nicht unmittelbar vor „Hervorhebung"'
		).toBe(indexSichtbarkeit + 1);

		// (2b) Bounding-Box-Vergleich: links von „Hervorhebung", auf derselben Zeile des Kopfbands.
		const boxSichtbarkeit = await sichtbarkeitGruppe(page).boundingBox();
		const boxHervorhebung = await hervorhebungGruppe(page).boundingBox();
		expect(boxSichtbarkeit, 'Umschalter „Sichtbarkeit…" liefert keine Bounding Box').not.toBeNull();
		expect(boxHervorhebung, 'Umschalter „Hervorhebung" liefert keine Bounding Box').not.toBeNull();
		expect(boxSichtbarkeit!.x).toBeLessThan(boxHervorhebung!.x);
		expect(Math.abs(boxSichtbarkeit!.y - boxHervorhebung!.y)).toBeLessThan(10);
	});

	// Kernablauf, AK-17: „Umschalten von Abdunkeln auf Ausblenden lässt nicht beteiligte
	// Elemente vollständig verschwinden, ohne die Selektion aufzuheben; Zurückschalten stellt
	// sie abgedunkelt wieder her." Zusätzlich F-24-Akzeptanzkriterien, Zeile 4 (Zurückschalten).
	// Datensatz wie in e2e/F-11-selektion.spec.ts, Test „dunkelt ein Feature ab, das nur eine
	// eingehende requires-Kante … hat": X requires A, A ist selektiert — X bleibt außerhalb der
	// Hervorhebung.
	test('blendet nicht beteiligte Elemente beim Umschalten auf Ausblenden vollständig aus, ohne die Selektion aufzuheben, und stellt sie beim Zurückschalten abgedunkelt wieder her', async ({
		page
	}) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 2, effort: 2 },
				{ id: 'x', label: 'X', impact: 1, effort: 1 }
			],
			[{ from: 'x', to: 'a', type: 'requires' }]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-x')).toBeCloseTo(0.24, 1);
		await expect(page.getByTestId('edge-x-a-requires')).toBeVisible();

		await setVisibility(page, 'hide');

		// Vollständig aus der Darstellung entfernt: kein Platzhalter, keine Trefferfläche
		// (PRD, Abschnitt 5.6 „Visuelle Kodierung", Zeile „Ausgeblendetes Element").
		await expect(page.getByTestId('feature-node-x')).toBeHidden();
		await expect(page.getByTestId('feature-hitarea-x')).toBeHidden();
		await expect(page.getByTestId('edge-x-a-requires')).toBeHidden();

		// Die Selektion bleibt erhalten: A ist weiterhin selektiert und voll sichtbar.
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-a')).toBeCloseTo(1, 1);

		await setVisibility(page, 'dim');

		// Zurückschalten stellt X abgedunkelt wieder her — nicht wieder voll sichtbar.
		await expect(page.getByTestId('feature-node-x')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-x')).toBeCloseTo(0.24, 1);
		await expect(page.getByTestId('edge-x-a-requires')).toBeVisible();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
	});

	// F-24-Akzeptanzkriterien, Zeile 3: „Im Modus nur direkte + Ausblenden verschwindet ein nur
	// transitiv verbundenes Feature vollständig, nicht nur abgedunkelt." Kette A → B → C
	// (requires): C ist nur transitiv mit A verbunden.
	test('lässt ein nur transitiv verbundenes Feature im Modus „Nur direkte" + Ausblenden vollständig verschwinden', async ({
		page
	}) => {
		await seedMap(page, KETTE, [
			{ from: 'a', to: 'b', type: 'requires' },
			{ from: 'b', to: 'c', type: 'requires' }
		]);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		// Ausgangslage, transitiv (Standard): C ist hervorgehoben.
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(1, 1);

		await hervorhebungGruppe(page).getByRole('button', { name: 'Nur direkte' }).click();
		// Nur direkte, weiterhin Abdunkeln: C abgedunkelt, aber noch sichtbar (F-11 unverändert).
		await expect(page.getByTestId('feature-node-c')).toBeVisible();
		await expect.poll(() => effectiveOpacity(page, 'feature-node-c')).toBeCloseTo(0.24, 1);

		await setVisibility(page, 'hide');

		// Jetzt vollständig ausgeblendet statt nur abgedunkelt.
		await expect(page.getByTestId('feature-node-c')).toBeHidden();
		await expect(page.getByTestId('feature-hitarea-c')).toBeHidden();
		// B bleibt direkter Nachbar von A und damit voll sichtbar.
		await expect.poll(() => effectiveOpacity(page, 'feature-node-b')).toBeCloseTo(1, 1);
	});

	// F-24-Akzeptanzkriterien, Zeile 5: „Ausgeblendete Elemente sind nicht klickbar und nicht
	// per Tab erreichbar."
	test('macht ausgeblendete Elemente weder klickbar noch per Tab erreichbar', async ({ page }) => {
		await seedMap(
			page,
			[
				{ id: 'a', label: 'A', impact: 2, effort: 2 },
				{ id: 'x', label: 'X', impact: 1, effort: 1 }
			],
			[{ from: 'x', to: 'a', type: 'requires' }]
		);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		// Position der noch sichtbaren (abgedunkelten) Trefferfläche von X vor dem Ausblenden
		// festhalten, weil ein ausgeblendetes Element keine Bounding Box mehr liefert.
		const box = await page.getByTestId('feature-hitarea-x').boundingBox();
		expect(box, 'Trefferfläche von X sollte vor dem Ausblenden eine Bounding Box haben').not.toBeNull();

		await setVisibility(page, 'hide');
		await expect(page.getByTestId('feature-node-x')).toBeHidden();

		// Nicht klickbar: ein echter Mausklick an der vormaligen Position von X trifft freie
		// Fläche (kein Halo für X) und hebt die Selektion von A entsprechend FR-46 auf.
		await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
		await expect(page.getByTestId('feature-halo-x')).toHaveCount(0);
		await expect(page.getByTestId('feature-halo-a')).toHaveCount(0);

		// Nicht per Tab erreichbar: ein Fokussierversuch auf die (falls überhaupt noch im DOM
		// vorhandene) Trefferfläche von X darf nicht greifen.
		const fokusGesetzt = await page.evaluate(() => {
			const el = document.querySelector('[data-testid="feature-hitarea-x"]') as HTMLElement | null;
			if (!el) return false;
			el.focus();
			return document.activeElement === el;
		});
		expect(fokusGesetzt, 'Ausgeblendete Trefferfläche sollte nicht fokussierbar sein').toBe(false);
	});

	// F-24-Akzeptanzkriterien, Zeile 6 / NFR-03: „Bei 100 Features/300 Kanten bleibt der Wechsel
	// unter 50 ms." Aufbau wie in e2e/F-11-selektion.spec.ts (Test „hebt bei 100 Features und
	// 300 Kanten innerhalb von 50 ms hervor"): direkt im Browser zwischen dem dispatchten
	// Klick-Event und dem übernächsten Animationsframe gemessen, unabhängig von der
	// Playwright-IPC-Laufzeit. Modus „Nur direkte" vor der Messung gesetzt (nicht mitgemessen):
	// die vollständige requires-Kette dieses Datensatzes würde im Standardmodus „transitiv"
	// sonst restlos alle Features hervorheben (siehe Kommentar in e2e/F-11-selektion.spec.ts
	// zum selben Datensatz) — ohne ein tatsächlich unbeteiligtes Feature wäre der Nachweis, dass
	// der Wechsel überhaupt etwas verändert, nicht möglich.
	test('wechselt bei 100 Features und 300 Kanten innerhalb von 50 ms auf Ausblenden', async ({
		page
	}) => {
		const features: SeedFeature[] = [];
		for (let i = 0; i < 100; i++) {
			features.push({ id: `f${i}`, impact: 1 + (i % 20), effort: 1 + ((i * 3) % 20) });
		}
		const relations: SeedRelation[] = [];
		for (let i = 0; i < 99; i++) relations.push({ from: `f${i}`, to: `f${i + 1}`, type: 'requires' });
		outer: for (let offset = 1; offset < 100; offset++) {
			for (let from = 0; from < 100; from++) {
				if (relations.length >= 300) break outer;
				const to = (from + offset) % 100;
				relations.push({ from: `f${from}`, to: `f${to}`, type: 'relates' });
			}
		}

		await seedMap(page, features, relations);
		await page.goto('/');
		await expect(page.getByTestId('feature-node-f0')).toBeVisible();

		await page.getByTestId('feature-node-f0').click();
		await hervorhebungGruppe(page).getByRole('button', { name: 'Nur direkte' }).click();
		// Ein weit entferntes, nicht direkt verbundenes Feature bleibt abgedunkelt — Nachweis,
		// dass hier überhaupt etwas umzuschalten ist.
		await expect.poll(() => effectiveOpacity(page, 'feature-node-f50')).toBeLessThan(0.9);

		// Der Umschalter steht seit Bug B direkt im Kopfband, kein Menü zu öffnen — gemessen wird
		// nur der eigentliche Wechsel des Umschalters.
		const duration = await page.evaluate(() => {
			return new Promise<number>((resolve, reject) => {
				const knopf = Array.from(document.querySelectorAll('button')).find(
					(b) => b.textContent?.trim() === 'Ausblenden'
				);
				if (!knopf) {
					reject(new Error('Testaufbau: Knopf "Ausblenden" nicht gefunden'));
					return;
				}
				const start = performance.now();
				knopf.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
				requestAnimationFrame(() => {
					requestAnimationFrame(() => resolve(performance.now() - start));
				});
			});
		});

		await expect(page.getByTestId('feature-node-f50')).toBeHidden();
		expect(duration).toBeLessThan(50);
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich): der Umschalter funktioniert bei 375, 834 und
	// 1440 px ohne horizontales Scrollen.
	for (const breite of BREAKPOINTS) {
		test(`blendet bei ${breite}px nicht beteiligte Elemente ohne horizontales Scrollen aus`, async ({
			page
		}) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(
				page,
				[
					{ id: 'a', label: 'A', impact: 2, effort: 2 },
					{ id: 'x', label: 'X', impact: 1, effort: 1 }
				],
				[{ from: 'x', to: 'a', type: 'requires' }]
			);
			await page.goto('/');

			await page.getByTestId('feature-node-a').click();
			await setVisibility(page, 'hide');

			await expect(page.getByTestId('feature-node-x')).toBeHidden();
			await expect(page.getByTestId('feature-halo-a')).toBeVisible();

			const hatHorizontalenUeberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(hatHorizontalenUeberlauf).toBe(false);
		});
	}
});
