// F-19 · Export-Dialog — Unit-Tests für exportFile.ts (Dateiname, Blob-Inhalt).
// Quellen: features/F-19-export-dsl.md (Abschnitte „Umfang", „Fachregeln", „Akzeptanzkriterien",
// „Tests": „Unit: Dateiname aus einem festen Datum, Aufbau des Blob-Inhalts"), PRD.md (FR-60,
// DSL-14, PRD 5.9 „Akzeptiertes Risiko").
//
// Tests prüfen ausschließlich das beobachtbare Verhalten der beiden reinen Funktionen, nie eine
// innere Zerlegung (features/README.md, Regeln für den Test-Agenten). Für den Textinhalt wird
// der echte serialize() aus F-06 verwendet, nicht behauptet — DSL-14 verlangt Byte-Identität mit
// dem tatsächlichen Serializer, nicht mit einer Testkopie seines Verhaltens.

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../../model/types';
import type { Feature, FeatureMap } from '../../model/types';
import { serialize } from '../../dsl/serializer';
import { EXPORT_MIME_TYPE, exportFileContent, exportFilename } from './exportFile';

function feature(id: string, impact: number, effort: number, label?: string): Feature {
	return label === undefined ? { id, impact, effort } : { id, impact, effort, label };
}

function map(features: Feature[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations: [] };
}

// -------------------------------------------------------------------------------------------
// exportFilename — F-19, Abschnitt „Umfang": „Dateiname featuremap-JJJJ-MM-TT.fmap mit dem
// aktuellen Datum."
// -------------------------------------------------------------------------------------------

describe('exportFilename — Dateiname aus einem festen Datum', () => {
	// F-19: Dateiname featuremap-JJJJ-MM-TT.fmap.
	it('baut den Dateinamen aus Jahr, Monat und Tag im Format JJJJ-MM-TT', () => {
		expect(exportFilename(new Date(2026, 8, 8))).toBe('featuremap-2026-09-08.fmap');
	});

	// Zweistelliges Auffüllen von Monat und Tag, sonst wäre der Dateiname für die ersten neun
	// Tage bzw. Monate eines Jahres kürzer und nicht mehr im festen Format JJJJ-MM-TT.
	it('füllt einstelligen Monat und Tag mit einer führenden Null auf', () => {
		expect(exportFilename(new Date(2026, 0, 3))).toBe('featuremap-2026-01-03.fmap');
	});

	// Endung .fmap (F-19, Akzeptanzkriterium: „Der Download erzeugt eine Datei mit der Endung
	// .fmap").
	it('endet auf .fmap', () => {
		expect(exportFilename(new Date(2026, 11, 31))).toMatch(/\.fmap$/);
	});
});

// -------------------------------------------------------------------------------------------
// exportFileContent — AK-04 / DSL-14 (Byte-Identität mit serialize()), Inhaltstyp
// -------------------------------------------------------------------------------------------

describe('exportFileContent — Aufbau des Blob-Inhalts', () => {
	// F-19-AK: „Der angezeigte Text entspricht Zeichen für Zeichen dem Ergebnis von serialize."
	// Gilt gleichermaßen für den heruntergeladenen Inhalt (F-19: derselbe Text wird angezeigt,
	// kopiert und heruntergeladen).
	it('liefert exakt den Text von serialize() für dieselbe Karte', () => {
		const testMap = map([feature('a', 5, 3, 'A'), feature('b', 8, 13)]);
		expect(exportFileContent(testMap).content).toBe(serialize(testMap));
	});

	// F-19-AK: „Bei leerer Karte zeigt der Dialog featuremap v1 und bleibt bedienbar."
	it('liefert bei leerer Karte „featuremap v1\\n"', () => {
		expect(exportFileContent(map([])).content).toBe('featuremap v1\n');
	});

	// F-19, Abschnitt „Umfang": „Inhaltstyp text/plain;charset=utf-8".
	it('liefert den Inhaltstyp text/plain;charset=utf-8', () => {
		expect(exportFileContent(map([])).mimeType).toBe(EXPORT_MIME_TYPE);
		expect(EXPORT_MIME_TYPE).toBe('text/plain;charset=utf-8');
	});

	// AK-04 / DSL-14: Zweifacher Aufruf ohne zwischenzeitliche Änderung liefert byte-identischen
	// Text.
	it('liefert bei zweifachem Aufruf ohne Änderung denselben Inhalt', () => {
		const testMap = map([feature('x', 1, 1)]);
		expect(exportFileContent(testMap).content).toBe(exportFileContent(testMap).content);
	});
});
