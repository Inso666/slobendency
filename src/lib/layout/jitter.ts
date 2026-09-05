// Feature-Signaturen und Jitter (F-09 · features/F-09-feature-signaturen.md, Abschnitt „Umfang").
//
// Reine Rechenfunktion ohne Svelte- oder DOM-Bezug (features/README.md, Leitplanke 1): berechnet
// je Feature einen Anzeigepunkt, der bei mehreren Features mit identischem Wertepaar radial um
// den gemeinsamen Ankerpunkt auseinandergezogen wird (FR-30, FR-33). Der Versatz ist rein visuell
// (FR-31) und deterministisch aus der Kennung abgeleitet (FR-32) — er verändert weder die
// gespeicherten Werte noch wird er selbst gespeichert oder exportiert.
//
// Signatur ist vom Test-Agenten vorgegeben. Rumpf ist Aufgabe des Feature-Agenten.

import type { FeatureId, FeatureMap } from '../model/types';

/** Basisradius des Versatzes in Einheiten der viewBox (F-09, Abschnitt „Umfang"). */
export const BASE_RADIUS = 9;

/** Obergrenze des Versatzradius — kleiner als der halbe Rasterabstand (40 / 2), FR-33. */
export const MAX_RADIUS = 16;

/**
 * Berechneter Anzeigepunkt eines Features (F-09, Abschnitt „Umfang"). `x`/`y` sind die
 * tatsächlichen, ggf. versetzten Renderkoordinaten; `anchorX`/`anchorY` der unversetzte
 * Ankerpunkt aus den Originalwerten. `jittered` ist wahr, sobald das Feature Teil einer Gruppe
 * mit mehr als einem Mitglied ist.
 */
export interface Placement {
	id: FeatureId;
	x: number;
	y: number;
	anchorX: number;
	anchorY: number;
	jittered: boolean;
}

/**
 * Platziert jedes Feature der Karte auf der Plotfläche. Gruppiert nach (impact, effort), lässt
 * Einzelgruppen auf dem Ankerpunkt und versetzt größere Gruppen radial nach der in F-09
 * beschriebenen Formel (FNV-1a-32 über die Kennung, stabile Sortierung nach Kennung für den
 * Gruppenindex).
 */
export function placeFeatures(map: FeatureMap, domainMax: number): Placement[] {
	throw new Error('not implemented');
}
