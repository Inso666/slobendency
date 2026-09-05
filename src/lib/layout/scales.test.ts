// F-08 · Kartengerüst — Unit-Tests für scales.ts.
// Quellen: features/F-08-kartengeruest.md (Abschnitte „Umfang", „Fachregeln",
// „Akzeptanzkriterien"), PRD.md (FR-20, FR-21, FR-26), features/README.md (Abschnitt „Zwei
// Präzisierungen…", Revier-Grenze).

import { describe, expect, it } from 'vitest';
import { addFeature, emptyMap } from '../model/validation';
import type { Feature, FeatureMap } from '../model/types';
import { PLOT, VIEWBOX, domainMaxOf, regionRects, ticksOf, xOf, yOf } from './scales';

function feature(overrides: Partial<Feature> = {}): Feature {
	return { id: 'f', impact: 0, effort: 0, ...overrides };
}

function mapWith(...features: Feature[]): FeatureMap {
	let map = emptyMap();
	for (const f of features) {
		const result = addFeature(map, f);
		if (!result.ok) throw new Error('Testaufbau: ungültiges Feature');
		map = result.value;
	}
	return map;
}

describe('VIEWBOX und PLOT (F-08, Abschnitt „Umfang")', () => {
	it('VIEWBOX ist 1000 × 700', () => {
		expect(VIEWBOX).toEqual({ width: 1000, height: 700 });
	});

	it('PLOT umschließt die Plotfläche bei left 80, right 960, top 40, bottom 620', () => {
		expect(PLOT).toEqual({ left: 80, right: 960, top: 40, bottom: 620 });
	});
});

describe('domainMaxOf (FR-26)', () => {
	it('liefert 22 für die leere Karte (F-08-AK: „Bei leerer Karte ist domainMax gleich 22")', () => {
		expect(domainMaxOf(emptyMap())).toBe(22);
	});

	it('liefert 22, solange kein Wert über 21 liegt', () => {
		const map = mapWith(feature({ id: 'a', impact: 13, effort: 21 }));
		expect(domainMaxOf(map)).toBe(22);
	});

	it('verschiebt domainMax auf 35, wenn ein Feature effort = 34 hat (F-08-AK)', () => {
		const map = mapWith(feature({ id: 'a', impact: 1, effort: 34 }));
		expect(domainMaxOf(map)).toBe(35);
	});

	it('berücksichtigt auch impact-Werte oberhalb von 21', () => {
		const map = mapWith(feature({ id: 'a', impact: 40, effort: 1 }));
		expect(domainMaxOf(map)).toBe(41);
	});

	it('nimmt den größten Wert über alle Features hinweg', () => {
		const map = mapWith(
			feature({ id: 'a', impact: 2, effort: 3 }),
			feature({ id: 'b', impact: 30, effort: 1 })
		);
		expect(domainMaxOf(map)).toBe(31);
	});
});

describe('xOf und yOf (FR-20, FR-21)', () => {
	// F-08-AK: „xOf(0, 22) ist 80, xOf(22, 22) ist 960, yOf(0, 22) ist 620, yOf(22, 22) ist 40."
	it('bildet die Randwerte des Wertebereichs auf die Plotflächenränder ab', () => {
		expect(xOf(0, 22)).toBe(80);
		expect(xOf(22, 22)).toBe(960);
		expect(yOf(0, 22)).toBe(620);
		expect(yOf(22, 22)).toBe(40);
	});

	it('legt die Reviergrenze bei domainMax / 2 auf x = 520 und y = 330 (leere Karte)', () => {
		expect(xOf(11, 22)).toBe(520);
		expect(yOf(11, 22)).toBe(330);
	});

	it('hoher Nutzen liegt oben: yOf sinkt mit steigendem impact (FR-21)', () => {
		expect(yOf(5, 22)).toBeGreaterThan(yOf(15, 22));
	});

	it('skaliert alle Positionen mit, wenn domainMax auf 35 wächst', () => {
		expect(xOf(0, 35)).toBe(80);
		expect(xOf(35, 35)).toBe(960);
		expect(yOf(0, 35)).toBe(620);
		expect(yOf(35, 35)).toBe(40);
	});
});

