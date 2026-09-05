// DSL-Parser (F-05 · features/F-05-dsl-parser.md, Abschnitt „Umfang").
//
// Anti-Corruption Layer: übersetzt einen fremden, menschengeschriebenen Text (PRD 4.2) in
// eine geprüfte FeatureMap — oder in eine vollständige, zeilengenaue Fehlerliste. Importierter
// Text gilt als nicht vertrauenswürdig (NFR-21): Anzeigenamen und Kantenbeschriftungen werden
// unverändert als Text übernommen, nie interpretiert. Frameworkfrei — keine Svelte-, $app-
// oder DOM-Bezüge (features/README.md, Leitplanke 1).
//
// Fachregeln (INT-01 bis INT-07) prüft nicht dieser Parser ein zweites Mal, sondern das
// Aggregat aus model/validation.ts — der Parser übersetzt dessen RuleViolation nur in eine
// zeilengenaue ParseError (features/README.md, Leitplanke 3: „Fachregeln stehen im
// Aggregat, nicht in Komponenten"). Was der Parser selbst prüft, ist ausschließlich die DSL-
// Grammatik (PRD 4.2): Kopfzeile, Satzbau einer Zeile, Pflichtattribute (DSL-06).
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten.

import { addFeature, addRelation } from '../model/validation';
import type { RuleViolation } from '../model/validation';
import { SCHEMA_VERSION } from '../model/types';
import type { Feature, FeatureMap, Relation, RelationType } from '../model/types';
import type { ParseError, ParseErrorCode } from './errors';
import { tokenizeLine } from './tokenizer';
import type { Token } from './tokenizer';

export type ParseResult = { ok: true; map: FeatureMap } | { ok: false; errors: ParseError[] };

/** Pfeilzuordnung nach PRD 4.3. */
const ARROW_TYPE: Record<string, RelationType> = {
	'-->': 'requires',
	'-.->': 'relates',
	'--x': 'excludes'
};

function makeError(line: number, source: string, code: ParseErrorCode, message: string): ParseError {
	return { line, source, code, message };
}

interface FeatureDraft {
	feature: Feature;
	line: number;
	source: string;
}

interface RelationDraft {
	from: string;
	to: string;
	type: RelationType;
	label?: string;
	line: number;
	source: string;
}

type LineOutcome<T> =
	| { kind: 'match'; draft: T }
	| { kind: 'error'; code: ParseErrorCode; message: string }
	| { kind: 'noMatch' };

/** Prüft die Kopfzeile (DSL-07). Liefert einen Fehler oder `undefined`, wenn sie gültig ist. */
function checkHeader(firstLine: string): ParseError | undefined {
	const match = /^featuremap[ \t]+v(-?\d+)[ \t]*$/.exec(firstLine);
	if (!match) {
		return makeError(
			1,
			firstLine,
			'headerMissing',
			'Kopfzeile fehlt oder ist ungültig — erwartet wird „featuremap v1".'
		);
	}
	const version = Number(match[1]);
	if (version !== SCHEMA_VERSION) {
		return makeError(
			1,
			firstLine,
			'unsupportedVersion',
			`Nicht unterstützte Version „v${version}" — unterstützt wird nur „v${SCHEMA_VERSION}".`
		);
	}
	return undefined;
}

