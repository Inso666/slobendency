// F-08 · Kartengerüst — Unit-Tests für scales.ts.
// Quellen: features/F-08-kartengeruest.md (Abschnitte „Umfang", „Fachregeln",
// „Akzeptanzkriterien"), PRD.md (FR-20, FR-21, FR-26), features/README.md (Abschnitt „Zwei
// Präzisierungen…", Revier-Grenze).
//
// Erweitert um F-25 · features/F-25-datenzoom.md (Abschnitte „Umfang", „Tests"): xOf/yOf/
// ticksOf erhalten ein Fenster [windowMin, windowMax] statt eines festen [0, domainMax]. Die
// zugehörigen „describe"-Blöcke unten ersetzen die bisherigen, auf die alte
// Zweiparameter-Signatur zugeschnittenen F-08-Tests (die alte Signatur existiert nach F-25
// nicht mehr) — domainMaxOf und regionRects sind von F-25 nicht betroffen und bleiben
// unverändert. regionRects ruft intern weiterhin xOf()/yOf() mit der alten, jetzt entfernten
// Zweiparameter-Signatur auf (F-25 erweitert nur xOf/yOf/ticksOf selbst, nicht ihre
// Aufrufstellen) — die regionRects-Tests unten werden dadurch zwangsläufig ebenfalls rot, bis
// der Feature-Agent regionRects auf die neue Signatur umstellt; das ist kein neuer Testfehler,
// sondern dieselbe Art Kollateralschaden wie bei den F-12-Tests von src/lib/store/viewport.ts.

import { describe, expect, it } from 'vitest';
import { addFeature, emptyMap } from '../model/validation';
import type { Feature, FeatureMap } from '../model/types';
import { PLOT, VIEWBOX, domainMaxOf, regionRects, ticksOf, xOf, yOf } from './scales';
import type { EstimationRange } from '../store/settings';

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

// F-25, Abschnitt „Tests": „xOf/yOf mit Fenstergrenzen ungleich [0, domainMax]".
describe('xOf und yOf mit Fenstergrenzen (FR-20, FR-21, F-25)', () => {
	// F-08-AK (weiterhin gültig über den Randfall windowMin = 0): „xOf(0, 22) ist 80,
	// xOf(22, 22) ist 960, yOf(0, 22) ist 620, yOf(22, 22) ist 40."
	it('bildet die Randwerte des vollen Fensters [0, domainMax] auf die Plotflächenränder ab', () => {
		expect(xOf(0, 0, 22)).toBe(80);
		expect(xOf(22, 0, 22)).toBe(960);
		expect(yOf(0, 0, 22)).toBe(620);
		expect(yOf(22, 0, 22)).toBe(40);
	});

	it('legt die Reviergrenze bei domainMax / 2 auf x = 520 und y = 330 (leere Karte, volles Fenster)', () => {
		expect(xOf(11, 0, 22)).toBe(520);
		expect(yOf(11, 0, 22)).toBe(330);
	});

	it('skaliert alle Positionen mit, wenn domainMax auf 35 wächst (volles Fenster)', () => {
		expect(xOf(0, 0, 35)).toBe(80);
		expect(xOf(35, 0, 35)).toBe(960);
		expect(yOf(0, 0, 35)).toBe(620);
		expect(yOf(35, 0, 35)).toBe(40);
	});

	// F-25-AK: „Punktradius und Schriftgröße … bei visibleRange = domainMax und bei
	// visibleRange = domainMax / 4 identisch groß" setzt voraus, dass xOf/yOf auch für ein
	// Fenster ungleich [0, domainMax] denselben Plotflächenrahmen ausfüllen (F-25, Abschnitt
	// „Tests": „xOf/yOf mit Fenstergrenzen ungleich [0, domainMax]").
	it('bildet die Randwerte eines verschobenen, nicht bei 0 beginnenden Fensters ebenso auf die Plotflächenränder ab', () => {
		expect(xOf(40, 40, 65)).toBe(80);
		expect(xOf(65, 40, 65)).toBe(960);
		expect(yOf(40, 40, 65)).toBe(620);
		expect(yOf(65, 40, 65)).toBe(40);
	});

	it('bildet die Fenstermitte eines verschobenen Fensters auf die Mitte der Plotfläche ab', () => {
		expect(xOf(52.5, 40, 65)).toBe(520);
		expect(yOf(52.5, 40, 65)).toBe(330);
	});

	it('hoher Nutzen liegt weiterhin oben, auch innerhalb eines verschobenen Fensters (FR-21)', () => {
		expect(yOf(45, 40, 65)).toBeGreaterThan(yOf(60, 40, 65));
	});

	it('bildet ein schmales, weit von 0 entferntes Fenster ebenfalls linear auf die Plotfläche ab', () => {
		expect(xOf(1000, 1000, 1025)).toBe(80);
		expect(xOf(1012.5, 1000, 1025)).toBe(520);
		expect(xOf(1025, 1000, 1025)).toBe(960);
	});
});

