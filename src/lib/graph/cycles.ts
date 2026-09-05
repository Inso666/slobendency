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
	throw new Error('not implemented');
}

/** Prüft, ob eine Beziehung an einem der übergebenen Zyklen beteiligt ist. */
export function isOnCycle(cycles: Cycle[], relation: Relation): boolean {
	throw new Error('not implemented');
}
