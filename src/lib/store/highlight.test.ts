// F-11 · Selektion, Hervorhebung, Dimming — Unit-Tests für highlight.ts.
// Quellen: features/F-11-selektion.md (Abschnitte „Umfang", „Fachregeln", „Akzeptanzkriterien",
// „Tests"), PRD.md (FR-41, FR-42, FR-44, NFR-03, AK-06, AK-07).
//
// highlight.ts leitet sich aus selectedId, highlightMode (selection.ts, F-03) und der aktiven
// Karte (mapStore.ts, F-03) ab. Die Karte wird über loadMap() vorbelegt (F-03 „Umfang":
// „Ersetzt die Karte vollständig … und hebt Selektion … auf"), nicht über addFeature/
// addRelation — highlight.ts wertet den übergebenen Graphen aus, wie er ist, unabhängig von
// Aggregatsinvarianten (vgl. graph/traversal.test.ts).

import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Feature, FeatureMap, Relation } from '../model/types';
import { loadMap } from './mapStore';
import { highlightMode, selectedId } from './selection';
import { highlight, relationKey } from './highlight';

function feature(id: string, impact = 1, effort = 1): Feature {
	return { id, impact, effort };
}

function relation(from: string, to: string, type: Relation['type']): Relation {
	return { from, to, type };
}

function map(features: Feature[], relations: Relation[]): FeatureMap {
	return { schemaVersion: 1, features, relations };
}

beforeEach(() => {
	loadMap(map([], []));
	highlightMode.set('transitive');
});

describe('relationKey', () => {
	// F-11 „Umfang": `relationKey(relation): string; // "from|type|to"`.
	it('baut den Schlüssel aus Quelle, Art und Ziel', () => {
		expect(relationKey(relation('a', 'b', 'requires'))).toBe('a|requires|b');
	});

	it('unterscheidet Beziehungen mit gleichem Paar, aber unterschiedlicher Art', () => {
		const req = relationKey(relation('a', 'b', 'requires'));
		const rel = relationKey(relation('a', 'b', 'relates'));
		const exc = relationKey(relation('a', 'b', 'excludes'));
		expect(new Set([req, rel, exc]).size).toBe(3);
	});
});

describe('highlight — ohne Selektion', () => {
	// F-11 „Umfang": „null = keine Selektion".
	it('ist null, solange kein Feature selektiert ist', () => {
		loadMap(map([feature('a'), feature('b')], [relation('a', 'b', 'requires')]));
		selectedId.set(null);
		expect(get(highlight)).toBeNull();
	});
});

describe('highlight — transitiver Modus, Kette A → B → C', () => {
	// AK-06 / F-11-AK: „Kette A → B → C: Selektion von A hebt B und C hervor."
	beforeEach(() => {
		loadMap(
			map(
				[feature('a'), feature('b'), feature('c')],
				[relation('a', 'b', 'requires'), relation('b', 'c', 'requires')]
			)
		);
		highlightMode.set('transitive');
		selectedId.set('a');
	});

	it('enthält das selektierte Feature sowie B und C in features', () => {
		const set = get(highlight);
		expect(set).not.toBeNull();
		expect(set!.features).toEqual(new Set(['a', 'b', 'c']));
	});

	it('enthält beide Ketten-Beziehungen in relations', () => {
		const set = get(highlight)!;
		expect(set.relations).toEqual(
			new Set([relationKey(relation('a', 'b', 'requires')), relationKey(relation('b', 'c', 'requires'))])
		);
	});
});

describe('highlight — transitiver Modus, requires wird nicht über relates fortgesetzt', () => {
	// AK-07 / F-11-AK: „A requires B, B relates C: Selektion von A hebt C nicht hervor."
	beforeEach(() => {
		loadMap(
			map(
				[feature('a'), feature('b'), feature('c')],
				[relation('a', 'b', 'requires'), relation('b', 'c', 'relates')]
			)
		);
		highlightMode.set('transitive');
		selectedId.set('a');
	});

	it('hebt B hervor, C aber nicht', () => {
		const set = get(highlight)!;
		expect(set.features.has('b')).toBe(true);
		expect(set.features.has('c')).toBe(false);
	});

	it('führt nur die A-B-Beziehung in relations, nicht B-C', () => {
		const set = get(highlight)!;
		expect(set.relations).toEqual(new Set([relationKey(relation('a', 'b', 'requires'))]));
	});
});

