// F-05 · DSL-Parser — ergänzende Tests des Feature-Agenten (features/README.md, Regeln für
// den Feature-Agenten: „Zusätzliche Tests darf er jederzeit hinzufügen").
//
// Die vorgelegten Tests in parser.test.ts (Commit „F-05 · Tests (rot)") bleiben unverändert.
// Diese Datei ergänzt sie um Grenzfälle der DSL-Grammatik, die von den vorgelegten Tests
// nicht abgedeckt sind (fehlerhaft abgeschlossene Anzeigenamen/Kantenbeschriftungen, fehlendes
// „=", nicht-ganzzahlige Attributwerte, überzählige Marken am Zeilenende, Zeilen, die weder als
// Feature- noch als Beziehungsdefinition beginnen) — nötig, um die Zielabdeckung aus NFR-41
// (mindestens 90 % für dsl/) zu erreichen. Geprüft wird weiterhin nur das beobachtbare
// Verhalten von parse().

import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import type { ParseResult } from './parser';
import type { ParseError } from './errors';
import { tokenizeLine } from './tokenizer';

function doc(...lines: string[]): string {
	return lines.join('\n');
}

function expectFailedAt(result: ParseResult, line: number): ParseError[] {
	expect(result.ok).toBe(false);
	const errors = (result as { ok: false; errors: ParseError[] }).errors;
	expect(errors.some((e) => e.line === line)).toBe(true);
	return errors;
}

describe('tokenizeLine — unterminierte Zeichenkette', () => {
	it('liefert den Rest der Zeile als offene Zeichenkette, statt zu werfen', () => {
		const tokens = tokenizeLine('"offen ohne Ende');
		expect(tokens).toEqual([{ type: 'string', value: 'offen ohne Ende', column: 1 }]);
	});
});

describe('parse — Anzeigename in eckigen Klammern nicht korrekt abgeschlossen', () => {
	it('lehnt einen Anzeigenamen ab, dessen Zeichenkette nie geschlossen wird', () => {
		// Die fehlende zweite Anführung lässt die Zeichenkette bis Zeilenende offen; das
		// erwartete "]" fehlt dadurch ebenfalls.
		const result = parse(doc('featuremap v1', '', 'A["Name] :: impact=1, effort=1'));
		expectFailedAt(result, 3);
	});
});

describe('parse — feature_def: fehlendes "=" nach dem Attributnamen', () => {
	it('lehnt "impact 1" ohne Gleichheitszeichen ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact 1, effort=1'));
		expectFailedAt(result, 3);
	});
});

describe('parse — feature_def: nicht-ganzzahliger Attributwert', () => {
	it('lehnt impact=abc ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=abc, effort=1'));
		expectFailedAt(result, 3);
	});
});

describe('parse — feature_def: überzählige Marken am Zeilenende', () => {
	it('lehnt Text nach vollständigen, gültigen Attributen ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1, effort=1 ueberzaehlig'));
		expectFailedAt(result, 3);
	});
});

describe('parse — relation_def: Kantenbeschriftung nicht korrekt abgeschlossen', () => {
	it('lehnt eine Kantenbeschriftung ab, deren Zeichenkette nie geschlossen wird', () => {
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', 'A -->|"offen B')
		);
		expectFailedAt(result, 5);
	});
});

describe('parse — relation_def: Zielkennung fehlt', () => {
	it('lehnt eine Beziehung ohne Zielkennung nach dem Pfeil ab', () => {
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', 'A -->')
		);
		expectFailedAt(result, 5);
	});
});

describe('parse — relation_def: überzählige Marken am Zeilenende', () => {
	it('lehnt Text nach einer vollständigen, gültigen Beziehung ab', () => {
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', 'A --> B ueberzaehlig')
		);
		expectFailedAt(result, 5);
	});
});

describe('parse — Zeile beginnt weder mit einer Kennung noch einer erkennbaren Struktur', () => {
	it('lehnt eine Zeile ab, die mit einer Zeichenkette statt einer Kennung beginnt', () => {
		const result = parse(doc('featuremap v1', '', '"x" --> B'));
		expectFailedAt(result, 3);
	});
});
