// F-05 · DSL-Parser — Unit-Tests für parse().
// Quellen: features/F-05-dsl-parser.md (Abschnitte „Grammatik", „Fachregeln",
// „Akzeptanzkriterien"), PRD.md Abschnitt 4 (DSL, insbesondere 4.2 Grammatik, 4.4
// Beispieldokument, 4.5 Parser-Anforderungen DSL-01..DSL-08), PRD 3.3 (INT-01..INT-07),
// PRD 8.1 (NFR-04), PRD 8.3 (NFR-21, NFR-23), PRD 9 (AK-13, AK-14).
//
// Tests prüfen ausschließlich das beobachtbare Verhalten von parse() (Eingabetext → Ergebnis),
// nie eine innere Zerlegung wie den Tokenizer (features/README.md, Regeln für den
// Test-Agenten: „Tests prüfen beobachtbares Verhalten, nicht die innere Umsetzung").

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types';
import type { Feature, FeatureMap, Relation } from '../model/types';
import { parse } from './parser';
import type { ParseResult } from './parser';
import type { ParseError, ParseErrorCode } from './errors';

function doc(...lines: string[]): string {
	return lines.join('\n');
}

function expectOk(result: ParseResult): asserts result is { ok: true; map: FeatureMap } {
	expect(result.ok, result.ok ? '' : `unerwartete Fehler: ${JSON.stringify((result as { ok: false; errors: ParseError[] }).errors)}`).toBe(true);
}

function expectFailed(result: ParseResult): asserts result is { ok: false; errors: ParseError[] } {
	expect(result.ok).toBe(false);
}

function findFeature(map: FeatureMap, id: string): Feature | undefined {
	return map.features.find((f) => f.id === id);
}

function findRelation(map: FeatureMap, from: string, to: string, type: Relation['type']): Relation | undefined {
	return map.relations.find((r) => r.from === from && r.to === to && r.type === type);
}

/** Erwartet genau einen Fehler mit gegebenem Code und Zeilennummer (DSL-01). */
function expectOneError(result: ParseResult, code: ParseErrorCode, line: number): ParseError {
	expectFailed(result);
	expect(result.errors, JSON.stringify(result.errors)).toHaveLength(1);
	const [error] = result.errors;
	expect(error.code).toBe(code);
	expect(error.line).toBe(line);
	return error;
}

describe('parse — Beispieldokument PRD 4.4', () => {
	// AK: „Das Beispieldokument aus PRD 4.4 ergibt vier Features und drei Beziehungen mit den
	// erwarteten Werten."
	it('liefert vier Features und drei Beziehungen mit den erwarteten Werten', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'%% Authentifizierung',
				'Login["Benutzer-Login"]      :: impact=8, effort=3',
				'SSO["Single Sign-On"]        :: impact=5, effort=13',
				'LegacyAuth["Basic Auth"]     :: impact=2, effort=1',
				'Export                       :: impact=3, effort=2',
				'',
				'SSO -->|"nutzt Session"| Login',
				'Export -.->|"teilt Formatierung"| Login',
				'SSO --x|"inkompatibel"| LegacyAuth'
			)
		);

		expectOk(result);
		expect(result.map.schemaVersion).toBe(SCHEMA_VERSION);
		expect(result.map.features).toHaveLength(4);
		expect(result.map.relations).toHaveLength(3);

		expect(findFeature(result.map, 'Login')).toEqual({ id: 'Login', label: 'Benutzer-Login', impact: 8, effort: 3 });
		expect(findFeature(result.map, 'SSO')).toEqual({ id: 'SSO', label: 'Single Sign-On', impact: 5, effort: 13 });
		expect(findFeature(result.map, 'LegacyAuth')).toEqual({ id: 'LegacyAuth', label: 'Basic Auth', impact: 2, effort: 1 });
		// Export hat kein Label — PRD 3.1: „Fehlt er, wird id angezeigt."
		expect(findFeature(result.map, 'Export')).toEqual({ id: 'Export', impact: 3, effort: 2 });

		expect(findRelation(result.map, 'SSO', 'Login', 'requires')).toEqual({
			from: 'SSO',
			to: 'Login',
			type: 'requires',
			label: 'nutzt Session'
		});
		expect(findRelation(result.map, 'Export', 'Login', 'relates')).toEqual({
			from: 'Export',
			to: 'Login',
			type: 'relates',
			label: 'teilt Formatierung'
		});
		expect(findRelation(result.map, 'SSO', 'LegacyAuth', 'excludes')).toEqual({
			from: 'SSO',
			to: 'LegacyAuth',
			type: 'excludes',
			label: 'inkompatibel'
		});
	});
});

