// F-09 · Feature-Signaturen und Jitter — Unit-Tests für src/lib/layout/jitter.ts.
// Quellen: features/F-09-feature-signaturen.md (Abschnitte „Umfang", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (FR-30 bis FR-33, FR-24, NFR-02),
// features/README.md (Leitplanke 2: das Aggregat ist unveränderlich).
//
// Die genaue Winkelformel aus features/F-09-feature-signaturen.md
// („winkel = 2π · index / groesse + (seed mod 360) im Bogenmaß") und aus PRD 7.3
// („winkel ← (2π · gruppenIndex / gruppenGroesse) + (seed mod 360)°", mit Gradzeichen) legen
// die Einheit von „seed mod 360" unterschiedlich fest — Bogenmaß hier, Gradmaß dort. Das ist
// ein Quellenwiderspruch (siehe Abschlussbericht), deshalb prüfen diese Tests ausschließlich
// Eigenschaften, die unter beiden Lesarten gelten: Ankerpunkt, Radius, Determinismus,
// Reihenfolgeunabhängigkeit und Gruppierung — nie eine konkret vorgerechnete Koordinate, die
// von der Winkelinterpretation abhinge.

import { describe, expect, it } from 'vitest';
import { BASE_RADIUS, MAX_RADIUS, placeFeatures, type Placement } from './jitter';
import { xOf, yOf } from './scales';
import type { Feature, FeatureMap } from '../model/types';

const DOMAIN_MAX = 22;

function buildMap(features: Feature[]): FeatureMap {
	return { schemaVersion: 1, features, relations: [] };
}

/** Erzeugt `n` Features mit demselben Wertepaar, IDs `f0`, `f1`, … (gültig nach PRD 4.2). */
function sameValueGroup(n: number, impact = 5, effort = 5, prefix = 'f'): Feature[] {
	return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, impact, effort }));
}

