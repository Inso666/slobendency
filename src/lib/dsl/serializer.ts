// DSL-Serializer (F-06 · features/F-06-dsl-serializer.md, Abschnitt „Umfang").
//
// Anti-Corruption Layer, Gegenstück zum Parser: übersetzt eine geprüfte FeatureMap zurück in
// den DSL-Text (PRD 4.6, Abschnitt „Ausgabeform" in F-06: DSL-10 bis DSL-14). Der Serializer
// erhält bereits eine gültige Karte — er prüft keine Fachregeln erneut, sondern formatiert nur
// (features/README.md, Leitplanke 3). Frameworkfrei — keine Svelte-, $app- oder DOM-Bezüge
// (features/README.md, Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten.

import type { Feature, FeatureMap, Relation, RelationType } from '../model/types';

/** Pfeilzuordnung nach PRD 4.3, Kehrseite der Zuordnung in parser.ts. */
const RELATION_ARROW: Record<RelationType, string> = {
	requires: '-->',
	relates: '-.->',
	excludes: '--x'
};

/** Sortierreihenfolge der Beziehungsarten (features/README.md, „Zwei Präzisierungen", Nr. 2). */
const RELATION_ORDER: Record<RelationType, number> = {
	requires: 0,
	relates: 1,
	excludes: 2
};

/** Vergleich zweier Kennungen über Zeichencode, nicht über Locale-Regeln (DSL-11). */
function compareByCharCode(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

/** Namensteil einer Feature-Zeile: `kennung` oder `kennung["Anzeigename"]` (DSL-13). */
function namePart(feature: Feature): string {
	const hasOwnLabel = feature.label !== undefined && feature.label !== feature.id;
	return hasOwnLabel ? `${feature.id}["${feature.label}"]` : feature.id;
}

/**
 * Feature-Block (DSL-11, DSL-12, DSL-13): nach Kennung sortiert, Namensteil und Nutzenwert
 * jeweils auf die größte im Dokument vorkommende Breite aufgefüllt (features/README.md,
 * Abschnitt „Entscheidungen des Orchestrators" zu DSL-12: der Nutzenwert selbst wird rechts
 * mit Leerzeichen aufgefüllt, danach folgen „, " und „effort=").
 */
function serializeFeatures(features: readonly Feature[]): string[] {
	const sorted = [...features].sort((a, b) => compareByCharCode(a.id, b.id));
	const names = sorted.map(namePart);
	const nameWidth = names.reduce((max, name) => Math.max(max, name.length), 0);
	const impactWidth = sorted.reduce((max, f) => Math.max(max, String(f.impact).length), 0);

	return sorted.map((feature, index) => {
		const name = names[index].padEnd(nameWidth);
		const impact = String(feature.impact).padEnd(impactWidth);
		return `${name} :: impact=${impact}, effort=${feature.effort}`;
	});
}

/**
 * Beziehungs-Block: sortiert nach Quelle, dann Art (`requires`, `relates`, `excludes`), dann
 * Ziel (features/README.md, „Zwei Präzisierungen", Nr. 2). Beschriftung ohne Leerzeichen
 * zwischen Pfeil und `|`.
 */
function serializeRelations(relations: readonly Relation[]): string[] {
	const sorted = [...relations].sort((a, b) => {
		const bySource = compareByCharCode(a.from, b.from);
		if (bySource !== 0) return bySource;
		const byType = RELATION_ORDER[a.type] - RELATION_ORDER[b.type];
		if (byType !== 0) return byType;
		return compareByCharCode(a.to, b.to);
	});

	return sorted.map((relation) => {
		const arrow = RELATION_ARROW[relation.type];
		const label = relation.label !== undefined ? `|"${relation.label}"|` : '';
		return `${relation.from} ${arrow}${label} ${relation.to}`;
	});
}

/**
 * Serialisiert eine Karte zu DSL-Text (PRD 4.6).
 *
 * Feste Struktur (DSL-10): Kopfzeile, Leerzeile, Feature-Block, Leerzeile, Beziehungs-Block;
 * die Datei endet mit genau einem Zeilenumbruch. Ein leerer Block (keine Features bzw. keine
 * Beziehungen) erzeugt weder sich selbst noch die ihm vorangehende Leerzeile — sonst gäbe es
 * bei einer leeren Karte mehr als einen abschließenden Zeilenumbruch. Features werden
 * aufsteigend nach Kennung sortiert ausgegeben (DSL-11), Beziehungen nach Quelle, Art
 * (`requires`, `relates`, `excludes`) und Ziel (features/README.md, „Zwei Präzisierungen").
 * Rundreise mit parse() aus ./parser.ts ist byteidentisch (DSL-14).
 */
export function serialize(map: FeatureMap): string {
	const lines = ['featuremap v1'];

	const featureLines = serializeFeatures(map.features);
	if (featureLines.length > 0) {
		lines.push('', ...featureLines);
	}

	const relationLines = serializeRelations(map.relations);
	if (relationLines.length > 0) {
		lines.push('', ...relationLines);
	}

	return `${lines.join('\n')}\n`;
}
