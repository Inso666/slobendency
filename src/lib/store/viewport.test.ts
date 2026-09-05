// F-12 · Zoom und Pan — Unit-Tests für viewport.ts.
// Quellen: features/F-12-zoom-pan.md (Abschnitte „Umfang", „Verhalten", „Akzeptanzkriterien",
// „Tests"), PRD.md (FR-25). Die genaue Klemmformel steht als Kommentar über zoomAt()/panBy()
// in src/lib/store/viewport.ts — dort vom Test-Agenten festgelegt, weil die Featurebeschreibung
// nur "ein Teil der Plotfläche bleibt sichtbar" fordert, ohne eine Formel zu nennen.

import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { PLOT, VIEWBOX } from '../layout/scales';
import { MAX_SCALE, MIN_SCALE, centerOn, panBy, resetViewport, viewport, zoomAt } from './viewport';

function resetStore(): void {
	viewport.set({ x: 0, y: 0, scale: 1 });
}

describe('viewport store', () => {
	beforeEach(() => {
		resetStore();
	});

	// F-12, Abschnitt „Umfang": "scale 1 = Vollansicht" — der Startwert des Stores.
	it('startet mit der Vollansicht (Ursprung 0/0, Maßstab 1)', () => {
		expect(get(viewport)).toEqual({ x: 0, y: 0, scale: 1 });
	});

	// F-12-AK: "Ganze Karte zeigen stellt Maßstab 1 und Ursprung wieder her."
	it('resetViewport() stellt Maßstab 1 und Ursprung 0/0 wieder her, egal welcher Zustand zuvor galt', () => {
		viewport.set({ x: 123, y: -45, scale: 2.5 });

		resetViewport();

		expect(get(viewport)).toEqual({ x: 0, y: 0, scale: 1 });
	});

	describe('zoomAt() — Zoom um einen Punkt', () => {
		// F-12-AK: "Mausrad über der Karte vergrößert um den Zeiger herum; der Punkt unter dem
		// Zeiger bleibt an Ort und Stelle." FR-25. Gewählt sind Zeiger und Faktor so, dass die
		// Klemmung (Maßstabsgrenzen, Plotflächen-Sichtbarkeit) nicht greift — dieser Test prüft
		// ausschließlich die Fixpunkteigenschaft.
		it('hält den Inhaltspunkt unter dem Zeiger an derselben Stelle, wenn vergrößert wird', () => {
			const pointerX = 500;
			const pointerY = 300;
			// Inhaltspunkt unter dem Zeiger vor dem Zoom, bei scale 1 und Ursprung 0/0: identisch
			// zu (pointerX, pointerY), weil scale(1)·p + 0 = p.
			viewport.set({ x: 0, y: 0, scale: 1 });

			zoomAt(pointerX, pointerY, 2);

			const after = get(viewport);
			expect(after.scale).toBeCloseTo(2, 10);
			// Der Inhaltspunkt (pointerX, pointerY) muss nach dem Zoom wieder auf (pointerX,
			// pointerY) abgebildet werden: after.x + after.scale·pointerX ≈ pointerX.
			expect(after.x + after.scale * pointerX).toBeCloseTo(pointerX, 6);
			expect(after.y + after.scale * pointerY).toBeCloseTo(pointerY, 6);
		});

		it('hält den Inhaltspunkt unter dem Zeiger an derselben Stelle, wenn verkleinert wird, auch bei bereits verschobenem Ausschnitt', () => {
			const pointerX = 400;
			const pointerY = 250;
			viewport.set({ x: 50, y: -30, scale: 2 });
			const before = get(viewport);
			// Inhaltspunkt, der aktuell unter dem Zeiger liegt (Umkehrung von
			// screen = before.x + before.scale·content).
			const contentX = (pointerX - before.x) / before.scale;
			const contentY = (pointerY - before.y) / before.scale;

			zoomAt(pointerX, pointerY, 0.5);

			const after = get(viewport);
			expect(after.scale).toBeCloseTo(1, 10);
			expect(after.x + after.scale * contentX).toBeCloseTo(pointerX, 6);
			expect(after.y + after.scale * contentY).toBeCloseTo(pointerY, 6);
		});

		// F-12-AK: "Der Maßstab lässt sich nicht unter 0,5 und nicht über 4 treiben."
		it('begrenzt den Maßstab nach oben auf MAX_SCALE (4)', () => {
			viewport.set({ x: 0, y: 0, scale: 1 });

			zoomAt(500, 300, 100);

			expect(get(viewport).scale).toBe(MAX_SCALE);
		});

		it('begrenzt den Maßstab nach unten auf MIN_SCALE (0,5)', () => {
			viewport.set({ x: 0, y: 0, scale: 1 });

			zoomAt(500, 300, 0.001);

			expect(get(viewport).scale).toBe(MIN_SCALE);
		});

		it('bleibt bei wiederholtem Herauszoomen exakt bei MIN_SCALE stehen, statt weiter zu sinken', () => {
			viewport.set({ x: 0, y: 0, scale: MIN_SCALE });

			zoomAt(500, 300, 0.5);

			expect(get(viewport).scale).toBe(MIN_SCALE);
		});

		it('bleibt bei wiederholtem Hineinzoomen exakt bei MAX_SCALE stehen, statt weiter zu steigen', () => {
			viewport.set({ x: 0, y: 0, scale: MAX_SCALE });

			zoomAt(500, 300, 2);

			expect(get(viewport).scale).toBe(MAX_SCALE);
		});

		// F-12, Abschnitt „Verhalten", Zeile „Grenzen": "Der Ausschnitt wird so begrenzt, dass
		// immer ein Teil der Plotfläche sichtbar bleibt." — bei starkem Herauszoomen weit weg vom
		// Zeiger würde der Fixpunkt sonst die Plotfläche aus dem Bild schieben; die Klemmung
		// greift dann korrigierend ein.
		it('klemmt den Ausschnitt nach dem Zoom so, dass ein Teil der Plotfläche sichtbar bleibt', () => {
			// Zeiger weit außerhalb der Plotfläche, starkes Verkleinern: ohne Klemmung würde die
			// gesamte Plotfläche aus dem sichtbaren Bereich wandern.
			viewport.set({ x: 0, y: 0, scale: 4 });

			zoomAt(-5000, -5000, 0.01);

			const after = get(viewport);
			const minX = -after.scale * PLOT.right;
			const maxX = VIEWBOX.width - after.scale * PLOT.left;
			const minY = -after.scale * PLOT.bottom;
			const maxY = VIEWBOX.height - after.scale * PLOT.top;
			expect(after.x).toBeGreaterThanOrEqual(minX - 1e-6);
			expect(after.x).toBeLessThanOrEqual(maxX + 1e-6);
			expect(after.y).toBeGreaterThanOrEqual(minY - 1e-6);
			expect(after.y).toBeLessThanOrEqual(maxY + 1e-6);
		});
	});

	describe('panBy() — Verschieben', () => {
		// F-12, Abschnitt „Verhalten": "Ziehen auf freier Fläche verschiebt die Karte."
		it('verschiebt den Ursprung um (dx, dy), wenn die Klemmung nicht greift', () => {
			viewport.set({ x: 10, y: 20, scale: 1 });

			panBy(30, -15);

			const after = get(viewport);
			expect(after.x).toBeCloseTo(40, 6);
			expect(after.y).toBeCloseTo(5, 6);
			expect(after.scale).toBe(1);
		});

		// F-12, Abschnitt „Verhalten", Zeile „Grenzen": Sichtbarkeitsklemmung wie bei zoomAt().
		it('klemmt eine sehr weite Verschiebung, sodass ein Teil der Plotfläche sichtbar bleibt', () => {
			viewport.set({ x: 0, y: 0, scale: 1 });

			panBy(1_000_000, 1_000_000);

			const after = get(viewport);
			const maxX = VIEWBOX.width - after.scale * PLOT.left;
			const maxY = VIEWBOX.height - after.scale * PLOT.top;
			expect(after.x).toBeCloseTo(maxX, 6);
			expect(after.y).toBeCloseTo(maxY, 6);
		});

		it('klemmt eine sehr weite Verschiebung in die Gegenrichtung ebenso', () => {
			viewport.set({ x: 0, y: 0, scale: 1 });

			panBy(-1_000_000, -1_000_000);

			const after = get(viewport);
			const minX = -after.scale * PLOT.right;
			const minY = -after.scale * PLOT.bottom;
			expect(after.x).toBeCloseTo(minX, 6);
			expect(after.y).toBeCloseTo(minY, 6);
		});
	});

	describe('centerOn() — Zentrieren (für F-14)', () => {
		// F-12, Abschnitt „Umfang": "centerOn(x, y) — für F-14." Zentriert auf den übergebenen
		// Punkt, ohne den Maßstab zu ändern.
		it('zentriert den Ausschnitt auf den übergebenen Punkt, ohne den Maßstab zu ändern', () => {
			viewport.set({ x: 999, y: 999, scale: 2 });

			centerOn(480, 350);

			const after = get(viewport);
			expect(after.scale).toBeCloseTo(2, 10);
			// Der Punkt (480, 350) muss danach auf die Mitte von VIEWBOX abgebildet werden.
			expect(after.x + after.scale * 480).toBeCloseTo(VIEWBOX.width / 2, 6);
			expect(after.y + after.scale * 350).toBeCloseTo(VIEWBOX.height / 2, 6);
		});

		it('lässt den Maßstab unverändert, auch wenn er nicht 1 ist', () => {
			viewport.set({ x: 0, y: 0, scale: 3 });

			centerOn(100, 100);

			expect(get(viewport).scale).toBeCloseTo(3, 10);
		});
	});
});
