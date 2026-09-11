// F-25 · Datenzoom — E2E-Tests.
// Quellen: features/F-25-datenzoom.md (Abschnitte „Verhalten", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (FR-25 geändert, FR-26, FR-65, NFR-07, UI-14, 7.3
// „Datenzoom (FR-25)"), design/03-seekarte.html (Knopf „Ansicht" im Kopfband,
// `<svg class="map" viewBox="0 0 1000 700">`), features/STATUS.md Abschnitt „Entscheidungen
// des Orchestrators" („PRD 1.1 — drei Erweiterungen aus Nutzergespräch (11.09.)": Datenzoom
// als echter Datenzoom, Punkt-/Schriftgrößen bleiben bildschirmkonstant, Teilstriche im
// gezoomten Zustand generisch rund statt Fibonacci).
//
// Ersetzt e2e/F-12-zoom-pan.spec.ts (F-25, Abschnitt „Ziel": „ersetzt das Zoom-Verhalten aus
// F-12"). Die alte Datei wird hier bewusst nicht angefasst — das entscheidet der Orchestrator
// (siehe Abschlussbericht des Test-Agenten).
//
// Keine neuen data-testid: Alles Nötige ist über Rolle/Text (Knöpfe „Ansicht" und „Ganze Karte
// zeigen", Rolle "img" der Kartenfläche) oder über von F-08/F-09/F-11 bereits vergebene
// Kennzeichen ansprechbar (feature-node-<id>, feature-halo-<id>, feature-label-<id>,
// tick-x-<Wert>, map-frame).
//
// Designentscheidungen des Test-Agenten (in den Quellen nicht mit einer Formel/einem Wert
// festgelegt):
// 1. Mausrad-Richtung: „Mausrad über der Karte verkleinert visibleRange" (AK-18) nennt keine
//    Scrollrichtung. Wie schon beim F-12-Vorgänger gilt hier die auf Karten übliche Konvention:
//    Scrollen nach oben/weg (deltaY < 0) verkleinert visibleRange (zoomt hinein), Scrollen nach
//    unten/heran (deltaY > 0) vergrößert visibleRange (zoomt heraus) — bis zur durch die Formel
//    vorgegebenen Grenze domainMax (kein Herauszoomen darüber hinaus).
// 2. Maßstabsänderungen (visibleRange) werden nicht direkt gemessen (kein UI-Element zeigt den
//    Zahlenwert), sondern über den Bildschirmabstand zweier fester Punkte: bei festem PLOT
//    skaliert dieser Abstand linear mit domainMax / visibleRange — bei domainMax = 22 und
//    minimalem visibleRange = domainMax / 4 also um den Faktor 4, exakt wie beim vorigen
//    Maßstabsmaximum aus F-12, was dieselben Toleranzwerte wiederverwendbar macht.
// 3. „Datenzoom, nicht Bildskalierung" (FR-25) wird zusätzlich über die Teilstrichbeschriftungen
//    selbst geprüft: Im gezoomten Zustand unterscheidet sich die Menge der sichtbaren
//    x-Teilstrichwerte von der Fibonacci-Menge der Vollansicht — eine reine Bildtransformation
//    (wie noch in F-12) hätte dieselben Teilstrichwerte nur verschoben/skaliert dargestellt,
//    nie neu berechnet.
// 4. Bildschirmkonstante Punktradien/Schriftgrößen (F-25-AK) werden über die Bounding Box von
//    feature-node-<id> (Kreisdurchmesser) und feature-label-<id> (Texthöhe) vor und nach dem
//    Zoom verglichen, nicht über CSS-Werte — das prüft das tatsächlich gerenderte Ergebnis,
//    unabhängig vom gewählten Umsetzungsweg (Feature-Agent).

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

type Box = { x: number; y: number; width: number; height: number };

