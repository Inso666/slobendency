// FeatureList · Filterlogik, Sortierung, Gruppierung (F-14 · features/F-14-verzeichnis.md,
// Abschnitte "Verhalten" und "DDD-Einordnung"; PRD FR-51 bis FR-53).
//
// Reine Funktionen, kein Framework-, DOM- oder Store-Bezug: Filter, Sortierung und Gruppierung
// sind Anzeigezustand der Komponente (F-14, Abschnitt "DDD-Einordnung"), das Revier je Feature
// kommt aber unverändert aus quadrantOf() (src/lib/model/validation.ts, F-02) — diese Datei
// berechnet es nicht neu, sondern gruppiert lediglich anhand seines Ergebnisses.
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import { quadrantOf } from '../../model/validation';
import type { Feature, Quadrant } from '../../model/types';

/** Kriterium der Sortierung (F-14, Abschnitt "Verhalten", Zeile "Sortierung wählen"; FR-53). */
export type SortKey = 'label' | 'impact' | 'effort';

/** Eine Reviergruppe im Verzeichnis mit ihren Features, in Anzeigereihenfolge. */
export interface FeatureListGroup {
	quadrant: Quadrant;
	features: Feature[];
}

/** Feste Anzeigereihenfolge der Reviere im Verzeichnis (F-14, Abschnitt "Umfang": "Quick Wins,
 * Große Vorhaben, Nebenbei, Vermeiden — in dieser Reihenfolge, leere Gruppen entfallen"). */
export const QUADRANT_ORDER: Quadrant[] = ['quickWins', 'grosseVorhaben', 'nebenbei', 'vermeiden'];

/**
 * Filtert Features über Anzeigename und Kennung, Groß-/Kleinschreibung egal, als Teiltreffer
 * (FR-52, F-14-AK: Filter `sso` findet ein Feature mit der Kennung `sso` ebenso wie eines mit
 * abweichendem Namen, dessen Kennung `sso` als Teilzeichenkette enthält). Ein leerer oder reiner
 * Leerraum-Filter liefert alle Features unverändert in ihrer bisherigen Reihenfolge.
 */
export function filterFeatures(features: Feature[], query: string): Feature[] {
	throw new Error('not implemented');
}

/**
 * Sortiert Features nach dem gewählten Kriterium (FR-53, F-14, Abschnitt "Verhalten"): nach
 * Anzeigename (`label` ?? `id`, siehe Ubiquitous Language) aufsteigend, nach `impact` oder
 * `effort` absteigend. Die Sortierung ist stabil; sie verändert weder `features` noch dessen
 * Reihenfolge bei Gleichstand.
 */
export function sortFeatures(features: Feature[], sortBy: SortKey): Feature[] {
	throw new Error('not implemented');
}

/**
 * Gruppiert Features nach ihrem Revier (quadrantOf() aus src/lib/model/validation.ts, F-02) in
 * der festen Reihenfolge QUADRANT_ORDER; ein Revier ohne Treffer erscheint nicht in der
 * zurückgegebenen Liste (F-14, Abschnitt "Umfang": "leere Gruppen entfallen"). Innerhalb einer
 * Gruppe bleibt die Reihenfolge von `features` unverändert — eine vorherige Sortierung
 * (sortFeatures()) wird hier nicht neu vorgenommen.
 */
export function groupByQuadrant(features: Feature[], domainMax: number): FeatureListGroup[] {
	throw new Error('not implemented');
}

/** Deutsche Beschriftung eines Reviers für die Gruppenüberschrift im Verzeichnis
 * (design/03-seekarte.html: "Quick Wins", "Große Vorhaben", "Nebenbei", "Vermeiden"). */
export function quadrantLabel(quadrant: Quadrant): string {
	throw new Error('not implemented');
}

// re-exportiert, damit Aufrufer quadrantOf nicht zusätzlich aus model/validation importieren
// müssen, ohne dass diese Datei die Regel selbst dupliziert (features/README.md, Leitplanke 3).
export { quadrantOf };
