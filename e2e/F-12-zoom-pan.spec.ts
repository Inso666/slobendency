// F-12 · Zoom und Pan — E2E-Tests.
// Quellen: features/F-12-zoom-pan.md (Abschnitte „Verhalten", „Fachregeln",
// „Akzeptanzkriterien"), PRD.md (FR-25, FR-65, NFR-07, UI-14), design/03-seekarte.html
// (Knopf „Ansicht" im Kopfband, `<svg class="map" viewBox="0 0 1000 700">`).
//
// Keine neuen data-testid: Alles Nötige ist bereits über Rolle/Text (Knöpfe „Ansicht" und
// „Ganze Karte zeigen", Rolle "img" der Kartenfläche) oder über von F-08/F-09/F-11 bereits
// vergebene Kennzeichen ansprechbar (feature-node-<id>, feature-halo-<id>, tick-x-<Wert>).
//
// Designentscheidung des Test-Agenten (in den Quellen nicht mit einer Formel festgelegt):
// „Mausrad über der Karte vergrößert" nennt keine Richtung. Diese Tests legen die auf Karten
// übliche Konvention fest — Scrollen nach oben/weg (deltaY < 0) vergrößert, Scrollen nach
// unten/heran (deltaY > 0) verkleinert — und die Klemmformel aus dem Kommentar über
// zoomAt()/panBy() in src/lib/store/viewport.ts. Wären andere Konventionen gewählt worden,
// wäre das ein QA-Befund gegen diese Tests, kein Quellenwiderspruch.
//
// Maßstabsänderungen werden nicht direkt gemessen (kein UI-Element zeigt den Zahlenwert),
// sondern über den Bildschirmabstand zweier fester Punkte: eine reine Verschiebung
// (translate) ändert diesen Abstand nicht, eine Maßstabsänderung skaliert ihn linear mit —
// das macht die Messung unabhängig von der tatsächlichen Bildschirm/ViewBox-Umrechnung.

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

/** Öffnet das Menü „Ansicht" und klickt „Ganze Karte zeigen" (F-12, Abschnitt „Verhalten"). */
async function resetViewFromToolbar(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('button', { name: 'Ganze Karte zeigen' }).click();
}

/** Bewegt die Maus an `point`, verkleinert (factor<1 → deltaY>0) oder vergrößert
 * (factor>1 → deltaY<0) dort per Mausrad, wiederholt `times` mal. */
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

const ZWEI_FEATURES: SeedFeature[] = [
	{ id: 'a', label: 'A', impact: 3, effort: 3 },
	{ id: 'b', label: 'B', impact: 18, effort: 18 }
];

