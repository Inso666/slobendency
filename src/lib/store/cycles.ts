// F-23 · Zyklenprüfung als abgeleiteter Store (features/F-23-statuszeile.md, Abschnitt
// „Fachregeln": „Die Zyklenprüfung läuft nach jeder Änderung an Beziehungen, nicht bei jedem
// Rendern."; StatusBar.svelte, Kopfkommentar: „eine naheliegende Umsetzung ist ein von `map`
// abgeleiteter Store, der `findRequiresCycles` nur bei einer tatsächlichen Änderung von
// `map.relations` neu aufruft.").
//
// findRequiresCycles() selbst kommt unverändert aus src/lib/graph/cycles.ts (F-07) — dieses
// Modul formuliert die Regel (INT-05) nicht neu, sondern entscheidet nur, wann sie erneut
// aufgerufen wird (features/README.md, Leitplanke 3). Gebraucht von StatusBar.svelte
// (Zyklen-Feld, Klick selektiert das erste Feature des ersten Zyklus) und Edges.svelte
// (dauerhafte Magenta-Färbung der am Zyklus beteiligten requires-Kanten, unabhängig von der
// Selektion, F-23 Abschnitt „Umfang").

import { derived, type Readable } from 'svelte/store';
import { findRequiresCycles, type Cycle } from '../graph/cycles';
import type { FeatureMap } from '../model/types';
import { map } from './mapStore';

let lastRelations: FeatureMap['relations'] | undefined;
let lastCycles: Cycle[] = [];

/**
 * Aktuell gefundene `requires`-Zyklen (INT-05). Wird nur neu berechnet, wenn sich
 * `map.relations` seit dem letzten Aufruf tatsächlich geändert hat (Referenzvergleich) — die
 * Aggregatsoperationen in src/lib/model/validation.ts geben bei unverändertem `relations` stets
 * dieselbe Array-Referenz zurück (z. B. updateFeature, das nur `features` ersetzt), sodass ein
 * Referenzvergleich hier ausreicht, ohne die Karte selbst zu vergleichen.
 */
export const cycles: Readable<Cycle[]> = derived(map, ($map): Cycle[] => {
	if ($map.relations !== lastRelations) {
		lastRelations = $map.relations;
		lastCycles = findRequiresCycles($map);
	}
	return lastCycles;
});