/** Versucht, eine Marken-Folge als feature_def zu lesen (PRD 4.2). */
function tryParseFeatureDef(tokens: Token[]): LineOutcome<Feature> {
	if (tokens.length === 0 || tokens[0].type !== 'word') return { kind: 'noMatch' };

	const id = tokens[0].value;
	let i = 1;
	let label: string | undefined;

	if (tokens[i]?.type === 'punct' && tokens[i].value === '[') {
		const stringTok = tokens[i + 1];
		const closeTok = tokens[i + 2];
		if (stringTok?.type === 'string' && closeTok?.type === 'punct' && closeTok.value === ']') {
			label = stringTok.value;
			i += 3;
		} else {
			return {
				kind: 'error',
				code: 'syntax',
				message: 'Anzeigename in eckigen Klammern ist nicht korrekt mit „..." abgeschlossen.'
			};
		}
	}

	if (!(tokens[i]?.type === 'punct' && tokens[i].value === '::')) {
		// Ohne "::" ist die Zeile keine feature_def — vielleicht eine relation_def.
		return { kind: 'noMatch' };
	}
	i += 1;

	const attributes = new Map<string, string>();
	for (;;) {
		const nameTok = tokens[i];
		const eqTok = tokens[i + 1];
		const valueTok = tokens[i + 2];

		if (!nameTok || nameTok.type !== 'word' || (nameTok.value !== 'impact' && nameTok.value !== 'effort')) {
			return {
				kind: 'error',
				code: 'syntax',
				message: 'Erwartet wird ein Attribut „impact" oder „effort".'
			};
		}
		if (!eqTok || eqTok.type !== 'punct' || eqTok.value !== '=') {
			return {
				kind: 'error',
				code: 'syntax',
				message: `Erwartet wird „=" nach dem Attribut „${nameTok.value}".`
			};
		}
		if (!valueTok || valueTok.type !== 'word' || !/^-?\d+$/.test(valueTok.value)) {
			return {
				kind: 'error',
				code: 'syntax',
				message: `Der Wert von „${nameTok.value}" muss eine Ganzzahl sein.`
			};
		}

		attributes.set(nameTok.value, valueTok.value);
		i += 3;

		if (tokens[i]?.type === 'punct' && tokens[i].value === ',') {
			i += 1;
			continue;
		}
		break;
	}

	if (i !== tokens.length) {
		return { kind: 'error', code: 'syntax', message: 'Unerwartete Zeichen am Ende der Feature-Definition.' };
	}

	if (!attributes.has('impact') || !attributes.has('effort')) {
		// An dieser Stelle ist die Attributliste nicht leer (die Schleife oben verlässt sich
		// nur nach mindestens einem erfolgreich gelesenen Attribut über `break`) — es fehlt
		// also stets genau eines der beiden Pflichtattribute, nie beide zugleich.
		const missing = attributes.has('impact') ? 'effort' : 'impact';
		return { kind: 'error', code: 'missingAttribute', message: `Pflichtattribut „${missing}" fehlt.` };
	}

	const feature: Feature = {
		id,
		impact: Number(attributes.get('impact')),
		effort: Number(attributes.get('effort')),
		...(label !== undefined ? { label } : {})
	};

	return { kind: 'match', draft: feature };
}

interface RelationFields {
	from: string;
	to: string;
	type: RelationType;
	label?: string;
}

/** Versucht, eine Marken-Folge als relation_def zu lesen (PRD 4.2, 4.3). */
function tryParseRelationDef(tokens: Token[]): LineOutcome<RelationFields> {
	if (tokens.length === 0 || tokens[0].type !== 'word') return { kind: 'noMatch' };

	const from = tokens[0].value;
	const arrowTok = tokens[1];
	if (!arrowTok || arrowTok.type !== 'arrow') return { kind: 'noMatch' };
	const type = ARROW_TYPE[arrowTok.value];

	let i = 2;
	let label: string | undefined;

	if (tokens[i]?.type === 'punct' && tokens[i].value === '|') {
		const stringTok = tokens[i + 1];
		const closeTok = tokens[i + 2];
		if (stringTok?.type === 'string' && closeTok?.type === 'punct' && closeTok.value === '|') {
			label = stringTok.value;
			i += 3;
		} else {
			return {
				kind: 'error',
				code: 'syntax',
				message: 'Kantenbeschriftung zwischen „|"-Zeichen ist nicht korrekt abgeschlossen.'
			};
		}
	}

	const toTok = tokens[i];
	if (!toTok || toTok.type !== 'word') {
		return { kind: 'error', code: 'syntax', message: 'Zielkennung der Beziehung fehlt oder ist ungültig.' };
	}
	i += 1;

	if (i !== tokens.length) {
		return { kind: 'error', code: 'syntax', message: 'Unerwartete Zeichen am Ende der Beziehungsdefinition.' };
	}

	return { kind: 'match', draft: { from, to: toTok.value, type, ...(label !== undefined ? { label } : {}) } };
}

