// Persistenz im LocalStorage (F-04 · features/F-04-persistenz.md, Abschnitt „Umfang").
//
// Repository-Adapter: kennt das Aggregat, das Aggregat kennt ihn nicht. Abonnent des
// Kartenstores aus F-03 — die Anwendungsschicht ruft ihn nicht aktiv auf
// (features/F-04-persistenz.md, Abschnitt „DDD-Einordnung").
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import type { Readable } from 'svelte/store';

/** Zustand des Speichervorgangs (F-04, Abschnitt „Umfang"). */
export type StorageState = 'ready' | 'unavailable' | 'quotaExceeded' | 'recovered';

/**
 * Aktueller Speicherzustand. Wird von F-23 in der Fußleiste angezeigt (hier nicht Teil des
 * Umfangs, siehe „Nicht Teil dieses Features").
 */
export const storageState: Readable<StorageState> = {
	subscribe() {
		throw new Error('not implemented');
	}
};

/** Zeitpunkt des letzten erfolgreichen Schreibvorgangs, oder `null`, wenn noch keiner stattfand. */
export const lastSavedAt: Readable<Date | null> = {
	subscribe() {
		throw new Error('not implemented');
	}
};

/**
 * Liest den gespeicherten Stand, übergibt ihn per `loadMap` an den Store und abonniert danach
 * jede Änderung, um sie gebündelt zurückzuschreiben (FR-70 bis FR-74, NFR-31, NFR-32). Einmal
 * beim App-Start aufzurufen, vor dem ersten Rendern der Karte (FR-72).
 */
export function initPersistence(): void {
	throw new Error('not implemented');
}