function anchorOf(impact: number, effort: number): { x: number; y: number } {
	return { x: xOf(effort, DOMAIN_MAX), y: yOf(impact, DOMAIN_MAX) };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

function byId(placements: Placement[], id: string): Placement {
	const found = placements.find((p) => p.id === id);
	if (!found) throw new Error(`Testaufbau: kein Placement für ${id}`);
	return found;
}

describe('placeFeatures — Einzelgruppe bleibt auf dem Ankerpunkt', () => {
	// F-09, Abschnitt „Umfang", Vorgehen 2: „Gruppen mit einem Mitglied bleiben auf dem
	// Ankerpunkt." FR-30 (Gegenprobe: kein Versatz ohne geteiltes Wertepaar).
	it('liefert für ein einzelnes Feature den unveränderten Ankerpunkt und jittered=false', () => {
		const feature: Feature = { id: 'solo', impact: 8, effort: 13 };
		const [placement] = placeFeatures(buildMap([feature]), DOMAIN_MAX);
		const anchor = anchorOf(8, 13);

		expect(placement.id).toBe('solo');
		expect(placement.jittered).toBe(false);
		expect(placement.anchorX).toBeCloseTo(anchor.x, 6);
		expect(placement.anchorY).toBeCloseTo(anchor.y, 6);
		expect(placement.x).toBeCloseTo(anchor.x, 6);
		expect(placement.y).toBeCloseTo(anchor.y, 6);
	});

	// Grenzfall: zwei Features mit gleichem Impact, aber unterschiedlichem Effort teilen sich
	// kein Wertepaar und bilden daher zwei Einzelgruppen, keine Zweiergruppe.
	it('gruppiert nur nach identischem (impact, effort)-Paar, nicht nach Teilübereinstimmung', () => {
		const map = buildMap([
			{ id: 'a', impact: 5, effort: 5 },
			{ id: 'b', impact: 5, effort: 8 }
		]);
		const placements = placeFeatures(map, DOMAIN_MAX);

		expect(byId(placements, 'a').jittered).toBe(false);
		expect(byId(placements, 'b').jittered).toBe(false);
	});
});

describe('placeFeatures — Gruppengrößen 2 bis 5 (FR-30, FR-33)', () => {
	for (const size of [2, 3, 4, 5]) {
		it(`versetzt eine Gruppe von ${size} Features radial mit dem vorgeschriebenen Radius`, () => {
			const map = buildMap(sameValueGroup(size));
			const placements = placeFeatures(map, DOMAIN_MAX);
			const anchor = anchorOf(5, 5);
			const expectedRadius = Math.min(BASE_RADIUS * Math.sqrt(size), MAX_RADIUS);

			expect(placements).toHaveLength(size);

			const seen = new Set<string>();
			for (const placement of placements) {
				expect(placement.jittered).toBe(true);
				expect(placement.anchorX).toBeCloseTo(anchor.x, 6);
				expect(placement.anchorY).toBeCloseTo(anchor.y, 6);
				expect(distance(anchor, placement)).toBeCloseTo(expectedRadius, 4);

				const key = `${placement.x.toFixed(4)}:${placement.y.toFixed(4)}`;
				expect(seen.has(key), `Position von ${placement.id} überlappt ein anderes Gruppenmitglied`).toBe(
					false
				);
				seen.add(key);
			}
		});
	}
});

describe('placeFeatures — Radiusgrenze (FR-33)', () => {
	it('MAX_RADIUS bleibt kleiner als der halbe Rasterabstand (40 / 2 = 20)', () => {
		expect(MAX_RADIUS).toBeLessThan(20);
		expect(BASE_RADIUS).toBeLessThan(MAX_RADIUS);
	});

	it('bleibt unterhalb von MAX_RADIUS, solange BASE_RADIUS·√größe das nicht überschreitet', () => {
		// √2 · 9 ≈ 12,73 < 16 — die Kappung darf hier nicht greifen.
		const map = buildMap(sameValueGroup(2));
		const placements = placeFeatures(map, DOMAIN_MAX);
		const anchor = anchorOf(5, 5);
		const expectedRadius = BASE_RADIUS * Math.sqrt(2);

		expect(expectedRadius).toBeLessThan(MAX_RADIUS);
		for (const placement of placements) {
			expect(distance(anchor, placement)).toBeCloseTo(expectedRadius, 4);
		}
	});

	it('kappt den Radius auf MAX_RADIUS, sobald BASE_RADIUS·√größe ihn überschreitet', () => {
		// √10 · 9 ≈ 28,46 > 16 — die Kappung muss greifen.
		const map = buildMap(sameValueGroup(10));
		const placements = placeFeatures(map, DOMAIN_MAX);
		const anchor = anchorOf(5, 5);

		expect(BASE_RADIUS * Math.sqrt(10)).toBeGreaterThan(MAX_RADIUS);
		for (const placement of placements) {
			expect(distance(anchor, placement)).toBeCloseTo(MAX_RADIUS, 4);
		}
	});
});

describe('placeFeatures — Determinismus (FR-32)', () => {
	// F-09, Abschnitt „Tests": „Determinismus über wiederholte Aufrufe." Zusammen mit der
	// E2E-Zusicherung (Neuladen der Seite liefert dieselben Koordinaten) deckt das die
	// entsprechende Akzeptanzkriterium ab.
	it('liefert bei wiederholtem Aufruf mit derselben Karte identische Koordinaten', () => {
		const map = buildMap(sameValueGroup(3));

		const first = placeFeatures(map, DOMAIN_MAX);
		const second = placeFeatures(map, DOMAIN_MAX);

		expect(second).toEqual(first);
	});
});

describe('placeFeatures — Unabhängigkeit von der Reihenfolge im Array (FR-32)', () => {
	it('liefert je Kennung dieselbe Platzierung, unabhängig von der Reihenfolge im Eingabearray', () => {
		const group = sameValueGroup(3);
		const singleton: Feature = { id: 'einzeln', impact: 13, effort: 2 };

		const inOrder = placeFeatures(buildMap([...group, singleton]), DOMAIN_MAX);
		const shuffled = placeFeatures(
			buildMap([singleton, group[2], group[0], group[1]]),
			DOMAIN_MAX
		);

		for (const feature of [...group, singleton]) {
			const a = byId(inOrder, feature.id);
			const b = byId(shuffled, feature.id);
			expect(b).toEqual(a);
		}
	});
});

describe('placeFeatures — Versatz ist rein visuell (FR-31, features/README.md Leitplanke 2)', () => {
	it('verändert weder die übergebene Karte noch ihre Features', () => {
		const map = buildMap(sameValueGroup(3));
		const clone = structuredClone(map);

		placeFeatures(map, DOMAIN_MAX);

		expect(map).toEqual(clone);
	});

	it('liefert Placement-Objekte ohne impact/effort — die Originalwerte bleiben allein im Feature', () => {
		const map = buildMap(sameValueGroup(2));
		const [placement] = placeFeatures(map, DOMAIN_MAX);

		expect(Object.keys(placement).sort()).toEqual(
			['anchorX', 'anchorY', 'id', 'jittered', 'x', 'y'].sort()
		);
	});
});

describe('placeFeatures — Placement je Feature (Vollständigkeit)', () => {
	it('liefert genau ein Placement je Feature, mit übereinstimmenden Kennungen', () => {
		const map = buildMap([
			...sameValueGroup(3),
			{ id: 'x', impact: 1, effort: 1 },
			{ id: 'y', impact: 21, effort: 21 }
		]);
		const placements = placeFeatures(map, DOMAIN_MAX);

		expect(placements).toHaveLength(map.features.length);
		expect(new Set(placements.map((p) => p.id))).toEqual(new Set(map.features.map((f) => f.id)));
	});

	it('liefert eine leere Liste für eine leere Karte', () => {
		expect(placeFeatures(buildMap([]), DOMAIN_MAX)).toEqual([]);
	});
});

describe('placeFeatures — F-09-AK: ein viertes Feature verändert nur seine eigene Gruppe', () => {
	it('ändert den Versatzradius der Gruppe, lässt andere Gruppen unangetastet', () => {
		const singleton: Feature = { id: 'unberuehrt', impact: 2, effort: 3 };
		const before = buildMap([...sameValueGroup(3), singleton]);
		const after = buildMap([...sameValueGroup(3), { id: 'f3', impact: 5, effort: 5 }, singleton]);

		const beforePlacements = placeFeatures(before, DOMAIN_MAX);
		const afterPlacements = placeFeatures(after, DOMAIN_MAX);

		// Die unbeteiligte Einzelgruppe bleibt unverändert.
		expect(afterPlacements.find((p) => p.id === 'unberuehrt')).toEqual(
			beforePlacements.find((p) => p.id === 'unberuehrt')
		);

		// Der Radius der gewachsenen Gruppe ändert sich nachweisbar: √3·9 ≈ 15,59 (ungekappt)
		// gegenüber √4·9 = 18, gekappt auf MAX_RADIUS = 16 — für jedes ursprüngliche Mitglied.
		const anchor = anchorOf(5, 5);
		const radiusBefore = Math.min(BASE_RADIUS * Math.sqrt(3), MAX_RADIUS);
		const radiusAfter = Math.min(BASE_RADIUS * Math.sqrt(4), MAX_RADIUS);
		expect(radiusBefore).not.toBeCloseTo(radiusAfter, 4);

		for (const id of ['f0', 'f1', 'f2']) {
			expect(distance(anchor, byId(beforePlacements, id))).toBeCloseTo(radiusBefore, 4);
			expect(distance(anchor, byId(afterPlacements, id))).toBeCloseTo(radiusAfter, 4);
		}
	});
});

describe('placeFeatures — Leistung (NFR-02)', () => {
	// F-09, Akzeptanzkriterium: „Neurendern nach einer Änderung dauert unter 100 ms bei
	// 100 Features." Geprüft wird hier die reine Platzierungsberechnung (Rendering selbst ist
	// Sache der Komponente und lässt sich nicht zuverlässig unter Vitest/jsdom stoppen).
	it('platziert 100 Features (mit mehreren geteilten Wertepaaren) in unter 100 ms', () => {
		const features: Feature[] = [];
		for (let i = 0; i < 25; i++) {
			features.push(...sameValueGroup(4, i % 21, (i * 3) % 21, `g${i}_`));
		}
		const map = buildMap(features);

		const start = performance.now();
		const placements = placeFeatures(map, DOMAIN_MAX);
		const duration = performance.now() - start;

		expect(placements).toHaveLength(100);
		expect(duration).toBeLessThan(100);
	});
});
