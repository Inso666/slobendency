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

/**
 * Liest die zuletzt gewählte Tafel aus dem LocalStorage und wendet sie auf Store und
 * Wurzelelement an. Fällt bei fehlendem, ungültigem oder nicht verfügbarem LocalStorage
 * auf 'light' zurück, statt zu werfen.
 */
export function initTheme(): void {
	throw new Error('not implemented');
}