describe('parse — Pfeil-Mapping (PRD 4.3)', () => {
	function twoFeatures(relationLine: string): string {
		return doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', relationLine);
	}

	it('bildet "-->" auf requires ab', () => {
		const result = parse(twoFeatures('A --> B'));
		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'requires')).toBeDefined();
	});

	it('bildet "-.->" auf relates ab', () => {
		const result = parse(twoFeatures('A -.-> B'));
		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'relates')).toBeDefined();
	});

	it('bildet "--x" auf excludes ab', () => {
		const result = parse(twoFeatures('A --x B'));
		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'excludes')).toBeDefined();
	});

	it('lässt die Kantenbeschriftung weg, wenn keine angegeben ist', () => {
		const result = parse(twoFeatures('A --> B'));
		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'requires')?.label).toBeUndefined();
	});
});

describe('parse — DSL-05: Zwei-Pass, Beziehung vor Definition', () => {
	// AK: „Beziehungen dürfen vor den Feature-Definitionen stehen und werden korrekt
	// aufgelöst."
	it('löst eine Beziehung auf, die vor beiden Feature-Definitionen steht', () => {
		const result = parse(
			doc('featuremap v1', '', 'A --> B', '', 'A :: impact=1, effort=1', 'B :: impact=2, effort=2')
		);

		expectOk(result);
		expect(findFeature(result.map, 'A')).toBeDefined();
		expect(findFeature(result.map, 'B')).toBeDefined();
		expect(findRelation(result.map, 'A', 'B', 'requires')).toBeDefined();
	});
});

describe('parse — DSL-06: Attributreihenfolge frei', () => {
	it('akzeptiert effort vor impact', () => {
		const result = parse(doc('featuremap v1', '', 'A :: effort=3, impact=8'));

		expectOk(result);
		expect(findFeature(result.map, 'A')).toEqual({ id: 'A', impact: 8, effort: 3 });
	});
});

describe('parse — DSL-08: beliebiger Whitespace, bedeutungslose Einrückung', () => {
	it('akzeptiert zusätzliche Leerzeichen und Tabs zwischen den Marken', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'  A["Name"]     ::   impact=1,    effort=2',
				'B::effort=3,impact=4',
				'\tA   -->  |"lbl"|   B'
			)
		);

		expectOk(result);
		expect(findFeature(result.map, 'A')).toEqual({ id: 'A', label: 'Name', impact: 1, effort: 2 });
		expect(findFeature(result.map, 'B')).toEqual({ id: 'B', impact: 4, effort: 3 });
		expect(findRelation(result.map, 'A', 'B', 'requires')?.label).toBe('lbl');
	});
});

describe('parse — DSL-04: impact/effort akzeptieren jeden nicht-negativen Integer', () => {
	// AK: „Ein Feature mit impact=7 wird mit dem Wert 7 übernommen."
	it('übernimmt impact=7 unverändert, obwohl er nicht in der Fibonacci-Reihe liegt', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=7, effort=1'));

		expectOk(result);
		expect(findFeature(result.map, 'A')?.impact).toBe(7);
	});

	it('akzeptiert impact=0 und effort=0', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=0, effort=0'));

		expectOk(result);
		expect(findFeature(result.map, 'A')).toEqual({ id: 'A', impact: 0, effort: 0 });
	});

	it('akzeptiert einen großen, nicht-fibonacci Integer', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=999, effort=42'));

		expectOk(result);
		expect(findFeature(result.map, 'A')).toEqual({ id: 'A', impact: 999, effort: 42 });
	});
});