// F-25, Abschnitt „Tests": „ticksOf liefert runde Werte innerhalb eines beliebigen Fensters,
// Fibonacci-Pfad nur bei vollem Fenster." F-25, Abschnitt „Umfang": der Fibonacci-Pfad aus F-08
// bleibt für das volle Fenster (windowMin = 0, windowMax = domainMax) erhalten; in jedem
// anderen Fall liefert ticksOf runde, gleichmäßig verteilte Werte im Fenster (kein
// Schätzmodus-Einfluss in diesem Feature, siehe „Nicht Teil dieses Features" in
// features/F-25-datenzoom.md).
describe('ticksOf (FR-26, F-25)', () => {
	describe('volles Fenster (windowMin = 0, windowMax = domainMax): Fibonacci-Pfad aus F-08 bleibt erhalten', () => {
		it('liefert die Schätzreihe 1, 2, 3, 5, 8, 13, 21 für die leere Karte', () => {
			expect(ticksOf(0, 22)).toEqual([1, 2, 3, 5, 8, 13, 21]);
		});

		it('ergänzt domainMax - 1 als zusätzlichen Teilstrich, sobald ein Wert über 21 vorkommt', () => {
			expect(ticksOf(0, 35)).toEqual([1, 2, 3, 5, 8, 13, 21, 34]);
		});

		it('ergänzt auch knapp oberhalb von 21 den zusätzlichen Teilstrich', () => {
			expect(ticksOf(0, 23)).toEqual([1, 2, 3, 5, 8, 13, 21, 22]);
		});

		it('lässt Werte der Schätzreihe oberhalb von domainMax weg', () => {
			expect(ticksOf(0, 4)).toEqual([1, 2, 3]);
		});
	});

	describe('gezoomtes (nicht volles) Fenster: runde, gleichmäßig verteilte Werte statt Fibonacci', () => {
		function stepsOf(values: number[]): number[] {
			const steps: number[] = [];
			for (let i = 1; i < values.length; i++) {
				steps.push(values[i] - values[i - 1]);
			}
			return steps;
		}

		// F-25-AK: „Bei visibleRange = domainMax / 4 zeigen die Achsen neu berechnete, runde
		// Teilstriche für das sichtbare Fenster, nicht mehr zwingend die Fibonacci-Werte."
		// domainMax = 22, visibleRange = domainMax / 4 = 5.5, Fenster [8, 13.5] gewählt, damit
		// es weder bei 0 beginnt noch mit dem vollen Fenster zusammenfällt.
		it('liefert für ein schmales, verschobenes Fenster mehrere Werte innerhalb der Fenstergrenzen', () => {
			const ticks = ticksOf(8, 13.5);
			expect(ticks.length).toBeGreaterThanOrEqual(2);
			for (const value of ticks) {
				expect(value).toBeGreaterThanOrEqual(8);
				expect(value).toBeLessThanOrEqual(13.5);
			}
		});

		it('liefert die Werte im schmalen Fenster aufsteigend sortiert und gleichmäßig verteilt', () => {
			const ticks = ticksOf(8, 13.5);
			for (let i = 1; i < ticks.length; i++) {
				expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
			}
			const steps = stepsOf(ticks);
			for (const step of steps) {
				expect(step).toBeCloseTo(steps[0], 6);
			}
		});

		it('liefert im schmalen Fenster nicht die auf das Fenster eingeschränkte Fibonacci-Reihe', () => {
			// Die auf [8, 13.5] eingeschränkte Schätzreihe wäre nur [8, 13] — zwei Werte, exakt
			// an den Fibonacci-Stellen. Ein „gleichmäßig verteiltes" Ergebnis darf damit nicht
			// übereinstimmen, sonst wäre der Fibonacci-Pfad fälschlich auch hier aktiv.
			expect(ticksOf(8, 13.5)).not.toEqual([8, 13]);
		});

		it('liefert auch für ein Fenster in einem ganz anderen Wertebereich gleichmäßig verteilte, sortierte Werte', () => {
			const ticks = ticksOf(1000, 1025);
			expect(ticks.length).toBeGreaterThanOrEqual(2);
			for (const value of ticks) {
				expect(value).toBeGreaterThanOrEqual(1000);
				expect(value).toBeLessThanOrEqual(1025);
			}
			for (let i = 1; i < ticks.length; i++) {
				expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
			}
			const steps = stepsOf(ticks);
			for (const step of steps) {
				expect(step).toBeCloseTo(steps[0], 6);
			}
		});
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
		const expectedBoundaryX = xOf(20, 0, 40);
		const expectedBoundaryY = yOf(20, 0, 40);

		expect(byQuadrant.quickWins.x + byQuadrant.quickWins.width).toBe(expectedBoundaryX);
		expect(byQuadrant.quickWins.y + byQuadrant.quickWins.height).toBe(expectedBoundaryY);
	});
});

