// Domänenmodell (F-02 · features/F-02-domaenenmodell.md, Abschnitt „Umfang").
//
// Aggregat-Wurzel FeatureMap mit ihren Entitäten und Value Objects. Frameworkfrei — keine
// Svelte-, $app- oder DOM-Bezüge (features/README.md, Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Der Feature-Agent füllt die Operationen in
// validation.ts mit Leben; dieses Modul enthält nur Typen und Konstanten.

/** Aktuelle Version des Datenmodells (PRD 3.1, NFR-42). */
export const SCHEMA_VERSION = 1;

/** Schätzreihe, aus der das Formular Werte anbietet (PRD FR-02, features/README.md). */
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21] as const;

/** Kennung eines Features. Validiert über validation.ts, nicht bloß benannt. */
export type FeatureId = string;

/** Art einer gerichteten Beziehung zwischen zwei Features (PRD 3.2). */
export type RelationType = 'requires' | 'relates' | 'excludes';

/** Revier, in dem ein Wertepaar liegt (PRD 5.3, features/README.md). Nie gespeichert. */
export type Quadrant = 'quickWins' | 'grosseVorhaben' | 'nebenbei' | 'vermeiden';

/** Entität Feature (PRD 3.1). Identität ist `id`. */
export interface Feature {
	id: FeatureId;
	label?: string;
	impact: number;
	effort: number;
}

/** Value Object Relation (PRD 3.1). Teil des Aggregats FeatureMap, nicht des Features. */
export interface Relation {
	from: FeatureId;
	to: FeatureId;
	type: RelationType;
	label?: string;
}

/** Aggregat-Wurzel (PRD 3.1). Genau eine aktive Karte (FR-73). */
export interface FeatureMap {
	schemaVersion: number;
	features: Feature[];
	relations: Relation[];
}
