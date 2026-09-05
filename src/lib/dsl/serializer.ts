// DSL-Serializer (F-06 · features/F-06-dsl-serializer.md, Abschnitt „Umfang").
//
// Anti-Corruption Layer, Gegenstück zum Parser: übersetzt eine geprüfte FeatureMap zurück in
// den DSL-Text (PRD 4.6, Abschnitt „Ausgabeform" in F-06: DSL-10 bis DSL-14). Der Serializer
// erhält bereits eine gültige Karte — er prüft keine Fachregeln erneut, sondern formatiert nur
// (features/README.md, Leitplanke 3). Frameworkfrei — keine Svelte-, $app- oder DOM-Bezüge
// (features/README.md, Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten.

import type { FeatureMap } from '../model/types';

/**
 * Serialisiert eine Karte zu DSL-Text (PRD 4.6).
 *
 * Feste Struktur (DSL-10): Kopfzeile, Leerzeile, Feature-Block, Leerzeile, Beziehungs-Block;
 * die Datei endet mit genau einem Zeilenumbruch. Features werden aufsteigend nach Kennung
 * sortiert ausgegeben (DSL-11), Beziehungen nach Quelle, Art (`requires`, `relates`,
 * `excludes`) und Ziel (features/README.md, „Zwei Präzisierungen"). Rundreise mit parse() aus
 * ./parser.ts ist byteidentisch (DSL-14).
 */
export function serialize(map: FeatureMap): string {
	throw new Error('not implemented');
}
