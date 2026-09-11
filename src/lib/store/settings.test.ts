// F-26 · Schätzmodus — Unit-Tests für settings.ts.
// Quellen: features/F-26-schaetzmodus.md (Abschnitte „Umfang", „Automatischer Wechsel beim
// Import", „Fachregeln", „Tests"), PRD.md (FR-08, FR-09, FR-76, AK-19, INT-07),
// features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators", Eintrag „PRD 1.1 — drei
// Erweiterungen aus Nutzergespräch (11.09.)": „ein Wertebereich gilt gemeinsam für Nutzen und
// Aufwand, Standard 0–100"; „ein Wert außerhalb des eingestellten freien Bereichs wird wie ein
// Fibonacci-fremder Wert behandelt (erhalten, gekennzeichnet), statt den Bereich automatisch zu
// erweitern".

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { addFeature, emptyMap } from '../model/validation';
import type { Feature, FeatureMap } from '../model/types';
import {
	DEFAULT_ESTIMATION_MODE,
	DEFAULT_ESTIMATION_RANGE,
	SETTINGS_STORAGE_KEY,
	applyEstimationModeAfterImport,
	estimationMode,
	estimationRange,
	initSettings,
	setEstimationRange
} from './settings';

function feature(overrides: Partial<Feature> = {}): Feature {
	return { id: 'f', impact: 0, effort: 0, ...overrides };
}

function mapWith(...features: Feature[]): FeatureMap {
	let map = emptyMap();
	for (const f of features) {
		const result = addFeature(map, f);
		if (!result.ok) throw new Error('Testaufbau: ungültiges Feature');
		map = result.value;
	}
	return map;
}

function resetSettings(): void {
	window.localStorage.clear();
	estimationMode.set(DEFAULT_ESTIMATION_MODE);
	estimationRange.set(DEFAULT_ESTIMATION_RANGE);
}

