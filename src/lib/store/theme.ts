// Tafelumschaltung (F-01 · features/F-01-projektgeruest.md, Abschnitt „Tafelumschaltung").
//
// Verwaltet die aktuell aktive Farbtafel (Tag/Nacht), synchronisiert sie mit dem
// data-theme-Attribut am Wurzelelement und merkt die Wahl im LocalStorage. Startwert ist
// immer 'light', unabhängig von der Systemeinstellung (Entwurf 3, design/README.md).
//
// Rumpf ist Aufgabe des Feature-Agenten. Dieses Modul enthält nur die von F-01
// vorgegebene Signatur.

import { writable, type Writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

/** LocalStorage-Schlüssel, unter dem die gewählte Tafel gemerkt wird. */
export const THEME_STORAGE_KEY = 'featuremap.theme';

/**
 * Reaktiver Store der aktuell aktiven Farbtafel. Startwert 'light' (Tag).
 * Eine Änderung soll das Attribut data-theme am Wurzelelement setzen und die Wahl im
 * LocalStorage merken.
 */
export const theme: Writable<Theme> = writable<Theme>('light');

/** Setzt das Attribut data-theme am Wurzelelement passend zur übergebenen Tafel. */
function applyThemeAttribute(value: Theme): void {
	document.documentElement.dataset.theme = value;
}

/**
 * Merkt die Tafel im LocalStorage. Ist LocalStorage nicht verfügbar (NFR-32), bleibt die
 * Tafel für die laufende Sitzung wirksam, wird aber nicht darüber hinaus gemerkt.
 */
function persistTheme(value: Theme): void {
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, value);
	} catch {
		// LocalStorage nicht verfügbar — bewusst ignoriert, siehe Kommentar oben.
	}
}

// Jede Änderung der Tafel — ob durch initTheme() oder durch den Schalter im Kopfband —
// setzt das Attribut am Wurzelelement und merkt die Wahl. Svelte-Stores rufen den
// Subscriber sofort beim Abonnieren mit dem aktuellen Wert auf; dieser erste Aufruf ist
// keine Änderung durch die Nutzerin, sondern nur der Startwert 'light' des Moduls. Er darf
// nicht ins LocalStorage geschrieben werden, sonst überschriebe ein Neuladen der Seite eine
// zuvor gemerkte Tafel, bevor initTheme() sie lesen kann.
let hasSeenChange = false;
theme.subscribe((value) => {
	applyThemeAttribute(value);
	if (hasSeenChange) {
		persistTheme(value);
	}
	hasSeenChange = true;
});

/** Liest den gemerkten Wert; fällt bei fehlendem, ungültigem oder nicht verfügbarem
 * LocalStorage auf 'light' zurück, statt zu werfen. */
function readStoredTheme(): Theme {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		return stored === 'dark' ? 'dark' : 'light';
	} catch {
		return 'light';
	}
}

/**
 * Liest die zuletzt gewählte Tafel aus dem LocalStorage und wendet sie auf Store und
 * Wurzelelement an. Fällt bei fehlendem, ungültigem oder nicht verfügbarem LocalStorage
 * auf 'light' zurück, statt zu werfen.
 */
export function initTheme(): void {
	const initial = readStoredTheme();
	// Store und Wurzelelement werden hier zusätzlich explizit gesetzt, statt sich allein auf
	// die Subscription zu verlassen: theme.set() meldet Abonnenten nur bei einer tatsächlichen
	// Wertänderung, initTheme() muss die Tafel aber auch dann anwenden, wenn sie bereits dem
	// Startwert 'light' entspricht.
	theme.set(initial);
	applyThemeAttribute(initial);
	persistTheme(initial);
}
