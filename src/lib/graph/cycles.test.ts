// F-07 · Vorbedingungen und Zyklen — Unit-Tests für findRequiresCycles und isOnCycle.
// Quellen: features/F-07-graph-services.md (Fachregeln, Akzeptanzkriterien, Tests-Abschnitt),
// PRD.md (INT-05, AK-08).

import { describe, expect, it } from 'vitest';
import type { Feature, FeatureMap, Relation } from '../model/types';
import type { Cycle } from './cycles';
import { findRequiresCycles, isOnCycle } from './cycles';

function feature(id: string, impact = 1, effort = 1): Feature {
	return { id, impact, effort };
}

function relation(from: string, to: string, type: Relation['type'] = 'requires'): Relation {
	return { from, to, type };
}

function map(features: Feature[], relations: Relation[]): FeatureMap {
	return { schemaVersion: 1, features, relations };
}

describe('findRequiresCycles — leere Karte', () => {
	// F-07, Tests-Abschnitt: „leere Karte".
	it('liefert eine leere Liste für eine Karte ohne Features', () => {
		expect(findRequiresCycles(map([], []))).toEqual([]);
	});
});

describe('findRequiresCycles — kein Zyklus', () => {
	it('liefert eine leere Liste für eine azyklische Kette', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B'), relation('B', 'C')]
		);
		expect(findRequiresCycles(m)).toEqual([]);
	});
});

describe('findRequiresCycles — A → B → A', () => {
	// AK-08: Anlegen von A → B → A erzeugt eine sichtbare Zyklus-Warnung; hier geprüft auf
	// Ebene des Graph-Service: genau ein Zyklus mit beiden Kanten.
	it('liefert genau einen Zyklus mit beiden Kanten', () => {
		const m = map([feature('A'), feature('B')], [relation('A', 'B'), relation('B', 'A')]);
		const cycles = findRequiresCycles(m);
		expect(cycles).toHaveLength(1);
		expect(cycles[0].relations).toHaveLength(2);
		expect(cycles[0].relations).toEqual(
			expect.arrayContaining([relation('A', 'B'), relation('B', 'A')])
		);
	});
});

describe('findRequiresCycles — Zyklus über mehrere Stufen', () => {
	// F-07, Tests-Abschnitt: „Zyklen"; Akzeptanzkriterien nennen explizit Zyklen über
	// mehrere Stufen.
	it('erkennt einen Zyklus über drei Stufen: A → B → C → A', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C')],
			[relation('A', 'B'), relation('B', 'C'), relation('C', 'A')]
		);
		const cycles = findRequiresCycles(m);
		expect(cycles).toHaveLength(1);
		expect(cycles[0].relations).toHaveLength(3);
		expect(cycles[0].relations).toEqual(
			expect.arrayContaining([relation('A', 'B'), relation('B', 'C'), relation('C', 'A')])
		);
	});
});

describe('findRequiresCycles — Pfad beginnt mit dem kleinsten Bezeichner', () => {
	// F-07: „Der gefundene Pfad wird so zurückgegeben, dass er mit dem kleinsten enthaltenen
	// Bezeichner beginnt — sonst hinge das Ergebnis von der Startreihenfolge ab." Die
	// Feature-Reihenfolge in der Karte weicht hier bewusst von der alphabetischen ab.
	it('rotiert den gefundenen Pfad unabhängig von der Reihenfolge der Features in der Karte', () => {
		const m = map(
			[feature('C'), feature('A'), feature('B')],
			[relation('A', 'B'), relation('B', 'C'), relation('C', 'A')]
		);
		const cycles = findRequiresCycles(m);
		expect(cycles).toHaveLength(1);
		expect(cycles[0].path[0]).toBe('A');
		expect(cycles[0].path).toEqual(['A', 'B', 'C']);
	});
});