describe('parse — NFR-21: importierter Text ist reiner Text', () => {
	// AK: „Ein Anzeigename <script>alert(1)</script> wird als gewöhnlicher Text übernommen;
	// der Parser entfernt oder verändert nichts daran." — Anzeigenamen dürfen laut F-02 selbst
	// kein Anführungszeichen enthalten; das Beispiel verwendet deshalb einfache Anführungszeichen
	// im Skript-Text, um die Regel nicht zu verletzen und dennoch Markup zu simulieren.
	it('übernimmt ein Label mit spitzen Klammern unverändert als Text', () => {
		const result = parse(doc('featuremap v1', '', "X[\"<script>alert('x')</script>\"] :: impact=1, effort=1"));

		expectOk(result);
		expect(findFeature(result.map, 'X')?.label).toBe("<script>alert('x')</script>");
	});

	it('übernimmt eine Kantenbeschriftung mit spitzen Klammern unverändert als Text', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'A :: impact=1, effort=1',
				'B :: impact=1, effort=1',
				"A -->|\"<b>fett</b>\"| B"
			)
		);

		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'requires')?.label).toBe('<b>fett</b>');
	});
});

describe('parse — headerMissing', () => {
	// AK: „Eine fehlende Kopfzeile bricht mit headerMissing ab."
	it('bricht ab, wenn die erste Zeile kein Kopf ist', () => {
		const result = parse(doc('A :: impact=1, effort=1'));

		const error = expectOneError(result, 'headerMissing', 1);
		expect(error.source).toBe('A :: impact=1, effort=1');
		expect(typeof error.message).toBe('string');
		expect(error.message.length).toBeGreaterThan(0);
	});

	it('bricht ab, wenn das Dokument leer ist', () => {
		const result = parse('');

		expectFailed(result);
		expect(result.errors.some((e) => e.code === 'headerMissing')).toBe(true);
	});
});

describe('parse — unsupportedVersion (DSL-07)', () => {
	// AK: „featuremap v2 bricht mit unsupportedVersion ab."
	it('bricht bei einer Version größer als 1 ab', () => {
		const result = parse(doc('featuremap v2', '', 'A :: impact=1, effort=1'));

		const error = expectOneError(result, 'unsupportedVersion', 1);
		expect(error.source).toBe('featuremap v2');
	});
});

describe('parse — AK-14: unbekannte Referenz', () => {
	// AK-14 / F-05: „Eine Beziehung auf ein unbekanntes Feature liefert genau eine
	// Fehlermeldung mit der richtigen Zeilennummer, und der Aufrufer erhält keine Karte."
	it('liefert genau eine Fehlermeldung mit korrekter Zeile und keine Karte', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1, effort=1', '', 'A --> B'));

		const error = expectOneError(result, 'unknownReference', 5);
		expect(error.source).toBe('A --> B');
		expect('map' in result).toBe(false);
	});

	it('meldet eine unbekannte Quelle ebenso als unknownReference', () => {
		const result = parse(doc('featuremap v1', '', 'B :: impact=1, effort=1', 'A --> B'));

		expectOneError(result, 'unknownReference', 4);
	});
});

describe('parse — selfReference (INT-03)', () => {
	it('lehnt eine Beziehung eines Features auf sich selbst ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1, effort=1', 'A --> A'));

		expectOneError(result, 'selfReference', 4);
	});
});

describe('parse — duplicateId (INT-01)', () => {
	it('lehnt eine zweite Definition derselben Kennung ab', () => {
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'A :: impact=2, effort=2')
		);

		const error = expectOneError(result, 'duplicateId', 4);
		expect(error.source).toBe('A :: impact=2, effort=2');
	});

	it('behandelt Kennungen groß-/kleinschreibungssensitiv — "A" und "a" sind verschieden', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1, effort=1', 'a :: impact=2, effort=2'));

		expectOk(result);
		expect(result.map.features).toHaveLength(2);
	});
});