/** Übersetzt eine Regelverletzung des Aggregats in den passenden DSL-Fehlercode. */
function ruleToCode(violation: RuleViolation): ParseErrorCode {
	switch (violation.rule) {
		case 'INT-01':
			return 'duplicateId';
		case 'INT-02':
			return 'unknownReference';
		case 'INT-03':
			return 'selfReference';
		case 'INT-04':
			return 'duplicateRelation';
		case 'INT-07':
			return 'negativeValue';
		default:
			// FIELD-Verletzungen: Längenüberschreitung wird als valueTooLong gemeldet
			// (NFR-23), alles andere (z. B. der Zeichensatz der Kennung, PRD 4.2) als
			// allgemeiner Syntaxfehler.
			return /höchstens \d+ Zeichen/.test(violation.message) ? 'valueTooLong' : 'syntax';
	}
}

/** Parst ein DSL-Dokument (PRD 4.2) zu einer FeatureMap oder einer Fehlerliste. */
export function parse(text: string): ParseResult {
	const lines = text.split(/\r\n|\r|\n/);

	// `text.split` liefert immer mindestens ein Element (auch für den leeren String), `lines[0]`
	// ist deshalb nie `undefined`.
	const headerError = checkHeader(lines[0]);
	if (headerError) {
		return { ok: false, errors: [headerError] };
	}

	const errors: ParseError[] = [];
	const featureDrafts: FeatureDraft[] = [];
	const relationDrafts: RelationDraft[] = [];

	for (let idx = 1; idx < lines.length; idx += 1) {
		const lineNumber = idx + 1;
		const source = lines[idx];
		const trimmed = source.trim();

		if (trimmed === '' || trimmed.startsWith('%%')) continue;

		const tokens = tokenizeLine(source);

		const asFeature = tryParseFeatureDef(tokens);
		if (asFeature.kind === 'match') {
			featureDrafts.push({ feature: asFeature.draft, line: lineNumber, source });
			continue;
		}
		if (asFeature.kind === 'error') {
			errors.push(makeError(lineNumber, source, asFeature.code, asFeature.message));
			continue;
		}

		const asRelation = tryParseRelationDef(tokens);
		if (asRelation.kind === 'match') {
			relationDrafts.push({ ...asRelation.draft, line: lineNumber, source });
			continue;
		}
		if (asRelation.kind === 'error') {
			errors.push(makeError(lineNumber, source, asRelation.code, asRelation.message));
			continue;
		}

		errors.push(
			makeError(lineNumber, source, 'syntax', `Zeile ist weder eine gültige Feature- noch eine Beziehungsdefinition: „${trimmed}".`)
		);
	}

	// Zwei-Pass (DSL-05): erst alle Feature-Definitionen einbringen …
	let map: FeatureMap = { schemaVersion: SCHEMA_VERSION, features: [], relations: [] };
	for (const draft of featureDrafts) {
		const result = addFeature(map, draft.feature);
		if (result.ok) {
			map = result.value;
		} else {
			for (const violation of result.errors) {
				errors.push(makeError(draft.line, draft.source, ruleToCode(violation), violation.message));
			}
		}
	}

	// … dann alle Beziehungen gegen die fertige Feature-Menge auflösen.
	for (const draft of relationDrafts) {
		const relation: Relation = {
			from: draft.from,
			to: draft.to,
			type: draft.type,
			...(draft.label !== undefined ? { label: draft.label } : {})
		};
		const result = addRelation(map, relation);
		if (result.ok) {
			map = result.value;
		} else {
			for (const violation of result.errors) {
				errors.push(makeError(draft.line, draft.source, ruleToCode(violation), violation.message));
			}
		}
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, map };
}
