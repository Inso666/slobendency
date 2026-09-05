// F-07 · Vorbedingungen und Zyklen — Domänen-Service für Zyklenerkennung.
// Quelle: features/F-07-graph-services.md, Abschnitt „Umfang".
//
// Signatur ist vom Test-Agenten vorgegeben. Der Feature-Agent füllt die Rümpfe mit Leben.
// Frameworkfrei — keine Svelte-, $app- oder DOM-Bezüge (features/README.md, Leitplanke 1).

import type { FeatureId, FeatureMap, Relation } from '../model/types';

/** Ein gefundener Zyklus im `requires`-Teilgraphen: Knotenfolge und beteiligte Kanten. */
export interface Cycle {
	path: FeatureId[];
	relations: Relation[];
}

/**
 * Findet alle Zyklen im `requires`-Teilgraphen (INT-05) per Tiefensuche mit
 * Drei-Farben-Markierung; eine Rückwärtskante auf einen grauen Knoten schließt einen Zyklus.
 * Jeder gefundene Pfad wird so zurückgegeben, dass er mit dem kleinsten enthaltenen
 * Bezeichner beginnt (features/F-07-graph-services.md).
 */
export function findRequiresCycles(map: FeatureMap): Cycle[] {
	// Adjazenz nur über requires-Kanten (INT-05 gilt ausschließlich für diesen Teilgraphen,
	// PRD 3.2). relates/excludes bilden per Definition keine transitive Ordnung.
	const outgoing = new Map<FeatureId, Relation[]>();
	for (const relation of map.relations) {
		if (relation.type !== 'requires') continue;
		const list = outgoing.get(relation.from);
		if (list) list.push(relation);
		else outgoing.set(relation.from, [relation]);
	}

	const color = new Map<FeatureId, 'white' | 'gray' | 'black'>();
	for (const feature of map.features) color.set(feature.id, 'white');

	const stack: FeatureId[] = [];
	const cycles: Cycle[] = [];

	function visit(node: FeatureId): void {
		color.set(node, 'gray');
		stack.push(node);

		for (const relation of outgoing.get(node) ?? []) {
			const target = relation.to;
			const targetColor = color.get(target);
			if (targetColor === 'white') {
				visit(target);
			} else if (targetColor === 'gray') {
				// Rückwärtskante auf einen grauen Knoten: schließt einen Zyklus (INT-05).
				const startIndex = stack.indexOf(target);
				cycles.push(buildCycle(stack.slice(startIndex), outgoing));
			}
			// Schwarzer Knoten: bereits vollständig durchsucht, kein Zyklus über diese Kante.
		}

		stack.pop();
		color.set(node, 'black');
	}

	for (const feature of map.features) {
		if (color.get(feature.id) === 'white') visit(feature.id);
	}

	return cycles;
}

/** Baut aus dem rohen DFS-Pfad einen Zyklus, rotiert auf den kleinsten Bezeichner. */
function buildCycle(rawPath: FeatureId[], outgoing: Map<FeatureId, Relation[]>): Cycle {
	let smallest = 0;
	for (let i = 1; i < rawPath.length; i++) {
		if (rawPath[i] < rawPath[smallest]) smallest = i;
	}
	const path = [...rawPath.slice(smallest), ...rawPath.slice(0, smallest)];

	const relations: Relation[] = [];
	for (let i = 0; i < path.length; i++) {
		const from = path[i];
		const to = path[(i + 1) % path.length];
		const relation = (outgoing.get(from) ?? []).find((r) => r.to === to);
		if (relation) relations.push(relation);
	}

	return { path, relations };
}

/** Prüft, ob eine Beziehung an einem der übergebenen Zyklen beteiligt ist. */
export function isOnCycle(cycles: Cycle[], relation: Relation): boolean {
	return cycles.some((cycle) =>
		cycle.relations.some(
			(r) => r.from === relation.from && r.to === relation.to && r.type === relation.type
		)
	);
}
