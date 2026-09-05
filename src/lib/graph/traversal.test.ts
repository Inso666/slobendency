// F-07 · Vorbedingungen und Zyklen — Unit-Tests für requiresClosure und directNeighbours.
// Quellen: features/F-07-graph-services.md (Fachregeln, Akzeptanzkriterien, Tests-Abschnitt),
// PRD.md (FR-41, FR-42, AK-06, AK-07, NFR-03).
//
// requiresClosure/directNeighbours werden hier bewusst mit roh konstruierten FeatureMap-
// Objekten gefüttert statt über addFeature/addRelation aus F-02 — die Graph-Services prüfen
// keine Aggregatsinvarianten selbst, sie werten den übergebenen Graphen aus, wie er ist.

import { describe, expect, it } from 'vitest';
import type { Feature, FeatureMap, Relation } from '../model/types';
import { directNeighbours, requiresClosure } from './traversal';

function feature(id: string, impact = 1, effort = 1): Feature {
	return { id, impact, effort };
}

function relation(from: string, to: string, type: Relation['type'] = 'requires'): Relation {
	return { from, to, type };
}

function map(features: Feature[], relations: Relation[]): FeatureMap {
	return { schemaVersion: 1, features, relations };
}

describe('requiresClosure — leere Karte', () => {
	// F-07, Tests-Abschnitt: „leere Karte".
	it('liefert eine leere Closure, wenn die Karte gar keine Features enthält', () => {
		const m = map([], []);
		const closure = requiresClosure(m, 'GHOST');
		expect(closure.features.size).toBe(0);
		expect(closure.relations).toEqual([]);
	});
});

describe('requiresClosure — Karte ohne Vorbedingungen', () => {
	// F-07, Akzeptanzkriterien: „Eine Karte ohne Vorbedingungen" (leere Kette).
	it('liefert eine leere Closure für ein Feature ohne jede requires-Beziehung', () => {
		const m = map([feature('A')], []);
		const closure = requiresClosure(m, 'A');
		expect(closure.features.size).toBe(0);
		expect(closure.relations).toEqual([]);
	});
});

describe('requiresClosure — Kette A → B → C', () => {
	// AK-06: Kette A → B → C: requiresClosure(A) enthält B und C sowie beide Kanten.
	it('enthält B und C sowie beide Kanten', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B'), relation('B', 'C')]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features).toEqual(new Set(['B', 'C']));
		expect(closure.relations).toHaveLength(2);
		expect(closure.relations).toEqual(
			expect.arrayContaining([relation('A', 'B'), relation('B', 'C')])
		);
	});
});

describe('requiresClosure — requires wird nicht über relates fortgesetzt', () => {
	// AK-07: A requires B, B relates C: requiresClosure(A) enthält C nicht.
	it('enthält C nicht, wenn B nur relates C ist', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B', 'requires'), relation('B', 'C', 'relates')]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features.has('C')).toBe(false);
		expect(closure.features).toEqual(new Set(['B']));
		expect(closure.relations).toEqual([relation('A', 'B', 'requires')]);
	});
});

describe('requiresClosure — requires wird nicht über excludes fortgesetzt', () => {
	// F-07, Fachregeln: „requires wird nicht über relates oder excludes fortgesetzt" (PRD 3.2).
	it('enthält C nicht, wenn B nur excludes C ist', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B', 'requires'), relation('B', 'C', 'excludes')]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features.has('C')).toBe(false);
	});
});

describe('requiresClosure — nur ausgehende Kanten zählen', () => {
	// F-07, Akzeptanzkriterien: X requires A: requiresClosure(A) enthält X nicht.
	it('enthält X nicht, wenn X requires A gilt statt umgekehrt', () => {
		const m = map([feature('A'), feature('X')], [relation('X', 'A')]);
		const closure = requiresClosure(m, 'A');
		expect(closure.features.size).toBe(0);
		expect(closure.relations).toEqual([]);
	});
});

describe('requiresClosure — Verzweigung', () => {
	// F-07, Tests-Abschnitt: „Verzweigungen".
	it('enthält beide Ziele, wenn A zwei verschiedene Features requires', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B'), relation('A', 'C')]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features).toEqual(new Set(['B', 'C']));
		expect(closure.relations).toHaveLength(2);
	});
});

describe('requiresClosure — Diamantform', () => {
	// F-07, Tests-Abschnitt: „Diamantform (zwei Wege zum selben Ziel — die Kante darf nur
	// einmal im Ergebnis stehen)". D ist über B und über C erreichbar; die von D ausgehende
	// Kante D → E darf trotz der zwei Wege nur einmal im Ergebnis erscheinen.
	it('führt die von einem doppelt erreichten Knoten ausgehende Kante nur einmal im Ergebnis', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C'), feature('D'), feature('E')],
			[
				relation('A', 'B'),
				relation('A', 'C'),
				relation('B', 'D'),
				relation('C', 'D'),
				relation('D', 'E')
			]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features).toEqual(new Set(['B', 'C', 'D', 'E']));
		expect(closure.relations).toHaveLength(5);
		const toE = closure.relations.filter((r) => r.from === 'D' && r.to === 'E');
		expect(toE).toHaveLength(1);
	});
});

