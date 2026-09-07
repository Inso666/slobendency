// F-18 · Import-Dialog — Unit-Tests für importPreview.ts.
// Quellen: features/F-18-import.md (Abschnitte „Umfang", „Verhalten", „Fachregeln", „Tests":
// „Zustände des Dialogs (leer, fehlerhaft, gültig, Rückfrage offen)"), PRD.md (FR-61, FR-62,
// DSL-01, DSL-02, DSL-03).
//
// Tests prüfen ausschließlich das beobachtbare Ergebnis von evaluateImportText() und
// replaceNeedsConfirmation() (Eingabe → Ergebnis), nie eine innere Zerlegung (features/README.md,
// Regeln für den Test-Agenten).

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../../model/types';
import type { FeatureMap } from '../../model/types';
import { parse } from '../../dsl/parser';
import { evaluateImportText, PREVIEW_FEATURE_LIMIT, replaceNeedsConfirmation } from './importPreview';

function doc(...lines: string[]): string {
	return lines.join('\n');
}

function emptyMap(): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features: [], relations: [] };
}

describe('evaluateImportText — Zustand "leer"', () => {
	// F-18, Abschnitt „Tests": Zustand "leer" des Dialogs, bevor etwas eingefügt wurde.
	it('liefert "empty" für einen leeren Text', () => {
		expect(evaluateImportText('')).toEqual({ kind: 'empty' });
	});

	// Reiner Leerraum (z. B. nur Zeilenumbrüche nach dem Löschen des Platzhaltertexts) gilt
	// ebenfalls als "noch nichts eingefügt", nicht als fehlerhaftes Dokument.
	it('liefert "empty" für einen Text, der nur aus Leerraum besteht', () => {
		expect(evaluateImportText('   \n\t\n  ')).toEqual({ kind: 'empty' });
	});
});

describe('evaluateImportText — Zustand "fehlerhaft" (DSL-01, DSL-03)', () => {
	// AK-14: „Ein Dokument mit einer Beziehung auf ein unbekanntes Feature zeigt eine
	// zeilengenaue Fehlermeldung." DSL-01: Zeilennummer, Originalzeile, verständliche Ursache.
	it('liefert "invalid" mit den zeilengenauen Fehlern von parse()', () => {
		const text = doc('featuremap v1', '', 'A :: impact=1, effort=1', 'A --> Unbekannt');
		const result = evaluateImportText(text);

		expect(result.kind).toBe('invalid');
		if (result.kind !== 'invalid') throw new Error('unreachable');
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toEqual({
			line: 4,
			source: 'A --> Unbekannt',
			code: 'unknownReference',
			message: 'Ziel der Beziehung existiert nicht'
		});
	});

	// DSL-03: „Alle Fehler eines Dokuments werden gesammelt und gemeinsam ausgegeben, nicht nur
	// der erste." Ein Dokument mit drei unabhängigen Fehlern liefert alle drei auf einmal.
	it('sammelt alle Fehler eines Dokuments auf einmal (DSL-03)', () => {
		const text = doc(
			'featuremap v1',
			'A :: impact=1, effort=1',
			'B :: effort=2',
			'A --> Fremd',
			'A --> A'
		);
		const result = evaluateImportText(text);

		expect(result.kind).toBe('invalid');
		if (result.kind !== 'invalid') throw new Error('unreachable');
		expect(result.errors).toHaveLength(3);
	});

	// Ergebnis deckt sich exakt mit parse() — evaluateImportText darf die DSL-Grammatik oder
	// die Fachregeln nicht ein zweites Mal auslegen (features/README.md, Leitplanke 3).
	it('bildet dieselben Fehler wie ein direkter Aufruf von parse()', () => {
		const text = doc('featuremap v1', 'A :: impact=1');
		const direct = parse(text);
		const viaPreview = evaluateImportText(text);

		expect(direct.ok).toBe(false);
		expect(viaPreview.kind).toBe('invalid');
		if (direct.ok || viaPreview.kind !== 'invalid') throw new Error('unreachable');
		expect(viaPreview.errors).toEqual(direct.errors);
	});
});