describe('highlight — transitiver Modus, direkte relates- und excludes-Nachbarn', () => {
	// F-11 „Umfang": „Modus transitiv: … dazu die direkten relates- und excludes-Nachbarn des
	// selektierten Features." FR-42: relates/excludes nur direkte Nachbarschaft.
	beforeEach(() => {
		loadMap(
			map(
				[feature('a'), feature('d'), feature('e'), feature('f')],
				[relation('a', 'd', 'relates'), relation('a', 'e', 'excludes'), relation('d', 'f', 'relates')]
			)
		);
		highlightMode.set('transitive');
		selectedId.set('a');
	});

	it('hebt direkte relates- und excludes-Nachbarn von A hervor', () => {
		const set = get(highlight)!;
		expect(set.features).toEqual(new Set(['a', 'd', 'e']));
	});

	it('setzt relates nicht über die direkte Nachbarschaft hinaus fort (FR-42)', () => {
		const set = get(highlight)!;
		expect(set.features.has('f')).toBe(false);
		expect(set.relations.has(relationKey(relation('d', 'f', 'relates')))).toBe(false);
	});
});

describe('highlight — transitiver Modus, nur eingehende requires-Kanten bleiben abgedunkelt', () => {
	// F-11-AK: „Ein Feature, das nur eingehende requires-Kanten zum selektierten Feature hat,
	// bleibt abgedunkelt." requiresClosure folgt ausschließlich ausgehenden requires-Kanten von
	// A (F-07); eine Kante, die auf A zeigt, gehört nicht zur Vorbedingungsmenge und ist auch
	// keine relates-/excludes-Beziehung, wird im transitiven Modus also nicht mitgeführt.
	it('hebt ein Feature, das A requires, im transitiven Modus nicht hervor', () => {
		loadMap(map([feature('a'), feature('x')], [relation('x', 'a', 'requires')]));
		highlightMode.set('transitive');
		selectedId.set('a');

		const set = get(highlight)!;
		expect(set.features).toEqual(new Set(['a']));
		expect(set.relations.size).toBe(0);
	});
});

describe('highlight — Wechsel auf nur direkte Hervorhebung', () => {
	// F-11-AK: „Umschalten auf nur direkte nimmt C aus der Hervorhebung, ohne die Selektion zu
	// lösen." F-11 „Umfang": „Modus nur direkte: alle direkten Nachbarn … unabhängig von der
	// Art, ohne transitive Fortsetzung."
	beforeEach(() => {
		loadMap(
			map(
				[feature('a'), feature('b'), feature('c')],
				[relation('a', 'b', 'requires'), relation('b', 'c', 'requires')]
			)
		);
		selectedId.set('a');
	});

	it('nimmt C aus der Hervorhebung, wenn auf nur direkte gewechselt wird', () => {
		highlightMode.set('transitive');
		expect(get(highlight)!.features.has('c')).toBe(true);

		highlightMode.set('direct');
		const set = get(highlight)!;
		expect(set.features.has('c')).toBe(false);
		expect(set.features).toEqual(new Set(['a', 'b']));
	});

	it('löst die Selektion beim Umschalten nicht auf', () => {
		highlightMode.set('direct');
		expect(get(selectedId)).toBe('a');
		expect(get(highlight)).not.toBeNull();
	});
});

describe('highlight — nur direkte Hervorhebung schließt eingehende Kanten jeder Art ein', () => {
	// F-11 „Umfang": „Modus nur direkte: alle direkten Nachbarn des selektierten Features,
	// unabhängig von der Art" — im Unterschied zum transitiven Modus gilt hier keine
	// Einschränkung auf ausgehende requires-Kanten (F-07 directNeighbours: „liefert alle
	// direkten Nachbarn … samt der ein- und ausgehenden Kanten, unabhängig von deren Art").
	it('hebt ein Feature hervor, das A requires, sobald nur direkte aktiv ist', () => {
		loadMap(map([feature('a'), feature('x')], [relation('x', 'a', 'requires')]));
		highlightMode.set('direct');
		selectedId.set('a');

		const set = get(highlight)!;
		expect(set.features).toEqual(new Set(['a', 'x']));
	});
});

