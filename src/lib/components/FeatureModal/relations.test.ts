// F-13 · Feature-Formular — Unit-Tests für relationsFromRows (features/F-13-feature-formular.md,
// Abschnitt "Tests": "Übernahme der Formularzeilen in Kommandos"; PRD FR-06).

import { describe, expect, it } from 'vitest';
import { relationsFromRows, type RelationRowInput } from './relations';

describe('relationsFromRows', () => {
	it('liefert eine leere Liste ohne Zeilen', () => {
		expect(relationsFromRows('a', [])).toEqual([]);
	});

	it('baut aus einer Zeile eine Relation mit der Quelle als "from"', () => {
		const rows: RelationRowInput[] = [{ targetId: 'b', type: 'requires', label: '' }];
		expect(relationsFromRows('a', rows)).toEqual([{ from: 'a', to: 'b', type: 'requires' }]);
	});

	it('übernimmt eine gesetzte Beschriftung', () => {
		const rows: RelationRowInput[] = [
			{ targetId: 'b', type: 'relates', label: 'nutzt Identität' }
		];
		expect(relationsFromRows('a', rows)).toEqual([
			{ from: 'a', to: 'b', type: 'relates', label: 'nutzt Identität' }
		]);
	});

	// Leere Beschriftung heißt "kein Label", nicht ein leerer Text (Feature.label ist optional,
	// PRD 3.1).
	it('übernimmt eine leere Beschriftung als "kein Label"', () => {
		const rows: RelationRowInput[] = [{ targetId: 'b', type: 'excludes', label: '' }];
		const [relation] = relationsFromRows('a', rows);
		expect(relation.label).toBeUndefined();
	});

	it('erhält die Reihenfolge der Zeilen', () => {
		const rows: RelationRowInput[] = [
			{ targetId: 'b', type: 'requires', label: '' },
			{ targetId: 'c', type: 'relates', label: '' }
		];
		expect(relationsFromRows('a', rows).map((r) => r.to)).toEqual(['b', 'c']);
	});
});
