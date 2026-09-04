// F-01 · Projektgerüst und Kartentafel — Unit-Tests für die Tafelumschaltung (theme.ts).
// Quelle der Kriterien: features/F-01-projektgeruest.md, Abschnitte „Tafelumschaltung" und
// „Tests"; PRD NFR-32 (LocalStorage nicht verfügbar).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { THEME_STORAGE_KEY, initTheme, theme } from './theme';

function resetTafel(): void {
	document.documentElement.removeAttribute('data-theme');
	window.localStorage.clear();
	theme.set('light');
}

describe('theme store', () => {
	beforeEach(() => {
		resetTafel();
	});

	// AK: „Der Schalter Tafel wechselt zwischen Tag und Nacht; alle sichtbaren Flächen
	// wechseln mit" — Voraussetzung ist, dass eine Änderung des Stores das Attribut
	// data-theme am Wurzelelement setzt (Abschnitt „Tafelumschaltung").
	it('setzt das Attribut data-theme am Wurzelelement, wenn sich die Tafel ändert', () => {
		theme.set('dark');

		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	// F-01: „Die Wahl wird unter dem Schlüssel featuremap.theme im LocalStorage gemerkt."
	it('merkt eine Änderung unter dem Schlüssel featuremap.theme im LocalStorage', () => {
		theme.set('dark');

		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
	});

	// AK: „Nach einem Neuladen ist die zuletzt gewählte Tafel wieder aktiv." Getestet über
	// die zugrunde liegende Lesefunktion initTheme().
	it('liest beim Start einen zuvor gespeicherten Wert und wendet ihn an', () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

		initTheme();

		expect(get(theme)).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	// F-01 „Tafelumschaltung": „ist der Wert unbekannt … , bleibt es bei Tag."
	it('fällt bei einem unbekannten gespeicherten Wert auf light zurück', () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, 'blau');

		initTheme();

		expect(get(theme)).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	// F-01 „Tafelumschaltung": „ist … [der Wert] nicht [vorhanden], bleibt es bei Tag."
	it('fällt bei fehlendem gespeicherten Wert auf light zurück', () => {
		window.localStorage.removeItem(THEME_STORAGE_KEY);

		initTheme();

		expect(get(theme)).toBe('light');
	});

	// F-01 „Tafelumschaltung": „… oder LocalStorage nicht verfügbar, bleibt es bei Tag."
	// Vgl. NFR-32: fehlender LocalStorage darf die App nicht zum Absturz bringen.
	it('fällt bei nicht verfügbarem LocalStorage auf light zurück, ohne zu werfen', () => {
		const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('LocalStorage nicht verfügbar');
		});

		try {
			expect(() => initTheme()).not.toThrow();
			expect(get(theme)).toBe('light');
		} finally {
			getItemSpy.mockRestore();
		}
	});
});
