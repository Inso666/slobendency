// F-13 · Feature-Formular — Unit-Tests für scoreOptions (features/F-13-feature-formular.md,
// Abschnitt "Werte außerhalb der Schätzreihe"; PRD FR-02, FR-03, AK-15).

import { describe, expect, it } from 'vitest';
import { scoreOptions } from './scoreOptions';

describe('scoreOptions', () => {
	// PRD FR-02: "Impact und Effort werden im Formular ausschließlich als Fibonacci-Werte
	// angeboten." Ohne Abweichung erscheint nur die Schätzreihe, nichts zusätzlich.
	it('liefert bei einem Wert aus der Schätzreihe nur die sieben Fibonacci-Werte', () => {
		expect(scoreOptions(5)).toEqual([
			{ value: 1, deviating: false },
			{ value: 2, deviating: false },
			{ value: 3, deviating: false },
			{ value: 5, deviating: false },
			{ value: 8, deviating: false },
			{ value: 13, deviating: false },
			{ value: 21, deviating: false }
		]);
	});

	// F-13-AK / PRD AK-15: "Import eines Features mit impact=7 zeigt im Formular 7 als
	// vorselektierte, markierte Zusatzoption." Einfügestelle ist zahlenmäßig richtig (zwischen
	// 5 und 8), der Wert wird nicht gerundet (FR-03).
	it('fügt bei einem Wert von 7 eine gekennzeichnete Zusatzoption zwischen 5 und 8 ein', () => {
		expect(scoreOptions(7)).toEqual([
			{ value: 1, deviating: false },
			{ value: 2, deviating: false },
			{ value: 3, deviating: false },
			{ value: 5, deviating: false },
			{ value: 7, deviating: true },
			{ value: 8, deviating: false },
			{ value: 13, deviating: false },
			{ value: 21, deviating: false }
		]);
	});

	it('hängt eine Zusatzoption oberhalb von 21 ans Ende', () => {
		const options = scoreOptions(34);
		expect(options).toHaveLength(8);
		expect(options[options.length - 1]).toEqual({ value: 34, deviating: true });
	});

	it('stellt eine Zusatzoption unterhalb von 1 an den Anfang', () => {
		const options = scoreOptions(0);
		expect(options).toHaveLength(8);
		expect(options[0]).toEqual({ value: 0, deviating: true });
	});
});