// F-26 · features/F-26-schaetzmodus.md, Abschnitt „Umfang": „domainMaxOf verwendet im Modus
// free das eingestellte estimationRange.max statt der festen 21 als Untergrenze (FR-26)."
// PRD FR-26 (geändert, PRD 1.1): „mindestens 21 im Schätzmodus Fibonacci beziehungsweise bis
// zum eingestellten Maximum im freien Schätzmodus."
describe('domainMaxOf im Modus free (F-26, FR-26)', () => {
	const RANGE: EstimationRange = { min: 0, max: 50 };

	it('liefert estimationRange.max + 1 für die leere Karte im Modus free (statt der Fibonacci-Untergrenze 21 + 1)', () => {
		expect(domainMaxOf(emptyMap(), 'free', RANGE)).toBe(51);
	});

	it('liefert estimationRange.max + 1, solange kein Wert über dem eingestellten Maximum liegt', () => {
		const map = mapWith(feature({ id: 'a', impact: 13, effort: 30 }));
		expect(domainMaxOf(map, 'free', RANGE)).toBe(51);
	});

	it('nimmt weiterhin den größten Kartenwert, sobald er über estimationRange.max liegt', () => {
		const map = mapWith(feature({ id: 'a', impact: 1, effort: 80 }));
		expect(domainMaxOf(map, 'free', RANGE)).toBe(81);
	});

	it('verwendet einen anderen eingestellten Bereich unmittelbar (z. B. { min: 0, max: 200 })', () => {
		expect(domainMaxOf(emptyMap(), 'free', { min: 0, max: 200 })).toBe(201);
	});

	it('verhält sich bei explizitem Modus fibonacci weiterhin wie F-08/F-25 (Untergrenze 21), unabhängig von estimationRange', () => {
		expect(domainMaxOf(emptyMap(), 'fibonacci', RANGE)).toBe(22);
	});

	it('verhält sich ohne mode/range-Argumente weiterhin wie F-08/F-25 (Rückwärtskompatibilität, Default-Parameter)', () => {
		expect(domainMaxOf(emptyMap())).toBe(22);
	});
});

// F-26 · features/F-26-schaetzmodus.md, Abschnitt „Umfang": „ticksOf bei visibleRange =
// domainMax erzeugt im Modus free dieselben runden, gleichmäßig verteilten Teilstriche wie
// beim Hineinzoomen aus F-25, statt der Fibonacci-Reihe."
describe('ticksOf im Modus free bei vollem Fenster (F-26, F-25 „Nicht Teil dieses Features")', () => {
	const RANGE: EstimationRange = { min: 0, max: 50 };

	// Exakter Erwartungswert nach demselben „nice numbers"-Verfahren, das der bereits
	// implementierte gezoomte Pfad unten in dieser Datei verwendet (targetCount 5,
	// Zehnerpotenz-Schrittweite 1/2/5 × 10^n) — F-26 verlangt wörtlich „dieselben … Teilstriche
	// wie beim Hineinzoomen aus F-25", nicht nur irgendeine andere Reihe. Für [0, 51]:
	// span = 51, rawStep = 10.2, magnitude = 10, normalized = 1.02 < √2 ⇒ step = 10 ⇒
	// [0, 10, 20, 30, 40, 50].
	it('liefert beim vollen Fenster (windowMin = 0) im Modus free dieselben runden, gleichmäßig verteilten Werte wie der gezoomte Pfad, NICHT die Fibonacci-Reihe', () => {
		const ticks = ticksOf(0, 51, 'free', RANGE);
		expect(ticks).toEqual([0, 10, 20, 30, 40, 50]);
	});

	// Zweiter Fensterwert (anderer Bereich), damit die Erwartung nicht nur für einen einzelnen
	// Zufallswert zutrifft: [0, 101] ⇒ span = 101, rawStep = 20.2, magnitude = 10,
	// normalized = 2.02, √2 ≤ 2.02 < √10 ⇒ step = 20 ⇒ [0, 20, 40, 60, 80, 100].
	it('liefert für ein anderes eingestelltes Maximum ebenfalls die runden, gleichmäßig verteilten Werte des gezoomten Pfads', () => {
		const ticks = ticksOf(0, 101, 'free', { min: 0, max: 100 });
		expect(ticks).toEqual([0, 20, 40, 60, 80, 100]);
	});

	it('liefert beim vollen Fenster weiterhin die Fibonacci-Reihe, wenn der Modus fibonacci ist (unverändert gegenüber F-08/F-25)', () => {
		expect(ticksOf(0, 22, 'fibonacci', RANGE)).toEqual([1, 2, 3, 5, 8, 13, 21]);
	});

	it('verhält sich ohne mode/range-Argumente weiterhin wie F-08/F-25 (Rückwärtskompatibilität, Default-Parameter)', () => {
		expect(ticksOf(0, 22)).toEqual([1, 2, 3, 5, 8, 13, 21]);
	});
});