describe('settings store (F-26 · Schätzmodus)', () => {
	beforeEach(() => {
		resetSettings();
	});

	// F-26, Abschnitt „Umfang": „export const estimationMode: Writable<EstimationMode>; //
	// Default 'fibonacci', persistiert" / „export const estimationRange: Writable<EstimationRange>;
	// // Default { min: 0, max: 100 }, persistiert". FR-08, FR-09.
	describe('Default-Werte', () => {
		it('estimationMode ist standardmäßig fibonacci', () => {
			expect(get(estimationMode)).toBe('fibonacci');
		});

		it('estimationRange ist standardmäßig { min: 0, max: 100 }', () => {
			expect(get(estimationRange)).toEqual({ min: 0, max: 100 });
		});
	});

	// F-26, Abschnitt „Tests": „Persistenz". FR-76: „Schätzmodus und der Wertebereich … werden
	// als App-Einstellung im LocalStorage persistiert, getrennt vom Kartenbestand." Eigener
	// Schlüssel, getrennt von „featuremap.map" (F-04) — analog zu „featuremap.theme" (F-01).
	describe('Persistenz (FR-76)', () => {
		it('merkt einen geänderten Schätzmodus unter dem eigenen Schlüssel im LocalStorage', () => {
			estimationMode.set('free');
			// setEstimationRange() bzw. der Moduswechsel selbst ist Aufgabe des Feature-Agenten;
			// initSettings() muss den zuletzt gemerkten Zustand danach wieder auffinden können.
			// Da estimationMode.set() (Svelte-Store) selbst keinen Seiteneffekt auf LocalStorage
			// hat, ist es die Aufgabe der Umsetzung, jede Änderung an estimationMode/
			// estimationRange unter SETTINGS_STORAGE_KEY zu schreiben (wie theme.ts es für
			// „featuremap.theme" tut) — dieser Test prüft direkt den Persistenzpfad über
			// initSettings(), nicht die Schreib-Seite isoliert, weil FR-76 nur das
			// Gesamtverhalten „übersteht ein Neuladen" fordert.
			window.localStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ mode: 'free', range: { min: 0, max: 100 } })
			);

			estimationMode.set(DEFAULT_ESTIMATION_MODE);
			initSettings();

			expect(get(estimationMode)).toBe('free');
		});

		it('liest beim Start einen zuvor gespeicherten Modus und Wertebereich und wendet sie an', () => {
			window.localStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ mode: 'free', range: { min: 0, max: 50 } })
			);

			initSettings();

			expect(get(estimationMode)).toBe('free');
			expect(get(estimationRange)).toEqual({ min: 0, max: 50 });
		});

		it('fällt bei fehlendem gespeichertem Wert auf die Standardwerte zurück', () => {
			window.localStorage.removeItem(SETTINGS_STORAGE_KEY);

			initSettings();

			expect(get(estimationMode)).toBe('fibonacci');
			expect(get(estimationRange)).toEqual({ min: 0, max: 100 });
		});

		it('fällt bei einem beschädigten (nicht parsebaren) gespeicherten Wert auf die Standardwerte zurück, ohne zu werfen', () => {
			window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{nicht json');

			expect(() => initSettings()).not.toThrow();
			expect(get(estimationMode)).toBe('fibonacci');
			expect(get(estimationRange)).toEqual({ min: 0, max: 100 });
		});

		// NFR-32 (unverändert für jede App-Einstellung im LocalStorage, wie in F-01 für die Tafel).
		it('fällt bei nicht verfügbarem LocalStorage auf die Standardwerte zurück, ohne zu werfen', () => {
			const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('LocalStorage nicht verfügbar');
			});

			try {
				expect(() => initSettings()).not.toThrow();
				expect(get(estimationMode)).toBe('fibonacci');
				expect(get(estimationRange)).toEqual({ min: 0, max: 100 });
			} finally {
				getItemSpy.mockRestore();
			}
		});

		it('übernimmt einen über setEstimationRange() gesetzten Bereich in einen nachfolgenden initSettings()-Aufruf (Neuladen, FR-76)', () => {
			const result = setEstimationRange({ min: 0, max: 50 });
			expect(result.ok).toBe(true);

			// Ausgangszustand wie nach einem Neuladen der Seite: Store auf Default, LocalStorage
			// bleibt jedoch unangetastet (window.localStorage überlebt in jsdom den Testfall).
			estimationRange.set(DEFAULT_ESTIMATION_RANGE);
			initSettings();

			expect(get(estimationRange)).toEqual({ min: 0, max: 50 });
		});
	});

	// F-26, Abschnitt „Tests": „Bereichsvalidierung (Min < Max, nicht-negativ)". PRD FR-09.
	describe('setEstimationRange() — Bereichsvalidierung (FR-09)', () => {
		it('übernimmt einen gültigen Bereich (min < max, beide nicht-negativ)', () => {
			const result = setEstimationRange({ min: 0, max: 50 });

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.value).toEqual({ min: 0, max: 50 });
			expect(get(estimationRange)).toEqual({ min: 0, max: 50 });
		});

		it('lehnt einen Bereich ab, bei dem min nicht kleiner als max ist (min === max)', () => {
			const before = get(estimationRange);
			const result = setEstimationRange({ min: 10, max: 10 });

			expect(result.ok).toBe(false);
			expect(get(estimationRange)).toEqual(before);
		});

		it('lehnt einen Bereich ab, bei dem min größer als max ist', () => {
			const before = get(estimationRange);
			const result = setEstimationRange({ min: 50, max: 10 });

			expect(result.ok).toBe(false);
			expect(get(estimationRange)).toEqual(before);
		});

		it('lehnt einen Bereich mit negativem min ab', () => {
			const before = get(estimationRange);
			const result = setEstimationRange({ min: -5, max: 10 });

			expect(result.ok).toBe(false);
			expect(get(estimationRange)).toEqual(before);
		});

		it('lehnt einen Bereich mit negativem max ab', () => {
			const before = get(estimationRange);
			const result = setEstimationRange({ min: -20, max: -5 });

			expect(result.ok).toBe(false);
			expect(get(estimationRange)).toEqual(before);
		});

		it('lehnt einen nicht-ganzzahligen Grenzwert ab', () => {
			const before = get(estimationRange);
			const result = setEstimationRange({ min: 0, max: 12.5 });

			expect(result.ok).toBe(false);
			expect(get(estimationRange)).toEqual(before);
		});

		it('akzeptiert 0 als min (nicht-negativ schließt 0 ein)', () => {
			const result = setEstimationRange({ min: 0, max: 1 });

			expect(result.ok).toBe(true);
		});

		it('meldet bei ungültigem Bereich mindestens eine Fehlermeldung', () => {
			const result = setEstimationRange({ min: 10, max: 10 });

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toBeTruthy();
		});
	});

	// F-26, Abschnitt „Automatischer Wechsel beim Import"; PRD FR-08, AK-19: „Import eines
	// Dokuments mit impact=45 bei aktivem Fibonacci-Modus schaltet die Anwendung automatisch auf
	// den freien Schätzmodus um."
	describe('applyEstimationModeAfterImport() — automatischer Moduswechsel (FR-08, AK-19)', () => {
		it('schaltet von fibonacci auf free um, wenn die importierte Karte einen Fibonacci-fremden impact-Wert enthält', () => {
			estimationMode.set('fibonacci');
			const map = mapWith(feature({ id: 'a', impact: 45, effort: 5 }));

			applyEstimationModeAfterImport(map);

			expect(get(estimationMode)).toBe('free');
		});

		it('schaltet von fibonacci auf free um, wenn die importierte Karte einen Fibonacci-fremden effort-Wert enthält', () => {
			estimationMode.set('fibonacci');
			const map = mapWith(feature({ id: 'a', impact: 5, effort: 7 }));

			applyEstimationModeAfterImport(map);

			expect(get(estimationMode)).toBe('free');
		});

		it('bleibt bei fibonacci, wenn alle Werte der importierten Karte in der Fibonacci-Reihe liegen', () => {
			estimationMode.set('fibonacci');
			const map = mapWith(
				feature({ id: 'a', impact: 1, effort: 21 }),
				feature({ id: 'b', impact: 13, effort: 8 })
			);

			applyEstimationModeAfterImport(map);

			expect(get(estimationMode)).toBe('fibonacci');
		});

		it('bleibt bei fibonacci für eine leere importierte Karte', () => {
			estimationMode.set('fibonacci');

			applyEstimationModeAfterImport(emptyMap());

			expect(get(estimationMode)).toBe('fibonacci');
		});

		it('ändert estimationRange beim automatischen Wechsel nicht (F-26: „estimationRange bleibt dabei beim zuletzt eingestellten Wert")', () => {
			estimationMode.set('fibonacci');
			estimationRange.set({ min: 0, max: 50 });
			const map = mapWith(feature({ id: 'a', impact: 45, effort: 5 }));

			applyEstimationModeAfterImport(map);

			expect(get(estimationRange)).toEqual({ min: 0, max: 50 });
		});

		it('bleibt bei free, wenn der Modus bereits free ist (kein Zurückschalten, kein Fehler)', () => {
			estimationMode.set('free');
			const map = mapWith(feature({ id: 'a', impact: 1, effort: 21 }));

			expect(() => applyEstimationModeAfterImport(map)).not.toThrow();
			expect(get(estimationMode)).toBe('free');
		});
	});
});
