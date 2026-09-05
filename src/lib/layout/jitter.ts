// Feature-Signaturen und Jitter (F-09 · features/F-09-feature-signaturen.md, Abschnitt „Umfang").
//
// Reine Rechenfunktion ohne Svelte- oder DOM-Bezug (features/README.md, Leitplanke 1): berechnet
// je Feature einen Anzeigepunkt, der bei mehreren Features mit identischem Wertepaar radial um
// den gemeinsamen Ankerpunkt auseinandergezogen wird (FR-30, FR-33). Der Versatz ist rein visuell
// (FR-31) und deterministisch aus der Kennung abgeleitet (FR-32) — er verändert weder die
// gespeicherten Werte noch wird er selbst gespeichert oder exportiert.
//
// Winkelformel nach PRD 7.3: der Summand „(seed mod 360)" ist dort mit Gradzeichen notiert und
// wird deshalb mit π/180 ins Bogenmaß umgerechnet, bevor er zum Term 2π · Gruppenindex /
// Gruppengröße addiert wird (features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators",
// „Winkel im Jitter"). Die PRD ist bei Widerspruch zu allem anderen maßgeblich (CLAUDE.md).

import { xOf, yOf } from './scales';
import type { Feature, FeatureId, FeatureMap } from '../model/types';

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
 * 32-Bit-FNV-1a-Hash über eine Zeichenkette (PRD 7.3: „seed ← hash(featureId)"). Festgelegt,
 * damit das Ergebnis zwischen Sitzungen und Rechnern gleich bleibt — kein `Math.random`, keine
 * plattformabhängige Hashfunktion.
 */
function fnv1a32(value: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/** Stabile Sortierung nach Kennung (Zeichencode aufsteigend), für den Gruppenindex. */
function byId(a: Feature, b: Feature): number {
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	return 0;
}

/**
 * Platziert jedes Feature der Karte auf der Plotfläche. Gruppiert nach (impact, effort), lässt
 * Einzelgruppen auf dem Ankerpunkt und versetzt größere Gruppen radial nach der in F-09
 * beschriebenen Formel (FNV-1a-32 über die Kennung, stabile Sortierung nach Kennung für den
 * Gruppenindex).
 */
export function placeFeatures(map: FeatureMap, domainMax: number): Placement[] {
	const groups = new Map<string, Feature[]>();
	for (const feature of map.features) {
		const key = `${feature.impact}:${feature.effort}`;
		const group = groups.get(key);
		if (group) {
			group.push(feature);
		} else {
			groups.set(key, [feature]);
		}
	}

	const sortedGroups = new Map<string, Feature[]>();
	for (const [key, group] of groups) {
		sortedGroups.set(key, [...group].sort(byId));
	}

	return map.features.map((feature): Placement => {
		const key = `${feature.impact}:${feature.effort}`;
		const anchorX = xOf(feature.effort, domainMax);
		const anchorY = yOf(feature.impact, domainMax);
		const sortedGroup = sortedGroups.get(key) as Feature[];
		const size = sortedGroup.length;

		if (size === 1) {
			return { id: feature.id, x: anchorX, y: anchorY, anchorX, anchorY, jittered: false };
		}

		const index = sortedGroup.findIndex((candidate) => candidate.id === feature.id);
		const seed = fnv1a32(feature.id);
		const angle = (2 * Math.PI * index) / size + (seed % 360) * (Math.PI / 180);
		const radius = Math.min(BASE_RADIUS * Math.sqrt(size), MAX_RADIUS);

		return {
			id: feature.id,
			x: anchorX + radius * Math.cos(angle),
			y: anchorY + radius * Math.sin(angle),
			anchorX,
			anchorY,
			jittered: true
		};
	});
}
