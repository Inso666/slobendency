// FeatureModal · Zusatzoption bei abweichendem Wert (F-13 · features/F-13-feature-formular.md,
// Abschnitt "Werte außerhalb der Schätzreihe"; PRD FR-03).
//
// Reine Funktion für ScoreSelect.svelte: baut die Liste der Werte, die die Schätzreihen-Auswahl
// anbietet. Trägt `value` einen Wert außerhalb von FIBONACCI, wird er als zusätzliche Option an
// seiner zahlenmäßig richtigen Stelle eingefügt und als abweichend gekennzeichnet — der Wert
// wird nie stillschweigend gerundet (FR-03). Liegt `value` in FIBONACCI, ist die Liste
// unverändert die Schätzreihe.
//
// Signatur ist vom Test-Agenten vorgegeben. Rumpf ist Aufgabe des Feature-Agenten.

import { FIBONACCI } from '../../model/types';

/** Eine Option der Schätzreihen-Auswahl. `deviating` markiert die abweichende Zusatzoption. */
export interface ScoreOption {
	value: number;
	deviating: boolean;
}

/**
 * Liefert die Werteliste für ScoreSelect zu einem aktuellen Wert (F-13, Abschnitt "Werte
 * außerhalb der Schätzreihe"; Unit-Test "Zusatzoption bei abweichendem Wert").
 */
export function scoreOptions(value: number): ScoreOption[] {
	throw new Error('not implemented');
}

// re-exportiert, damit ScoreSelect.svelte und Tests dieselbe Schätzreihe verwenden wie das
// Domänenmodell, ohne model/types.ts zweimal zu importieren.
export { FIBONACCI };