describe('requiresClosure — Zyklus über mehrere Stufen', () => {
	// F-07, Akzeptanzkriterien: „requiresClosure auf einem Knoten in einem Zyklus terminiert."
	it('terminiert bei einem Zyklus über drei Stufen und enthält den Startknoten selbst nicht', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B'), relation('B', 'C'), relation('C', 'A')]
		);
		const closure = requiresClosure(m, 'A');
		expect(closure.features).toEqual(new Set(['B', 'C']));
		expect(closure.features.has('A')).toBe(false);
		expect(closure.relations).toHaveLength(3);
	});
});

describe('requiresClosure — Selbstbezug', () => {
	// Closure enthält den Startknoten laut Signatur nie ("ohne den Startknoten"), auch nicht,
	// wenn der Graph über einen Zyklus auf ihn zurückführt.
	it('enthält den Startknoten nicht, auch wenn der Graph über einen Zyklus auf ihn zurückführt', () => {
		const m = map([feature('A'), feature('B')], [relation('A', 'B'), relation('B', 'A')]);
		const closure = requiresClosure(m, 'A');
		expect(closure.features.has('A')).toBe(false);
	});

	it('terminiert bei einer requires-Selbstschleife, statt in eine Endlosschleife zu laufen', () => {
		// Eine Selbstschleife ist über addRelation ausgeschlossen (INT-03); requiresClosure
		// arbeitet aber direkt auf der übergebenen Karte und muss auch hier terminieren.
		const m = map([feature('A')], [relation('A', 'A')]);
		expect(() => requiresClosure(m, 'A')).not.toThrow();
	});
});

describe('requiresClosure — isolierter Knoten', () => {
	// F-07, Tests-Abschnitt: „isolierte Knoten".
	it('liefert eine leere Closure für ein Feature ohne jede Beziehung in einer größeren Karte', () => {
		const m = map([feature('A'), feature('B'), feature('ISOLATED')], [relation('A', 'B')]);
		const closure = requiresClosure(m, 'ISOLATED');
		expect(closure.features.size).toBe(0);
		expect(closure.relations).toEqual([]);
	});
});

describe('requiresClosure — Leistungstest', () => {
	// F-07, Akzeptanzkriterien / NFR-03: 100 Features, 300 Kanten, unter 50 ms.
	it('wertet eine Karte mit 100 Features und 300 Kanten in unter 50 ms aus', () => {
		const features: Feature[] = [];
		for (let i = 0; i < 100; i++) features.push(feature(`F${i}`));

		const relations: Relation[] = [];
		// Grundkette F0 → F1 → … → F99 (99 Kanten), damit requiresClosure(F0) den ganzen
		// Graphen durchläuft; zusätzliche Querkanten bis 300 insgesamt.
		for (let i = 0; i < 99; i++) relations.push(relation(`F${i}`, `F${i + 1}`));
		let i = 0;
		while (relations.length < 300) {
			const from = i % 100;
			const to = (i * 7 + 3) % 100;
			if (from !== to) relations.push(relation(`F${from}`, `F${to}`));
			i++;
		}

		const m = map(features, relations);
		const start = performance.now();
		const closure = requiresClosure(m, 'F0');
		const duration = performance.now() - start;

		expect(duration).toBeLessThan(50);
		expect(closure.features.size).toBeGreaterThan(0);
	});
});

describe('directNeighbours — alle Arten, ein- und ausgehend', () => {
	// F-07: „directNeighbours liefert alle ein- und ausgehenden Kanten eines Features samt
	// deren Gegenknoten, unabhängig von der Art."
	it('liefert eingehende und ausgehende Kanten unabhängig von deren Art', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C'), feature('D')],
			[
				relation('A', 'B', 'requires'),
				relation('C', 'A', 'relates'),
				relation('A', 'D', 'excludes')
			]
		);
		const neighbours = directNeighbours(m, 'A');
		expect(neighbours.features).toEqual(new Set(['B', 'C', 'D']));
		expect(neighbours.relations).toHaveLength(3);
	});

	it('bleibt bei relates und excludes auf die direkte Nachbarschaft beschränkt (FR-42)', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B', 'relates'), relation('B', 'C', 'relates')]
		);
		const neighbours = directNeighbours(m, 'A');
		expect(neighbours.features).toEqual(new Set(['B']));
		expect(neighbours.features.has('C')).toBe(false);
	});

	it('liefert eine leere Closure für ein Feature ohne jede Beziehung', () => {
		const m = map([feature('A')], []);
		const neighbours = directNeighbours(m, 'A');
		expect(neighbours.features.size).toBe(0);
		expect(neighbours.relations).toEqual([]);
	});

	it('schließt den Startknoten selbst nie in die Nachbarmenge ein', () => {
		const m = map(
			[feature('A'), feature('B')],
			[relation('A', 'B'), relation('B', 'A')]
		);
		const neighbours = directNeighbours(m, 'A');
		expect(neighbours.features.has('A')).toBe(false);
	});
});