describe('evaluateImportText — Zustand "gültig"', () => {
	// F-18, Abschnitt „Umfang": „bei fehlerfreiem Text die Zahlen n Features · m Beziehungen."
	it('liefert "valid" mit Feature- und Beziehungszahl', () => {
		const text = doc(
			'featuremap v1',
			'A :: impact=1, effort=1',
			'B :: impact=2, effort=3',
			'A --> B'
		);
		const result = evaluateImportText(text);

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') throw new Error('unreachable');
		expect(result.featureCount).toBe(2);
		expect(result.relationCount).toBe(1);
		expect(result.map.features).toHaveLength(2);
		expect(result.map.relations).toHaveLength(1);
	});

	// Ein fehlerfrei geparstes, aber inhaltlich leeres Dokument (nur Kopfzeile) ist "valid" mit
	// Zahl 0 — kein "empty": Der Text selbst ist nicht leer, nur die resultierende Karte.
	it('liefert "valid" mit Zahl 0 für ein Dokument ohne Features', () => {
		const result = evaluateImportText('featuremap v1');

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') throw new Error('unreachable');
		expect(result.featureCount).toBe(0);
		expect(result.relationCount).toBe(0);
		expect(result.preview).toEqual([]);
	});

	// F-18, Abschnitt „Umfang": „die ersten acht Features mit Lotung" — bei höchstens acht
	// Features erscheinen alle.
	it('zeigt alle Features in der Vorschau, wenn es höchstens acht sind', () => {
		const lines = ['featuremap v1'];
		for (let i = 0; i < 5; i += 1) lines.push(`F${i} :: impact=1, effort=1`);
		const result = evaluateImportText(doc(...lines));

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') throw new Error('unreachable');
		expect(result.featureCount).toBe(5);
		expect(result.preview).toHaveLength(5);
	});

	// Bei mehr als acht Features werden nur die ersten acht in Dokumentreihenfolge gezeigt —
	// die Kopfzahl "n Features" nennt trotzdem die volle Zahl.
	it('begrenzt die Vorschau auf die ersten acht Features in Dokumentreihenfolge', () => {
		const lines = ['featuremap v1'];
		const ids: string[] = [];
		for (let i = 0; i < 12; i += 1) {
			const id = `F${i}`;
			ids.push(id);
			lines.push(`${id} :: impact=1, effort=1`);
		}
		const result = evaluateImportText(doc(...lines));

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') throw new Error('unreachable');
		expect(result.featureCount).toBe(12);
		expect(result.preview).toHaveLength(PREVIEW_FEATURE_LIMIT);
		expect(result.preview.map((f) => f.id)).toEqual(ids.slice(0, PREVIEW_FEATURE_LIMIT));
	});
});

describe('replaceNeedsConfirmation — Zustand "Rückfrage offen" (FR-62)', () => {
	// F-18, Abschnitt „Verhalten": „Text fehlerfrei, Karte leer" → *Übernehmen* ersetzt direkt,
	// keine Rückfrage.
	it('verlangt keine Rückfrage, wenn die aktuelle Karte leer ist', () => {
		expect(replaceNeedsConfirmation(emptyMap())).toBe(false);
	});

	// F-18, Abschnitt „Verhalten": „Text fehlerfrei, Karte nicht leer" → Rückfrage „Bestehende
	// Karte ersetzen?" (FR-62).
	it('verlangt eine Rückfrage, wenn die aktuelle Karte Features enthält', () => {
		const current: FeatureMap = {
			schemaVersion: SCHEMA_VERSION,
			features: [{ id: 'x', impact: 1, effort: 1 }],
			relations: []
		};
		expect(replaceNeedsConfirmation(current)).toBe(true);
	});
});