describe('findRequiresCycles — zwei getrennte Zyklen', () => {
	// F-07, Akzeptanzkriterien: „Zwei getrennte Zyklen in einer Karte werden beide gefunden."
	it('findet beide Zyklen einer Karte mit zwei unabhängigen Zyklen', () => {
		const m = map(
			[feature('A'), feature('B'), feature('C'), feature('D')],
			[relation('A', 'B'), relation('B', 'A'), relation('C', 'D'), relation('D', 'C')]
		);
		const cycles = findRequiresCycles(m);
		expect(cycles).toHaveLength(2);
		const sortedPaths = cycles.map((c) => [...c.path].sort()).sort((a, b) => a[0].localeCompare(b[0]));
		expect(sortedPaths).toEqual([
			['A', 'B'],
			['C', 'D']
		]);
	});
});

describe('findRequiresCycles — isolierte Knoten', () => {
	// F-07, Tests-Abschnitt: „isolierte Knoten".
	it('findet den Zyklus trotz zusätzlicher isolierter Features in derselben Karte', () => {
		const m = map(
			[feature('ISOLATED'), feature('A'), feature('B')],
			[relation('A', 'B'), relation('B', 'A')]
		);
		const cycles = findRequiresCycles(m);
		expect(cycles).toHaveLength(1);
	});
});

describe('findRequiresCycles — relates und excludes bilden keinen Zyklus', () => {
	// F-07, Fachregeln: INT-05 gilt nur für requires-Kanten; relates/excludes bilden per
	// Definition (PRD 3.2) keine transitive Ordnung und damit auch keinen erkannten Zyklus.
	it('ignoriert eine relates-Schleife bei der requires-Zyklenerkennung', () => {
		const m = map(
			[feature('A'), feature('B')],
			[relation('A', 'B', 'relates'), relation('B', 'A', 'relates')]
		);
		expect(findRequiresCycles(m)).toEqual([]);
	});

	it('ignoriert eine excludes-Schleife bei der requires-Zyklenerkennung', () => {
		const m = map(
			[feature('A'), feature('B')],
			[relation('A', 'B', 'excludes'), relation('B', 'A', 'excludes')]
		);
		expect(findRequiresCycles(m)).toEqual([]);
	});
});

describe('findRequiresCycles — Selbstbezug', () => {
	it('terminiert bei einer requires-Selbstschleife, statt in eine Endlosschleife zu laufen', () => {
		// Eine Selbstschleife ist über addRelation ausgeschlossen (INT-03); die Erkennung
		// arbeitet aber direkt auf der übergebenen Karte und muss auch hier terminieren.
		const m = map([feature('A')], [relation('A', 'A')]);
		expect(() => findRequiresCycles(m)).not.toThrow();
	});
});

describe('isOnCycle', () => {
	it('erkennt eine Beziehung, die Teil eines übergebenen Zyklus ist', () => {
		const cycles: Cycle[] = [{ path: ['A', 'B'], relations: [relation('A', 'B'), relation('B', 'A')] }];
		expect(isOnCycle(cycles, relation('A', 'B'))).toBe(true);
		expect(isOnCycle(cycles, relation('B', 'A'))).toBe(true);
	});

	it('lehnt eine Beziehung ab, die an keinem der übergebenen Zyklen beteiligt ist', () => {
		const cycles: Cycle[] = [{ path: ['A', 'B'], relations: [relation('A', 'B'), relation('B', 'A')] }];
		expect(isOnCycle(cycles, relation('C', 'D'))).toBe(false);
	});

	it('liefert false für eine leere Zyklenliste', () => {
		expect(isOnCycle([], relation('A', 'B'))).toBe(false);
	});

	it('unterscheidet zwischen mehreren Zyklen und ordnet eine Beziehung nur ihrem eigenen zu', () => {
		const cycles: Cycle[] = [
			{ path: ['A', 'B'], relations: [relation('A', 'B'), relation('B', 'A')] },
			{ path: ['C', 'D'], relations: [relation('C', 'D'), relation('D', 'C')] }
		];
		expect(isOnCycle(cycles, relation('C', 'D'))).toBe(true);
		expect(isOnCycle(cycles, relation('A', 'D'))).toBe(false);
	});
});
