// Hervorhebung und Dimming bei Selektion (F-11 · features/F-11-selektion.md, Abschnitt
// „Umfang"). Darstellung über den Domänen-Services aus F-07 (src/lib/graph/traversal.ts):
// *was* hervorgehoben wird, stammt aus der Domäne; *wie* es hervorgehoben wird, entscheidet
// dieses Feature (F-11, Abschnitt „DDD-Einordnung").
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten. Der
// Store leitet sich aus selectedId, highlightMode (beide aus selection.ts, F-03) und der
// aktiven Karte (mapStore.ts, F-03) ab.

import type { Readable } from 'svelte/store';
import type { FeatureId, Relation } from '../model/types';

/** Ergebnis der Hervorhebung bei aktiver Selektion (F-11, Abschnitt „Umfang"). */
export interface HighlightSet {
	features: Set<FeatureId>;
	relations: Set<string>;
}

/**
 * Abgeleiteter Hervorhebungszustand: null ohne Selektion, sonst die Menge der hervorgehobenen
 * Features und Beziehungen (F-11, Abschnitte „Umfang" und „Darstellung").
 *
 * - Modus *transitiv*: `requiresClosure` für alle Vorbedingungen, dazu die direkten
 *   `relates`- und `excludes`-Nachbarn des selektierten Features (FR-41, FR-42).
 * - Modus *nur direkte*: alle direkten Nachbarn des selektierten Features, unabhängig von der
 *   Art, ohne transitive Fortsetzung (FR-44).
 * - Das selektierte Feature ist immer Teil von `features`.
 */
export const highlight: Readable<HighlightSet | null> = {
	subscribe(): () => void {
		throw new Error('not implemented');
	}
};

/** Eindeutiger Schlüssel einer Beziehung für `HighlightSet.relations`: "from|type|to". */
export function relationKey(relation: Relation): string {
	throw new Error('not implemented');
}
