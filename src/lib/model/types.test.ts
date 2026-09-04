// F-02 · Domänenmodell und Invarianten — Unit-Tests für die Konstanten des Datenmodells.
// Quelle: features/F-02-domaenenmodell.md, Abschnitt „Umfang"; PRD 3.1, PRD FR-02, NFR-42.

import { describe, expect, it } from 'vitest';
import { FIBONACCI, SCHEMA_VERSION } from './types';

describe('SCHEMA_VERSION', () => {
	// PRD 3.1: „schemaVersion | integer | Aktuell 1"; NFR-42 versioniert das Datenmodell.
	it('ist 1', () => {
		expect(SCHEMA_VERSION).toBe(1);
	});
});

describe('FIBONACCI', () => {
	// PRD FR-02: „Impact und Effort werden im Formular ausschließlich als Fibonacci-Werte
	// angeboten: 1, 2, 3, 5, 8, 13, 21".
	it('enthält genau die im Formular angebotene Schätzreihe in aufsteigender Reihenfolge', () => {
		expect(FIBONACCI).toEqual([1, 2, 3, 5, 8, 13, 21]);
	});
});
