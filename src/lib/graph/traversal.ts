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
	throw new Error('not implemented');
}

/**
 * Liefert alle direkten Nachbarn eines Features samt der ein- und ausgehenden Kanten,
 * unabhängig von deren Art (features/F-07-graph-services.md, Abschnitt „Umfang"). Welche
 * davon hervorgehoben werden, entscheidet F-11.
 */
export function directNeighbours(map: FeatureMap, id: FeatureId): Closure {
	throw new Error('not implemented');
}