describe('highlight — Diamantform', () => {
	// F-11 „Tests": „Diamantform." D ist über B und C erreichbar; die von D ausgehende Kante
	// darf trotz zweier Wege nur einmal in relations stehen (vgl. graph/traversal.test.ts).
	it('führt eine über zwei Wege erreichte Kante nur einmal in relations', () => {
		loadMap(
			map(
				[feature('a'), feature('b'), feature('c'), feature('d'), feature('e')],
				[
					relation('a', 'b', 'requires'),
					relation('a', 'c', 'requires'),
					relation('b', 'd', 'requires'),
					relation('c', 'd', 'requires'),
					relation('d', 'e', 'requires')
				]
			)
		);
		highlightMode.set('transitive');
		selectedId.set('a');

		const set = get(highlight)!;
		expect(set.features).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
		const toE = [...set.relations].filter((key) => key === relationKey(relation('d', 'e', 'requires')));
		expect(toE).toHaveLength(1);
	});
});

describe('highlight — Zyklus', () => {
	// F-11 „Tests": „Zyklus." requiresClosure terminiert bei einem Zyklus (F-07); highlight.ts
	// muss dasselbe Verhalten zeigen, statt selbst in eine Endlosschleife zu laufen.
	it('terminiert bei einem Zyklus über drei Stufen und enthält den Startknoten dennoch, weil er selbst selektiert ist', () => {
		loadMap(
			map(
				[feature('a'), feature('b'), feature('c')],
				[relation('a', 'b', 'requires'), relation('b', 'c', 'requires'), relation('c', 'a', 'requires')]
			)
		);
		highlightMode.set('transitive');

		expect(() => selectedId.set('a')).not.toThrow();
		const set = get(highlight)!;
		expect(set.features).toEqual(new Set(['a', 'b', 'c']));
	});
});

describe('highlight — kein selektiertes Feature nach Kartenwechsel', () => {
	// F-11 „Tests": „kein selektiertes Feature." loadMap() hebt die Selektion auf (F-03
	// „Umfang"); highlight muss diesem Zustand folgen, statt eine veraltete Menge zu behalten.
	it('wird null, sobald eine neue Karte geladen wird', () => {
		loadMap(map([feature('a'), feature('b')], [relation('a', 'b', 'requires')]));
		selectedId.set('a');
		expect(get(highlight)).not.toBeNull();

		loadMap(map([feature('a'), feature('b')], [relation('a', 'b', 'requires')]));
		expect(get(highlight)).toBeNull();
	});
});

describe('highlight — Leistungstest (NFR-03)', () => {
	// F-11-AK / NFR-03: „Bei 100 Features und 300 Kanten liegt die Zeit zwischen Klick und
	// fertiger Hervorhebung unter 50 ms." Geprüft wird hier der reine Rechenanteil (Ableitung
	// von highlight); der Anteil der Oberfläche (Klick bis Neurendern) ist Gegenstand des
	// entsprechenden E2E-Tests in e2e/F-11-selektion.spec.ts.
	it('leitet die Hervorhebung für 100 Features und 300 Kanten in unter 50 ms ab', () => {
		const features: Feature[] = [];
		for (let i = 0; i < 100; i++) features.push(feature(`f${i}`));

		const relations: Relation[] = [];
		for (let i = 0; i < 99; i++) relations.push(relation(`f${i}`, `f${i + 1}`, 'requires'));
		let i = 0;
		while (relations.length < 300) {
			const from = i % 100;
			const to = (i * 7 + 3) % 100;
			if (from !== to) relations.push(relation(`f${from}`, `f${to}`, 'relates'));
			i++;
		}

		loadMap(map(features, relations));
		highlightMode.set('transitive');

		const start = performance.now();
		selectedId.set('f0');
		const set = get(highlight);
		const duration = performance.now() - start;

		expect(duration).toBeLessThan(50);
		expect(set).not.toBeNull();
	});
});
