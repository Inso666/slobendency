// DSL-Parser (F-05 · features/F-05-dsl-parser.md, Abschnitt „Umfang").
//
// Anti-Corruption Layer: übersetzt einen fremden, menschengeschriebenen Text (PRD 4.2) in
// eine geprüfte FeatureMap — oder in eine vollständige, zeilengenaue Fehlerliste. Importierter
// Text gilt als nicht vertrauenswürdig (NFR-21): Anzeigenamen und Kantenbeschriftungen werden
// unverändert als Text übernommen, nie interpretiert. Frameworkfrei — keine Svelte-, $app-
// oder DOM-Bezüge (features/README.md, Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten.

import type { FeatureMap } from '../model/types';
import type { ParseError } from './errors';

export type ParseResult = { ok: true; map: FeatureMap } | { ok: false; errors: ParseError[] };

/** Parst ein DSL-Dokument (PRD 4.2) zu einer FeatureMap oder einer Fehlerliste. */
export function parse(text: string): ParseResult {
	throw new Error('not implemented');
}
