// Hervorhebung und Dimming bei Selektion (F-11 · features/F-11-selektion.md, Abschnitt
// „Umfang"). Darstellung über den Domänen-Services aus F-07 (src/lib/graph/traversal.ts):
// *was* hervorgehoben wird, stammt aus der Domäne; *wie* es hervorgehoben wird, entscheidet
// dieses Feature (F-11, Abschnitt „DDD-Einordnung").
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten. Der
// Store leitet sich aus selectedId, highlightMode (beide aus selection.ts, F-03) und der
// aktiven Karte (mapStore.ts, F-03) ab.

import { derived, type Readable } from 'svelte/store';
import type { FeatureId, Relation } from '../model/types';
import { directNeighbours, requiresClosure } from '../graph/traversal';
import { map } from './mapStore';
import { highlightMode, selectedId } from './selection';

/** Ergebnis der Hervorhebung bei aktiver Selektion (F-11, Abschnitt „Umfang"). */
export interface HighlightSet {
	features: Set<FeatureId>;
	relations: Set<string>;
}

/** Eindeutiger Schlüssel einer Beziehung für `HighlightSet.relations`: "from|type|to". */
export function relationKey(relation: Relation): string {
	return `${relation.from}|${relation.type}|${relation.to}`;
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
export const highlight: Readable<HighlightSet | null> = derived(
	[map, selectedId, highlightMode],
	([$map, $selectedId, $highlightMode]): HighlightSet | null => {
		if ($selectedId === null) return null;

		const features = new Set<FeatureId>([$selectedId]);
		const relations = new Set<string>();

		if ($highlightMode === 'direct') {
			// Nur direkte: alle direkten Nachbarn unabhängig von der Art, ohne transitive
			// Fortsetzung (FR-44, F-07 directNeighbours).
			const { features: neighbours, relations: neighbourRelations } = directNeighbours(
				$map,
				$selectedId
			);
			for (const id of neighbours) features.add(id);
			for (const relation of neighbourRelations) relations.add(relationKey(relation));
			return { features, relations };
		}

		// Transitiv: requires-Vorbedingungen beliebig tief (FR-41), dazu die direkten relates-
		// und excludes-Nachbarn, aber nicht deren Fortsetzung (FR-42).
		const closure = requiresClosure($map, $selectedId);
		for (const id of closure.features) features.add(id);
		for (const relation of closure.relations) relations.add(relationKey(relation));

		const direct = directNeighbours($map, $selectedId);
		for (const relation of direct.relations) {
			if (relation.type === 'relates' || relation.type === 'excludes') {
				relations.add(relationKey(relation));
				features.add(relation.from === $selectedId ? relation.to : relation.from);
			}
		}

		return { features, relations };
	}
);