function centerOf(box: Box): { x: number; y: number } {
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function centerOfTestId(page: Page, testId: string): Promise<{ x: number; y: number }> {
	const box = await page.getByTestId(testId).boundingBox();
	expect(box, `${testId} sollte eine sichtbare Bounding Box haben`).not.toBeNull();
	return centerOf(box!);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Öffnet das Menü „Ansicht" und klickt „Ganze Karte zeigen" (F-25, Abschnitt „Verhalten",
 * unverändert gegenüber F-12). */
async function resetViewFromToolbar(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('button', { name: 'Ganze Karte zeigen' }).click();
}

/** Bewegt die Maus an `point`, vergrößert (direction 'in' → deltaY<0, verkleinert
 * visibleRange) oder verkleinert (direction 'out' → deltaY>0, vergrößert visibleRange) dort
 * per Mausrad, wiederholt `times` mal. */
async function wheelAt(
	page: Page,
	point: { x: number; y: number },
	direction: 'in' | 'out',
	times = 1
): Promise<void> {
	await page.mouse.move(point.x, point.y);
	for (let i = 0; i < times; i++) {
		await page.mouse.wheel(0, direction === 'in' ? -240 : 240);
	}
}

/** Zieht die Maus von `from` nach `to` in mehreren Schritten (löst Pointer-/Mousemove-Events
 * entlang des Wegs aus, nicht nur am Ziel). */
async function dragMouse(
	page: Page,
	from: { x: number; y: number },
	to: { x: number; y: number }
): Promise<void> {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(to.x, to.y, { steps: 10 });
	await page.mouse.up();
}

/** Simuliert eine Ein-Finger-Drag-Geste per synthetischem TouchEvent (Playwrights
 * `touchscreen` kennt nur `tap`, kein Drag/Pinch mit mehreren Punkten). */
async function touchDrag(
	page: Page,
	targetTestId: string,
	from: { x: number; y: number },
	to: { x: number; y: number }
): Promise<void> {
	await page.evaluate(
		({ targetTestId, from, to }) => {
			const el = document.querySelector(`[data-testid="${CSS.escape(targetTestId)}"]`) as Element;
			function touch(point: { x: number; y: number }, id: number): Touch {
				return new Touch({
					identifier: id,
					target: el,
					clientX: point.x,
					clientY: point.y
				});
			}
			function fire(type: string, touches: Touch[]): void {
				el.dispatchEvent(
					new TouchEvent(type, {
						bubbles: true,
						cancelable: true,
						touches,
						targetTouches: touches,
						changedTouches: touches
					})
				);
			}
			fire('touchstart', [touch(from, 1)]);
			const steps = 5;
			for (let i = 1; i <= steps; i++) {
				const point = {
					x: from.x + ((to.x - from.x) * i) / steps,
					y: from.y + ((to.y - from.y) * i) / steps
				};
				fire('touchmove', [touch(point, 1)]);
			}
			fire('touchend', [touch(to, 1)]);
		},
		{ targetTestId, from, to }
	);
}

/** Simuliert eine Pinch-Geste (zwei Finger, die sich vom Zentrum weg oder aufeinander zu
 * bewegen) per synthetischem TouchEvent. */
async function touchPinch(
	page: Page,
	targetTestId: string,
	center: { x: number; y: number },
	direction: 'apart' | 'together'
): Promise<void> {
	await page.evaluate(
		({ targetTestId, center, direction }) => {
			const el = document.querySelector(`[data-testid="${CSS.escape(targetTestId)}"]`) as Element;
			function touch(point: { x: number; y: number }, id: number): Touch {
				return new Touch({ identifier: id, target: el, clientX: point.x, clientY: point.y });
			}
			function fire(type: string, touches: Touch[]): void {
				el.dispatchEvent(
					new TouchEvent(type, {
						bubbles: true,
						cancelable: true,
						touches,
						targetTouches: touches,
						changedTouches: touches
					})
				);
			}
			const startOffset = 20;
			const endOffset = direction === 'apart' ? 100 : 5;
			const a0 = { x: center.x - startOffset, y: center.y };
			const b0 = { x: center.x + startOffset, y: center.y };
			fire('touchstart', [touch(a0, 1), touch(b0, 2)]);
			const steps = 5;
			for (let i = 1; i <= steps; i++) {
				const offset = startOffset + ((endOffset - startOffset) * i) / steps;
				const a = { x: center.x - offset, y: center.y };
				const b = { x: center.x + offset, y: center.y };
				fire('touchmove', [touch(a, 1), touch(b, 2)]);
			}
			const aEnd = { x: center.x - endOffset, y: center.y };
			const bEnd = { x: center.x + endOffset, y: center.y };
			fire('touchend', [touch(aEnd, 1), touch(bEnd, 2)]);
		},
		{ targetTestId, center, direction }
	);
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
	return page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth
	);
}

/** Liest die aktuell sichtbaren x-Teilstrichbeschriftungen (F-08/F-25, tick-x-<Wert>). */
async function xTickTexts(page: Page): Promise<string[]> {
	return page.locator('[data-testid^="tick-x-"]').allTextContents();
}

const ZWEI_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 3, effort: 3 },
	{ id: 'b', label: 'B', impact: 18, effort: 18 }
];