test.describe('F-12 · Zoom und Pan', () => {
	// F-12-AK: „Mausrad über der Karte vergrößert um den Zeiger herum; der Punkt unter dem
	// Zeiger bleibt an Ort und Stelle." FR-25.
	test('vergrößert per Mausrad um den Zeiger, sodass der Punkt darunter an Ort und Stelle bleibt', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);

		await wheelAt(page, pointerPos, 'in', 3);

		const afterPointerPos = await centerOfTestId(page, 'feature-node-a');
		// Der Punkt, über dem gezoomt wurde, bleibt an seiner Bildschirmposition.
		expect(distance(pointerPos, afterPointerPos)).toBeLessThan(3);
		// Es hat tatsächlich eine Vergrößerung stattgefunden — sonst wäre der vorige Vergleich
		// auch ganz ohne Umsetzung trivial erfüllt.
		const afterDistance = distance(afterPointerPos, await centerOfTestId(page, 'feature-node-b'));
		expect(afterDistance).toBeGreaterThan(baseline * 1.3);
	});

	// F-12-AK: „Ziehen auf freier Fläche verschiebt die Karte; Ziehen auf einem Feature
	// nicht." FR-25 — hier der erste Teil: Ziehen auf freier Fläche.
	test('verschiebt die Karte, wenn auf freier Fläche gezogen wird', async ({ page }) => {
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

	// F-12-AK, zweiter Teil: „Ziehen auf einem Feature [verschiebt die Karte] nicht — dort
	// gilt der Klick der Selektion" (F-12, Abschnitt „Verhalten"). Kleine Verschiebung, die ein
	// Browser noch als Klick wertet: Selektion findet trotzdem statt, die Karte bleibt stehen.
	// Die Gegenprobe (derselbe Weg ab freier Fläche verschiebt sehr wohl) steht im selben Test:
	// „Die Karte bleibt stehen" wäre ohne jede Umsetzung trivial erfüllt (nichts bewegt sich je),
	// erst der Kontrast zur tatsächlich wirksamen Verschiebung macht ihn aussagekräftig.
	test('verschiebt die Karte nicht, wenn das Ziehen auf einem Feature beginnt, und selektiert stattdessen', async ({
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
		// ein Neuladen liefert nach F-12-AK „Nach einem Neuladen ist wieder die Vollansicht
		// aktiv" denselben Ausgangszustand.
		await page.reload();

		const nodeA = await centerOfTestId(page, 'feature-node-a');
		const beforeB = await centerOfTestId(page, 'feature-node-b');

		await dragMouse(page, nodeA, { x: nodeA.x + 4, y: nodeA.y + 3 });

		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
		const afterB = await centerOfTestId(page, 'feature-node-b');
		expect(distance(beforeB, afterB)).toBeLessThan(3);
	});

	// Gegenprobe zum vorigen Test mit einer größeren, eindeutigen Zugbewegung ab einem
	// Feature: Auch dann verschiebt sich die Karte nicht, obwohl (siehe Test oben) Ziehen an
	// sich sehr wohl wirkt.
	test('verschiebt die Karte auch bei einem weiten Zug ab einem Feature nicht', async ({ page }) => {
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
		// ein Neuladen liefert nach F-12-AK „Nach einem Neuladen ist wieder die Vollansicht
		// aktiv" denselben Ausgangszustand.
		await page.reload();

		const nodeA = await centerOfTestId(page, 'feature-node-a');
		const beforeB = await centerOfTestId(page, 'feature-node-b');

		await dragMouse(page, nodeA, { x: nodeA.x - 150, y: nodeA.y + 150 });

		const afterB = await centerOfTestId(page, 'feature-node-b');
		expect(distance(beforeB, afterB)).toBeLessThan(3);
	});

	// F-12-AK: „Der Maßstab lässt sich nicht unter 0,5 … treiben." Sehr viele Rad-Ereignisse
	// zum Verkleinern, unabhängig vom genauen Faktor je Ereignis, um die Grenze sicher zu
	// erreichen.
	test('lässt sich per Mausrad nicht unter Maßstab 0,5 verkleinern', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');
		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(
			await centerOfTestId(page, 'feature-node-a'),
			await centerOfTestId(page, 'feature-node-b')
		);

		await wheelAt(page, pointerPos, 'out', 60);

		const ratio =
			distance(await centerOfTestId(page, 'feature-node-a'), await centerOfTestId(page, 'feature-node-b')) /
			baseline;
		expect(ratio).toBeGreaterThan(0.5 - 0.08);
		expect(ratio).toBeLessThan(0.5 + 0.08);
	});

	// F-12-AK: „… und nicht über 4 treiben."
	test('lässt sich per Mausrad nicht über Maßstab 4 vergrößern', async ({ page }) => {
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

	// F-12-AK: „Ganze Karte zeigen stellt Maßstab 1 und Ursprung wieder her."
	test('stellt „Ganze Karte zeigen" Maßstab 1 und Ursprung nach Zoom und Pan wieder her', async ({
		page
	}) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const originalA = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(originalA, await centerOfTestId(page, 'feature-node-b'));

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
	});

	// F-12-AK: „Bei Maßstab 4 bleibt die Selektion erhalten und die Hervorhebung korrekt."
	// Die Halo-Zusicherung allein wäre ohne jede Umsetzung trivial erfüllt (ein wirkungsloses
	// Mausrad ändert nichts an einer bereits laufenden Selektion aus F-11) — erst der Nachweis,
	// dass tatsächlich bis Maßstab 4 vergrößert wurde, macht den Test aussagekräftig.
	test('behält Selektion und Halo bei Maßstab 4', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		await page.getByTestId('feature-node-a').click();
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();

		const pointerPos = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(pointerPos, await centerOfTestId(page, 'feature-node-b'));
		await wheelAt(page, pointerPos, 'in', 60);

		const ratio =
			distance(await centerOfTestId(page, 'feature-node-a'), await centerOfTestId(page, 'feature-node-b')) /
			baseline;
		expect(ratio).toBeGreaterThan(4 - 0.5);
		expect(ratio).toBeLessThan(4 + 0.5);
		await expect(page.getByTestId('feature-halo-a')).toBeVisible();
	});

	// F-12-AK: „Nach einem Neuladen ist wieder die Vollansicht aktiv" (F-12, Abschnitt
	// „DDD-Einordnung": der Ausschnitt wird nicht persistiert). Die Zusicherung nach dem
	// Neuladen wäre ohne jede Umsetzung trivial erfüllt (nichts verändert sich je) — erst der
	// Nachweis, dass vor dem Neuladen tatsächlich gezoomt wurde, macht den Test aussagekräftig.
	test('zeigt nach einem Neuladen wieder die Vollansicht', async ({ page }) => {
		await seedMap(page, ZWEI_FEATURES);
		await page.goto('/');

		const originalA = await centerOfTestId(page, 'feature-node-a');
		const baseline = distance(originalA, await centerOfTestId(page, 'feature-node-b'));
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
	});

	// FR-65: „Beide Bildexporte umfassen immer die vollständige Map … unabhängig vom
	// aktuellen Zoom/Pan-Zustand." Der Bildexport selbst ist nicht Teil dieses Features
	// (F-20, F-21); geprüft wird hier die dafür nötige Grundlage aus dem „Umfang"-Abschnitt:
	// Zoom/Pan verändert die ursprüngliche viewBox des SVG nicht.
	// Die Schlusszusicherung allein wäre ohne jede Umsetzung trivial erfüllt (eine statische
	// viewBox, die nie verändert wird, bleibt auch ohne Zoom/Pan gleich) — erst der Nachweis,
	// dass Zoom und Pan tatsächlich stattgefunden haben, macht den Test aussagekräftig.
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

	// UI-14 / F-12, Abschnitt „Verhalten" (Spalte „Mobil"): „Pinch, Zoom auf die Mitte der
	// Geste."
	test('vergrößert per Pinch-Geste um die Mitte der Geste', async ({ page }) => {
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

	// UI-14 / F-12, Abschnitt „Verhalten" (Spalte „Mobil"): „Ein-Finger-Drag" verschiebt.
	test('verschiebt die Karte per Ein-Finger-Drag', async ({ page }) => {
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

	// F-12-AK / NFR-07: „Zoomen und Verschieben laufen bei 100 Features flüssig" — mindestens
	// 30 fps mobil, also höchstens rund 33 ms je aktualisiertem Bild (NFR-07). Gemessen wird,
	// wie beim 50-ms-Selektionstest aus e2e/F-11-selektion.spec.ts, die Zeit zwischen einem
	// dispatchten Rad-Ereignis und dem übernächsten Animationsframe, unabhängig von der
	// Playwright-IPC-Laufzeit.
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