describe('parse — duplicateRelation (INT-04)', () => {
	it('lehnt ein zweites identisches Tripel aus Quelle, Ziel und Art ab', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'A :: impact=1, effort=1',
				'B :: impact=1, effort=1',
				'A --> B',
				'A --> B'
			)
		);

		expectOneError(result, 'duplicateRelation', 6);
	});

	it('erlaubt dieselbe Quelle/dasselbe Ziel mit unterschiedlicher Art (kein Tripel-Duplikat)', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'A :: impact=1, effort=1',
				'B :: impact=1, effort=1',
				'A --> B',
				'A -.-> B'
			)
		);

		expectOk(result);
		expect(result.map.relations).toHaveLength(2);
	});

	// INT-05: Ein requires-Zyklus wird angelegt, nicht abgelehnt — die Zyklenprüfung/-markierung
	// selbst liefert F-07; der Parser darf hier keinen Fehler melden.
	it('lehnt eine requires-Beziehung, die einen Zyklus schließt, nicht ab (INT-05)', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'A :: impact=1, effort=1',
				'B :: impact=1, effort=1',
				'A --> B',
				'B --> A'
			)
		);

		expectOk(result);
		expect(result.map.relations).toHaveLength(2);
	});
});

describe('parse — negativeValue (INT-07 / DSL-04)', () => {
	it('lehnt einen negativen impact ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=-1, effort=1'));

		expectOneError(result, 'negativeValue', 3);
	});

	it('lehnt einen negativen effort ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1, effort=-2'));

		expectOneError(result, 'negativeValue', 3);
	});
});

describe('parse — missingAttribute (DSL-06: beide Attribute Pflicht)', () => {
	it('lehnt eine Feature-Definition ohne effort ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: impact=1'));

		expectOneError(result, 'missingAttribute', 3);
	});

	it('lehnt eine Feature-Definition ohne impact ab', () => {
		const result = parse(doc('featuremap v1', '', 'A :: effort=1'));

		expectOneError(result, 'missingAttribute', 3);
	});
});

describe('parse — valueTooLong (NFR-23)', () => {
	it('akzeptiert eine Kennung mit genau 64 Zeichen', () => {
		const id = 'a'.repeat(64);
		const result = parse(doc('featuremap v1', '', `${id} :: impact=1, effort=1`));

		expectOk(result);
		expect(findFeature(result.map, id)).toBeDefined();
	});

	it('lehnt eine Kennung mit 65 Zeichen ab', () => {
		const id = 'a'.repeat(65);
		const result = parse(doc('featuremap v1', '', `${id} :: impact=1, effort=1`));

		expectOneError(result, 'valueTooLong', 3);
	});

	it('akzeptiert ein Label mit genau 200 Zeichen', () => {
		const label = 'a'.repeat(200);
		const result = parse(doc('featuremap v1', '', `A["${label}"] :: impact=1, effort=1`));

		expectOk(result);
		expect(findFeature(result.map, 'A')?.label).toBe(label);
	});

	it('lehnt ein Label mit 201 Zeichen ab', () => {
		const label = 'a'.repeat(201);
		const result = parse(doc('featuremap v1', '', `A["${label}"] :: impact=1, effort=1`));

		expectOneError(result, 'valueTooLong', 3);
	});

	it('akzeptiert eine Kantenbeschriftung mit genau 120 Zeichen', () => {
		const label = 'a'.repeat(120);
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', `A -->|"${label}"| B`)
		);

		expectOk(result);
		expect(findRelation(result.map, 'A', 'B', 'requires')?.label).toBe(label);
	});

	it('lehnt eine Kantenbeschriftung mit 121 Zeichen ab', () => {
		const label = 'a'.repeat(121);
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', `A -->|"${label}"| B`)
		);

		expectOneError(result, 'valueTooLong', 5);
	});
});

describe('parse — syntax', () => {
	it('lehnt einen unbekannten Pfeil ab', () => {
		const result = parse(
			doc('featuremap v1', '', 'A :: impact=1, effort=1', 'B :: impact=1, effort=1', 'A -> B')
		);

		expectOneError(result, 'syntax', 5);
	});

	it('lehnt eine Zeile mit unbekanntem Trenner statt "::" ab', () => {
		const result = parse(doc('featuremap v1', '', 'A ::: impact=1, effort=1'));

		expectFailed(result);
		expect(result.errors.some((e) => e.line === 3)).toBe(true);
	});
});

