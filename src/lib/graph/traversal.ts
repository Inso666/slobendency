// F-07 · Vorbedingungen und Zyklen — Domänen-Service für transitive Vorbedingungen.
// Quelle: features/F-07-graph-services.md, Abschnitt „Umfang".
//
// Signatur ist vom Test-Agenten vorgegeben. Der Feature-Agent füllt die Rümpfe mit Leben.
// Frameworkfrei — keine Svelte-, $app- oder DOM-Bezüge (features/README.md, Leitplanke 1).

import type { FeatureId, FeatureMap, Relation } from '../model/types';

/** Ergebnis einer Graphabfrage: erreichte Features (ohne den Startknoten) und beteiligte Kanten. */
export interface Closure {
	features: Set<FeatureId>;
	relations: Relation[];
}

/**
 * Löst alle transitiven `requires`-Vorbedingungen von `start` auf, über beliebig viele
 * Stufen (FR-41). Folgt ausschließlich ausgehenden `requires`-Kanten; wird nicht über
 * `relates` oder `excludes` fortgesetzt (PRD 3.2, features/F-07-graph-services.md).
 */
export function requiresClosure(map: FeatureMap, start: FeatureId): Closure {
	// Adjazenz nur über requires-Kanten (FR-41); relates/excludes werden nicht mitgeführt
	// (FR-42, PRD 3.2). Vorab indiziert, damit die Traversierung O(V + E) bleibt (NFR-03).
	const outgoing = new Map<FeatureId, Relation[]>();
	for (const relation of map.relations) {
		if (relation.type !== 'requires') continue;
		const list = outgoing.get(relation.from);
		if (list) list.push(relation);
		else outgoing.set(relation.from, [relation]);
	}

	const features = new Set<FeatureId>();
	const relations: Relation[] = [];
	const visited = new Set<FeatureId>();
	const stack: FeatureId[] = [start];

	// Iterativ mit Stapel und Besuchsmenge nach PRD 7.3, damit ein Zyklus nicht in eine
	// Endlosschleife läuft (features/F-07-graph-services.md).
	while (stack.length > 0) {
		const current = stack.pop() as FeatureId;
		if (visited.has(current)) continue; // Zyklusschutz
		visited.add(current);

		for (const relation of outgoing.get(current) ?? []) {
			relations.push(relation);
			features.add(relation.to);
			stack.push(relation.to);
		}
	}

	// Der Startknoten selbst gehört nie zur Closure, auch nicht, wenn ein Zyklus auf ihn
	// zurückführt — die zurückführende Kante bleibt aber Teil des Ergebnisses.
	features.delete(start);
	return { features, relations };
}

/**
 * Liefert alle direkten Nachbarn eines Features samt der ein- und ausgehenden Kanten,
 * unabhängig von deren Art (features/F-07-graph-services.md, Abschnitt „Umfang"). Welche
 * davon hervorgehoben werden, entscheidet F-11.
 */
export function directNeighbours(map: FeatureMap, id: FeatureId): Closure {
	const features = new Set<FeatureId>();
	const relations: Relation[] = [];

	for (const relation of map.relations) {
		if (relation.from === id) {
			relations.push(relation);
			if (relation.to !== id) features.add(relation.to);
		} else if (relation.to === id) {
			relations.push(relation);
			if (relation.from !== id) features.add(relation.from);
		}
	}

	return { features, relations };
}