// „a" und „c" liegen nah beieinander, damit beide auch im vollständig hineingezoomten Fenster
// (visibleRange = domainMax / 4 um „a") noch sichtbar sind; „b" liegt weit entfernt.
const DREI_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 3, effort: 3 },
	{ id: 'c', label: 'C', impact: 4, effort: 2 },
	{ id: 'b', label: 'B', impact: 18, effort: 18 }
];

test.describe('F-25 · Datenzoom', () => {
	// Kernablauf (F-25, Abschnitt „Ziel"; AK-18): Mausrad verkleinert visibleRange, der
	// Wertepunkt unter dem Zeiger bleibt unter dem Zeiger, und die Achsen zeigen tatsächlich neu
	// berechnete Teilstriche (Datenzoom) statt nur eines skalierten Bildes.
	test('verkleinert visibleRange per Mausrad um den Zeiger, hält den Wertepunkt darunter fest und berechnet die Achsen neu (AK-18)', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const baselineTicks = await xTickTexts(page);
		expect(baselineTicks).toEqual(['1', '2', '3', '5', '8', '13', '21']);

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);

		await wheelAt(page, pointerPos, 'in', 3);

		const afterPointerPos = await centerOfTestId(page, 'feature-node-a');
		// Der Wertepunkt, über dem gezoomt wurde, bleibt an seiner Bildschirmposition.
		expect(distance(pointerPos, afterPointerPos)).toBeLessThan(3);
		// Es hat tatsächlich eine Verkleinerung von visibleRange stattgefunden — sonst wäre der
		// vorige Vergleich auch ganz ohne Umsetzung trivial erfüllt.
		const afterDistance = distance(afterPointerPos, await centerOfTestId(page, 'feature-node-b'));
		expect(afterDistance).toBeGreaterThan(baseline * 1.3);
		// Datenzoom statt Bildskalierung: Die Achsen zeigen jetzt andere Teilstrichwerte als in
		// der Vollansicht, nicht dieselben Fibonacci-Werte nur verschoben/reskaliert.
		expect(await xTickTexts(page)).not.toEqual(baselineTicks);
	});

	// F-25-AK: „Bei visibleRange = domainMax / 4 zeigen die Achsen neu berechnete, runde
	// Teilstriche für das sichtbare Fenster, nicht mehr zwingend die Fibonacci-Werte."
	test('zeigt bei maximaler Vergrößerung runde Teilstriche statt der Fibonacci-Werte', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		await wheelAt(page, pointerPos, 'in', 60);

		const ticks = await xTickTexts(page);
		expect(ticks).not.toEqual(['1', '2', '3', '5', '8', '13', '21']);
	});

	// F-25-AK: „visibleRange lässt sich nicht unter domainMax / 4 … treiben." Formel:
	// „4x maximal hineingezoomt" — der Bildschirmabstand zweier fester Punkte wächst dadurch
	// höchstens um den Faktor domainMax / (domainMax / 4) = 4 gegenüber der Vollansicht.
	test('lässt sich per Mausrad nicht über den Faktor 4 hinaus hineinzoomen', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');
		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);

		await wheelAt(page, pointerPos, 'in', 60);

		const ratio =
			distance(await centerOfTestId(page, 'feature-node-a'), await centerOfTestId(page, 'feature-node-b')) /
			baseline;
		expect(ratio).toBeGreaterThan(4 - 0.5);
		expect(ratio).toBeLessThan(4 + 0.5);
	});

	// F-25-AK: „… und nicht über domainMax treiben." Formel-Kommentar: „kein Herauszoomen
	// darüber hinaus" — anders als beim F-12-Vorgänger (dort bis Maßstab 0,5 möglich) hat
	// Herauszoomen aus der Vollansicht gar keine Wirkung mehr.
	test('lässt sich per Mausrad nicht über die volle Ansicht hinaus herauszoomen', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');
		const baseline = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		const pointerPos = await centerOfTestId(page, 'feature-node-a');

		await wheelAt(page, pointerPos, 'out', 30);

		const afterDistance = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		expect(Math.abs(afterDistance - baseline)).toBeLessThan(baseline * 0.05);
	});

	// F-25-AK: „*Ganze Karte zeigen* stellt visibleRange = domainMax und die zentrierte Ansicht
	// wieder her."
	test('stellt „Ganze Karte zeigen" visibleRange = domainMax und die zentrierte Ansicht nach Zoom und Pan wieder her', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const originalA = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(originalA, await centerOfTestId(page, 'feature-node-b'));
		const baselineTicks = await xTickTexts(page);

		await wheelAt(page, originalA, 'in', 3);
		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		await dragMouse(page, { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 }, {
			x: mapBox!.x + mapBox!.width * 0.7,
			y: mapBox!.y + mapBox!.height * 0.3
		});

		await resetViewFromToolbar(page);

		const restoredA = await centerOfTestId(page, 'feature-node-a');
		const restoredDistance = distance(restoredA, await centerOfTestId(page, 'feature-node-b'));
		expect(distance(originalA, restoredA)).toBeLessThan(3);
		expect(Math.abs(restoredDistance - baseline)).toBeLessThan(baseline * 0.05);
		expect(await xTickTexts(page)).toEqual(baselineTicks);
	});

	// F-25-AK: „Punktradius und Schriftgröße eines Features sind bei visibleRange = domainMax
	// und bei visibleRange = domainMax / 4 identisch groß auf dem Bildschirm." Anders als beim
	// F-12-Vorgänger (dort skalierten Punktradien/Schriftgrößen mit dem Maßstab) entfällt hier
	// jede bildschirmabhängige Größenänderung (features/STATUS.md, Entscheidung „PRD 1.1 …
	// (11.09.)": „damit entfällt die bisherige Mindestschriftgröße aus F-12").
	test('hält Punktradius und Schriftgröße eines Features beim Hineinzoomen bildschirmkonstant', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const nodeBefore = await page.getByTestId('feature-node-a').boundingBox();
		const labelBefore = await page.getByTestId('feature-label-a').boundingBox();
		expect(nodeBefore, 'Signatur sollte eine sichtbare Bounding Box haben').not.toBeNull();
		expect(labelBefore, 'Beschriftung sollte eine sichtbare Bounding Box haben').not.toBeNull();

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		await wheelAt(page, pointerPos, 'in', 60);

		const nodeAfter = await page.getByTestId('feature-node-a').boundingBox();
		const labelAfter = await page.getByTestId('feature-label-a').boundingBox();
		expect(nodeAfter, 'Signatur sollte nach dem Zoom weiterhin eine sichtbare Bounding Box haben').not.toBeNull();
		expect(labelAfter, 'Beschriftung sollte nach dem Zoom weiterhin eine sichtbare Bounding Box haben').not.toBeNull();

		expect(nodeAfter!.width).toBeCloseTo(nodeBefore!.width, 0);
		expect(nodeAfter!.height).toBeCloseTo(nodeBefore!.height, 0);
		expect(labelAfter!.height).toBeCloseTo(labelBefore!.height, 0);
	});

	// F-25-AK, erster Teil: „Ziehen auf freier Fläche verschiebt den Ausschnitt …"
	test('verschiebt den Ausschnitt, wenn auf freier Fläche gezogen wird', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const before = await centerOfTestId(page, 'feature-node-a');
		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		expect(mapBox).not.toBeNull();
		// Oben rechts in der Plotfläche: beide Testfeatures liegen deutlich darunter/links.
		const freieStelle = { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 };

		await dragMouse(page, freieStelle, { x: freieStelle.x - 120, y: freieStelle.y + 80 });

		const after = await centerOfTestId(page, 'feature-node-a');
		expect(distance(before, after)).toBeGreaterThan(40);
	});

	// F-25-AK, zweiter Teil: „… Ziehen auf einem Feature [verschiebt den Ausschnitt] nicht —
	// dort gilt der Klick der Selektion" (F-25, Abschnitt „Verhalten"). Kleine Verschiebung, die
	// ein Browser noch als Klick wertet: Selektion findet trotzdem statt, der Ausschnitt bleibt
	// stehen. Die Gegenprobe (derselbe Weg ab freier Fläche verschiebt sehr wohl) steht im
	// selben Test, damit „der Ausschnitt bleibt stehen" nicht ohne jede Umsetzung trivial erfüllt
	// wäre.
	test('verschiebt den Ausschnitt nicht, wenn das Ziehen auf einem Feature beginnt, und selektiert stattdessen', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		expect(mapBox).not.toBeNull();
		const freieStelle = { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 };
		const beforeGegenprobe = await centerOfTestId(page, 'feature-node-b');
		await dragMouse(page, freieStelle, { x: freieStelle.x - 120, y: freieStelle.y + 80 });
		expect(distance(beforeGegenprobe, await centerOfTestId(page, 'feature-node-b'))).toBeGreaterThan(40);
		// Zurück zur Vollansicht ohne die noch nicht existente Kopfband-Bedienung anzufassen:
		// ein Neuladen liefert nach F-25-AK „Nach einem Neuladen ist wieder die Vollansicht
		// aktiv" denselben Ausgangszustand.
		await page.reload();

		const nodeA = await centerOfTestId(page, 'feature-node-a');
		const beforeB = await centerOfTestId(page, 'feature-node-b');

		await dragMouse(page, nodeA, { x: nodeA.x + 4, y: nodeA.y + 3 });

		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		const afterB = await centerOfTestId(page, 'feature-node-b');
		expect(distance(beforeB, afterB)).toBeLessThan(3);
	});

	// Gegenprobe zum vorigen Test mit einer größeren, eindeutigen Zugbewegung ab einem Feature.
	test('verschiebt den Ausschnitt auch bei einem weiten Zug ab einem Feature nicht', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		expect(mapBox).not.toBeNull();
		const freieStelle = { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 };
		const beforeGegenprobe = await centerOfTestId(page, 'feature-node-b');
		await dragMouse(page, freieStelle, { x: freieStelle.x - 120, y: freieStelle.y + 80 });
		expect(distance(beforeGegenprobe, await centerOfTestId(page, 'feature-node-b'))).toBeGreaterThan(40);
		await page.reload();

		const nodeA = await centerOfTestId(page, 'feature-node-a');
		const beforeB = await centerOfTestId(page, 'feature-node-b');

		await dragMouse(page, nodeA, { x: nodeA.x - 150, y: nodeA.y + 150 });

		const afterB = await centerOfTestId(page, 'feature-node-b');
		expect(distance(beforeB, afterB)).toBeLessThan(3);
	});

	// F-25-AK: „Bei visibleRange = domainMax / 4 bleiben Selektion und Hervorhebung aus
	// F-11/F-24 korrekt." „c" liegt nah bei „a" und bleibt damit im hineingezoomten Fenster
	// sichtbar, „b" liegt weit weg (siehe Kommentar über DREI_FEATURES).
	test('behält Selektion und Hervorhebung bei maximaler Vergrößerung', async ({ page }) => {
		await seedMap(page, DREI_FEATURES);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect(page.getByTestId('feature-node-c')).toHaveClass(/dim/);

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		await wheelAt(page, pointerPos, 'in', 60);

		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		await expect(page.getByTestId('feature-node-c')).toBeVisible();
		await expect(page.getByTestId('feature-node-c')).toHaveClass(/dim/);
	});

	// F-25-AK: „Nach einem Neuladen ist wieder die Vollansicht (visibleRange = domainMax)
	// aktiv" (F-25, Abschnitt „DDD-Einordnung": der Ausschnitt wird nicht persistiert). Die
	// Zusicherung nach dem Neuladen wäre ohne jede Umsetzung trivial erfüllt — erst der Nachweis,
	// dass vor dem Neuladen tatsächlich gezoomt wurde, macht den Test aussagekräftig.
	test('zeigt nach einem Neuladen wieder die Vollansicht', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const originalA = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(originalA, await centerOfTestId(page, 'feature-node-b'));
		const baselineTicks = await xTickTexts(page);
		await wheelAt(page, originalA, 'in', 5);

		const zoomedDistance = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		expect(Math.abs(zoomedDistance - baseline)).toBeGreaterThan(baseline * 0.1);

		await page.reload();

		const afterReloadA = await centerOfTestId(page, 'feature-node-a');
		const afterReloadDistance = distance(afterReloadA, await centerOfTestId(page, 'feature-node-b'));
		expect(distance(originalA, afterReloadA)).toBeLessThan(3);
		expect(Math.abs(afterReloadDistance - baseline)).toBeLessThan(baseline * 0.05);
		expect(await xTickTexts(page)).toEqual(baselineTicks);
	});

	// FR-65: „Der Bildexport umfasst immer die vollständige Karte, unabhängig vom Ausschnitt"
	// (unverändert, F-20/F-21 — nicht Teil dieses Features). Geprüft wird hier die dafür nötige
	// Grundlage aus dem „Umfang"-Abschnitt: Zoom/Pan verändert die ursprüngliche viewBox des SVG
	// nicht, weil der Ausschnitt über neu berechnete Achsen wirkt, nicht über eine Transformation
	// des SVG selbst.
	test('lässt die viewBox der Karte beim Zoomen und Verschieben unverändert', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const originalViewBox = await map.getAttribute('viewBox');
		expect(originalViewBox).toBe('0 0 1000 700');

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(pointerPos, await centerOfTestId(page, 'feature-node-b'));
		await wheelAt(page, pointerPos, 'in', 3);
		const zoomedDistance = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		expect(Math.abs(zoomedDistance - baseline)).toBeGreaterThan(baseline * 0.1);

		const mapBox = await map.boundingBox();
		await dragMouse(page, { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 }, {
			x: mapBox!.x + mapBox!.width * 0.6,
			y: mapBox!.y + mapBox!.height * 0.4
		});

		expect(await map.getAttribute('viewBox')).toBe(originalViewBox);
	});

	// UI-14 / F-25, Abschnitt „Verhalten" (Spalte „Mobil"): „Pinch, Zoom auf die Mitte der
	// Geste."
	test('verkleinert visibleRange per Pinch-Geste um die Mitte der Geste', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const before = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		expect(mapBox).not.toBeNull();
		const center = { x: mapBox!.x + mapBox!.width / 2, y: mapBox!.y + mapBox!.height / 2 };

		await touchPinch(page, 'map-frame', center, 'apart');

		const after = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);
		expect(after).toBeGreaterThan(before * 1.2);
	});

	// UI-14 / F-25, Abschnitt „Verhalten" (Spalte „Mobil"): „Ein-Finger-Drag" verschiebt.
	test('verschiebt den Ausschnitt per Ein-Finger-Drag', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const before = await centerOfTestId(page, 'feature-node-a');
		const map = page.getByRole('img', { name: /Streudiagramm/ });
		const mapBox = await map.boundingBox();
		expect(mapBox).not.toBeNull();
		const start = { x: mapBox!.x + mapBox!.width * 0.9, y: mapBox!.y + mapBox!.height * 0.08 };
		const end = { x: start.x - 120, y: start.y + 80 };

		await touchDrag(page, 'map-frame', start, end);

		const after = await centerOfTestId(page, 'feature-node-a');
		expect(distance(before, after)).toBeGreaterThan(40);
	});

	// F-25-AK / NFR-07: „Zoomen und Verschieben laufen bei 100 Features flüssig" — mindestens
	// 30 fps mobil, also höchstens rund 33 ms je aktualisiertem Bild (NFR-07). Gemessen wird,
	// wie beim entsprechenden F-12-Test, die Zeit zwischen einem dispatchten Rad-Ereignis und dem
	// übernächsten Animationsframe, unabhängig von der Playwright-IPC-Laufzeit.
	test('verarbeitet ein Zoom-Ereignis bei 100 Features innerhalb eines 30-fps-Bildbudgets', async ({
		page
	}) => {
		const features: SeedFeature[] = [];
		for (let i = 0; i < 100; i++) {
			features.push({ id: `f${i}`, impact: 1 + (i % 20), effort: 1 + ((i * 3) % 20) });
		}
		await seedMap(page, features);
		await page.goto('/');
		await expect(page.getByTestId('feature-node-f0')).toBeVisible();

		const before = await centerOfTestId(page, 'feature-node-f0');

		const duration = await page.evaluate(() => {
			const el = document.querySelector('[data-testid="map-frame"]');
			if (!el) throw new Error('Testaufbau: map-frame nicht gefunden');
			return new Promise<number>((resolve) => {
				const start = performance.now();
				el.dispatchEvent(
					new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -240, clientX: 500, clientY: 300 })
				);
				requestAnimationFrame(() => {
					requestAnimationFrame(() => resolve(performance.now() - start));
				});
			});
		});

		// Die Zeitmessung allein wäre ohne jede Umsetzung trivial unter dem Budget — erst der
		// Nachweis, dass tatsächlich gezoomt wurde, macht den Test aussagekräftig.
		const after = await centerOfTestId(page, 'feature-node-f0');
		expect(distance(before, after)).toBeGreaterThan(0);
		expect(duration).toBeLessThan(34);
	});

	// Breakpoints aus CLAUDE.md (QA-Abgleich) und PRD UI-18: Zoom und Reset funktionieren bei
	// 375, 834 und 1440 px ohne horizontales Scrollen.
	for (const breite of BREAKPOINTS) {
		test(`zoomt und setzt bei ${breite}px ohne horizontales Scrollen zurück`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 800 });
			await seedMap(page, ZWEI_FEATURES);
			await page.goto('/');

			const pointerPos = await centerOfTestId(page, 'feature-node-a');
			const baseline = distance(pointerPos, await centerOfTestId(page, 'feature-node-b'));

			await wheelAt(page, pointerPos, 'in', 3);
			expect(await hasHorizontalOverflow(page)).toBe(false);

			await resetViewFromToolbar(page);

			const restoredDistance = distance(
				await centerOfTestId(page, 'feature-node-a'),
				await centerOfTestId(page, 'feature-node-b')
			);
			expect(Math.abs(restoredDistance - baseline)).toBeLessThan(baseline * 0.05);
			expect(await hasHorizontalOverflow(page)).toBe(false);
		});
	}
});