describe('parse — Kennung folgt PRD 4.2 (Beginn mit Buchstabe oder Unterstrich)', () => {
	// features/STATUS.md, Entscheidungen des Orchestrators (05.09.): maßgeblich ist die
	// Grammatik aus PRD 4.2, nicht der Zeichensatz aus PRD 3.1. Eine Kennung, die mit Ziffer
	// oder Bindestrich beginnt, ist syntaktisch keine gültige Kennung.
	it('lehnt eine Kennung ab, die mit einer Ziffer beginnt', () => {
		const result = parse(doc('featuremap v1', '', '1abc :: impact=1, effort=1'));

		expectFailed(result);
		expect(result.errors.some((e) => e.line === 3)).toBe(true);
	});

	it('lehnt eine Kennung ab, die mit einem Bindestrich beginnt', () => {
		const result = parse(doc('featuremap v1', '', '-abc :: impact=1, effort=1'));

		expectFailed(result);
		expect(result.errors.some((e) => e.line === 3)).toBe(true);
	});

	it('akzeptiert eine Kennung, die mit einem Unterstrich beginnt', () => {
		const result = parse(doc('featuremap v1', '', '_abc :: impact=1, effort=1'));

		expectOk(result);
		expect(findFeature(result.map, '_abc')).toBeDefined();
	});
});

describe('parse — DSL-02/DSL-03: vollständiger Abbruch, alle Fehler gesammelt', () => {
	// AK: „Ein Dokument mit drei Fehlern in drei Zeilen liefert drei Fehler in einem
	// Durchlauf."
	it('sammelt drei Fehler aus drei verschiedenen Zeilen in einem Durchlauf', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'A :: impact=1, effort=1',
				'A :: impact=2, effort=2',
				'A --> unbekannt',
				'E :: impact=-1, effort=1'
			)
		);

		expectFailed(result);
		expect(result.errors).toHaveLength(3);
		expect(result.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'duplicateId', line: 4 }),
				expect.objectContaining({ code: 'unknownReference', line: 5 }),
				expect.objectContaining({ code: 'negativeValue', line: 6 })
			])
		);
	});

	// DSL-02: „Bei mindestens einem Fehler wird der Import vollständig abgebrochen; der
	// Aufrufer erhält keine Teilkarte."
	it('gibt bei einem Fehler keine Teilkarte zurück, auch wenn andere Zeilen gültig sind', () => {
		const result = parse(
			doc('featuremap v1', '', 'Gueltig :: impact=1, effort=1', 'Gueltig --> unbekannt')
		);

		expectFailed(result);
		expect('map' in result).toBe(false);
	});
});

describe('parse — Kommentare und Leerzeilen', () => {
	it('ignoriert Kommentarzeilen und Leerzeilen zwischen Definitionen', () => {
		const result = parse(
			doc(
				'featuremap v1',
				'',
				'%% erster Kommentar',
				'A :: impact=1, effort=1',
				'',
				'   ',
				'%% zweiter Kommentar',
				'B :: impact=1, effort=1',
				'',
				'A --> B'
			)
		);

		expectOk(result);
		expect(result.map.features).toHaveLength(2);
		expect(result.map.relations).toHaveLength(1);
	});
});

describe('parse — NFR-04: Leistungsziel bei 100 Features', () => {
	// AK: „Ein Dokument mit 100 Features wird in unter 200 ms geparst."
	it('parst ein Dokument mit 100 Features und Beziehungen in unter 200 ms', () => {
		const featureLines = Array.from({ length: 100 }, (_, i) => `F${i} :: impact=${i % 21}, effort=${(i * 3) % 21}`);
		const relationLines = Array.from({ length: 99 }, (_, i) => `F${i} --> F${i + 1}`);
		const text = doc('featuremap v1', '', ...featureLines, '', ...relationLines);

		const start = performance.now();
		const result = parse(text);
		const elapsed = performance.now() - start;

		expectOk(result);
		expect(result.map.features).toHaveLength(100);
		expect(elapsed).toBeLessThan(200);
	});
});