describe('ticksOf (FR-26)', () => {
	it('liefert die Schätzreihe 1, 2, 3, 5, 8, 13, 21 für die leere Karte', () => {
		expect(ticksOf(22)).toEqual([1, 2, 3, 5, 8, 13, 21]);
	});

	it('ergänzt domainMax - 1 als zusätzlichen Teilstrich, sobald ein Wert über 21 vorkommt', () => {
		expect(ticksOf(35)).toEqual([1, 2, 3, 5, 8, 13, 21, 34]);
	});

	it('ergänzt auch knapp oberhalb von 21 den zusätzlichen Teilstrich', () => {
		expect(ticksOf(23)).toEqual([1, 2, 3, 5, 8, 13, 21, 22]);
	});

	it('lässt Werte der Schätzreihe oberhalb von domainMax weg', () => {
		expect(ticksOf(4)).toEqual([1, 2, 3]);
	});
});

describe('regionRects (FR-22, features/README.md „Revier-Grenze")', () => {
	it('liefert für die leere Karte vier Reviere mit den Maßen aus design/03-seekarte.html', () => {
		const rects = regionRects(22);
		expect(rects).toHaveLength(4);

		const byQuadrant = Object.fromEntries(rects.map((r) => [r.quadrant, r]));
		expect(byQuadrant.quickWins).toEqual({
			quadrant: 'quickWins',
			x: 80,
			y: 40,
			width: 440,
			height: 290
		});
		expect(byQuadrant.grosseVorhaben).toEqual({
			quadrant: 'grosseVorhaben',
			x: 520,
			y: 40,
			width: 440,
			height: 290
		});
		expect(byQuadrant.nebenbei).toEqual({
			quadrant: 'nebenbei',
			x: 80,
			y: 330,
			width: 440,
			height: 290
		});
		expect(byQuadrant.vermeiden).toEqual({
			quadrant: 'vermeiden',
			x: 520,
			y: 330,
			width: 440,
			height: 290
		});
	});

	it('deckt die Plotfläche lückenlos und überlappungsfrei ab (F-08-AK)', () => {
		const rects = regionRects(22);
		const totalArea = rects.reduce((sum, r) => sum + r.width * r.height, 0);
		const plotArea = (PLOT.right - PLOT.left) * (PLOT.bottom - PLOT.top);
		expect(totalArea).toBe(plotArea);

		const byQuadrant = Object.fromEntries(rects.map((r) => [r.quadrant, r]));
		// Linke Spalte grenzt lückenlos an die rechte Spalte.
		expect(byQuadrant.quickWins.x + byQuadrant.quickWins.width).toBe(byQuadrant.grosseVorhaben.x);
		expect(byQuadrant.nebenbei.x + byQuadrant.nebenbei.width).toBe(byQuadrant.vermeiden.x);
		// Obere Zeile grenzt lückenlos an die untere Zeile.
		expect(byQuadrant.quickWins.y + byQuadrant.quickWins.height).toBe(byQuadrant.nebenbei.y);
		expect(byQuadrant.grosseVorhaben.y + byQuadrant.grosseVorhaben.height).toBe(
			byQuadrant.vermeiden.y
		);
		// Gemeinsame Außenkanten entsprechen der Plotfläche.
		expect(byQuadrant.quickWins.x).toBe(PLOT.left);
		expect(byQuadrant.quickWins.y).toBe(PLOT.top);
		expect(byQuadrant.vermeiden.x + byQuadrant.vermeiden.width).toBe(PLOT.right);
		expect(byQuadrant.vermeiden.y + byQuadrant.vermeiden.height).toBe(PLOT.bottom);
	});

	it('verschiebt die Reviergrenze mit, wenn domainMax wächst (unabhängig vom Zoom, abhängig von der Skalierung)', () => {
		const rects = regionRects(40);
		const byQuadrant = Object.fromEntries(rects.map((r) => [r.quadrant, r]));
		const expectedBoundaryX = xOf(20, 40);
		const expectedBoundaryY = yOf(20, 40);

		expect(byQuadrant.quickWins.x + byQuadrant.quickWins.width).toBe(expectedBoundaryX);
		expect(byQuadrant.quickWins.y + byQuadrant.quickWins.height).toBe(expectedBoundaryY);
	});
});
