// Selektionszustand und Verbindungsvorgang (F-03 · features/F-03-kartenstore.md, Abschnitt
// „Umfang"). Sitzungszustand der Oberfläche — bewusst kein Teil des Aggregats FeatureMap und
// wird nicht persistiert (F-03, Abschnitt „DDD-Einordnung").
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf von clearSelection() ist Aufgabe des
// Feature-Agenten. mapStore.ts hebt Selektion und Verbindungsvorgang zusätzlich bei
// deleteFeature, renameFeatureId und loadMap auf (F-03, Abschnitt „Fachregeln").

import { writable, type Writable } from 'svelte/store';
import type { FeatureId } from '../model/types';

/** Kennung des aktuell selektierten Features, oder null ohne Selektion. */
export const selectedId: Writable<FeatureId | null> = writable(null);

/** Hervorhebungsmodus bei Selektion: nur direkte Nachbarn oder transitive
 * requires-Vorbedingungen (PRD FR-41, FR-42, FR-44). Startwert 'transitive'. */
export const highlightMode: Writable<'direct' | 'transitive'> = writable('transitive');

/** Startfeature eines laufenden Verbindungsvorgangs (PRD FR-11 bis FR-14), oder null ohne
 * laufenden Vorgang. */
export const connectSource: Writable<FeatureId | null> = writable(null);

/** Hebt Selektion und einen laufenden Verbindungsvorgang auf (PRD FR-13, FR-46). */
export function clearSelection(): void {
	throw new Error('not implemented');
}
