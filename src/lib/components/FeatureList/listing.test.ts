// F-14 · Verzeichnis — Unit-Tests für listing.ts (features/F-14-verzeichnis.md, Abschnitte
// "Verhalten", "Fachregeln", "Akzeptanzkriterien"; PRD FR-51 bis FR-53; features/README.md,
// Abschnitt "Zwei Präzisierungen gegenüber den Quellen", Revier-Grenze).

import { describe, expect, it } from 'vitest';
import { filterFeatures, groupByQuadrant, quadrantLabel, sortFeatures } from './listing';
import type { Feature } from '../../model/types';

describe('filterFeatures', () => {
	// FR-52: "Textfilter über Anzeigename und Kennung." Leerer Filter ändert nichts.
	it('liefert bei leerem Filter alle Features unverändert', () => {
		const features: Feature[] = [
			{ id: 'a', label: 'A', impact: 1, effort: 1 },
			{ id: 'b', label: 'B', impact: 2, effort: 2 }
		];
		expect(filterFeatures(features, '')).toEqual(features);
	});

	// F-14-AK: "Der Filter `sso` findet ein Feature mit der Kennung `sso` ebenso wie eines mit
	// dem Namen Single Sign-On." Zwei unterschiedliche Features: eines ganz ohne Anzeigename
	// (Kennung `sso` selbst trifft), eines mit eigenem Anzeigenamen, dessen Kennung `sso` als
	// Teilzeichenkette enthält (`enable-sso`) — zeigt, dass der Filter die Kennung auch dann
	// prüft, wenn ein Anzeigename angezeigt wird, nicht nur den sichtbaren Namen.
	it('findet ein Feature über die reine Kennung ebenso wie eines mit abweichendem Namen', () => {
		const sso: Feature = { id: 'sso', impact: 5, effort: 13 };
		const namedSso: Feature = { id: 'enable-sso', label: 'Single Sign-On', impact: 8, effort: 5 };
		const unrelated: Feature = { id: 'audit-log', label: 'Audit-Log', impact: 3, effort: 3 };

		const result = filterFeatures([sso, namedSso, unrelated], 'sso');

		expect(result).toContainEqual(sso);
		expect(result).toContainEqual(namedSso);
		expect(result).not.toContainEqual(unrelated);
	});

	// FR-52: "Groß-/Kleinschreibung egal."
	it('filtert unabhängig von Groß-/Kleinschreibung', () => {
		const feature: Feature = { id: 'sso', impact: 1, effort: 1 };
		expect(filterFeatures([feature], 'SSO')).toEqual([feature]);
		expect(filterFeatures([feature], 'Sso')).toEqual([feature]);
	});

	// FR-52: Teiltreffer über den Anzeigenamen.
	it('findet ein Feature über einen Teiltreffer im Anzeigenamen', () => {
		const feature: Feature = { id: 'audit-log', label: 'Audit-Log', impact: 1, effort: 1 };
		expect(filterFeatures([feature], 'dit-l')).toEqual([feature]);
	});

	it('liefert eine leere Liste ohne Treffer', () => {
		const feature: Feature = { id: 'audit-log', label: 'Audit-Log', impact: 1, effort: 1 };
		expect(filterFeatures([feature], 'unbekannt')).toEqual([]);
	});
});

describe('sortFeatures', () => {
	// FR-53, F-14 "Verhalten": "Bei Name aufsteigend." Sortierkriterium ist der Anzeigename
	// (`label` ?? `id`, Ubiquitous Language) — hier zusätzlich mit einem Feature ohne Label, um
	// den Fallback auf die Kennung zu prüfen.
	it('sortiert nach Anzeigename aufsteigend, mit Rückfall auf die Kennung ohne Label', () => {
		const features: Feature[] = [
			{ id: 'zebra', label: undefined, impact: 1, effort: 1 },
			{ id: 'b-id', label: 'Anton', impact: 1, effort: 1 },
			{ id: 'a-id', label: 'Berta', impact: 1, effort: 1 }
		];
		const sorted = sortFeatures(features, 'label');
		expect(sorted.map((f) => f.id)).toEqual(['b-id', 'a-id', 'zebra']);
	});

	// FR-53, F-14 "Verhalten": "Bei Sortierung nach Nutzen oder Aufwand absteigend."
	it('sortiert nach Nutzen (impact) absteigend', () => {
		const features: Feature[] = [
			{ id: 'a', impact: 3, effort: 1 },
			{ id: 'b', impact: 13, effort: 1 },
			{ id: 'c', impact: 8, effort: 1 }
		];
		const sorted = sortFeatures(features, 'impact');
		expect(sorted.map((f) => f.id)).toEqual(['b', 'c', 'a']);
	});

	it('sortiert nach Aufwand (effort) absteigend', () => {
		const features: Feature[] = [
			{ id: 'a', impact: 1, effort: 3 },
			{ id: 'b', impact: 1, effort: 13 },
			{ id: 'c', impact: 1, effort: 8 }
		];
		const sorted = sortFeatures(features, 'effort');
		expect(sorted.map((f) => f.id)).toEqual(['b', 'c', 'a']);
	});

	it('verändert das übergebene Array nicht (keine Mutation)', () => {
		const features: Feature[] = [
			{ id: 'b', impact: 2, effort: 1 },
			{ id: 'a', impact: 1, effort: 1 }
		];
		const original = [...features];
		sortFeatures(features, 'impact');
		expect(features).toEqual(original);
	});
});

describe('groupByQuadrant', () => {
	// F-14-AK: "Ein Feature mit impact = 13, effort = 8 steht bei domainMax = 22 unter Quick
	// Wins." Schwelle nach features/README.md: domainMax / 2 = 11 → impact 13 ≥ 11 (hoch),
	// effort 8 < 11 (niedrig) → Quick Wins.
	it('gruppiert impact=13/effort=8 bei domainMax=22 unter Quick Wins', () => {
		const feature: Feature = { id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 };
		const groups = groupByQuadrant([feature], 22);
		const quickWins = groups.find((g) => g.quadrant === 'quickWins');
		expect(quickWins?.features).toContainEqual(feature);
	});

	// features/README.md, Abschnitt "Zwei Präzisierungen…", Revier-Grenze: "Die Gruppierung im
	// Verzeichnis des Mockups weicht an zwei Stellen davon ab (Single Sign-On 5/13,
	// Volltextsuche 8/8); das ist ein Fehler des Mockups, nicht die Regel." Regressionstest
	// gegen genau diesen Fehler: nach der verbindlichen Regel (Schwelle domainMax/2 = 11) landet
	// Single Sign-On (5/13) unter Vermeiden (nicht Große Vorhaben wie im Mockup) und
	// Volltextsuche (8/8) unter Nebenbei (nicht Quick Wins wie im Mockup).
	it('gruppiert Single Sign-On (5/13) und Volltextsuche (8/8) nach der Regel, nicht wie das fehlerhafte Mockup', () => {
		const sso: Feature = { id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 };
		const suche: Feature = { id: 'suche', label: 'Volltextsuche', impact: 8, effort: 8 };
		const groups = groupByQuadrant([sso, suche], 22);

		expect(groups.find((g) => g.quadrant === 'vermeiden')?.features).toContainEqual(sso);
		expect(groups.find((g) => g.quadrant === 'grosseVorhaben')?.features ?? []).not.toContainEqual(
			sso
		);

		expect(groups.find((g) => g.quadrant === 'nebenbei')?.features).toContainEqual(suche);
		expect(groups.find((g) => g.quadrant === 'quickWins')?.features ?? []).not.toContainEqual(
			suche
		);
	});

	// F-14, Abschnitt "Umfang": Reihenfolge Quick Wins, Große Vorhaben, Nebenbei, Vermeiden;
	// leere Gruppen entfallen.
	it('liefert nur besetzte Reviere in der festen Reihenfolge', () => {
		const quickWin: Feature = { id: 'qw', impact: 21, effort: 1 };
		const nebenbei: Feature = { id: 'nb', impact: 1, effort: 1 };
		const groups = groupByQuadrant([nebenbei, quickWin], 22);

		expect(groups.map((g) => g.quadrant)).toEqual(['quickWins', 'nebenbei']);
	});

	it('behält innerhalb einer Gruppe die Reihenfolge der Eingabe bei, statt neu zu sortieren', () => {
		const first: Feature = { id: 'first', impact: 13, effort: 1 };
		const second: Feature = { id: 'second', impact: 21, effort: 1 };
		const groups = groupByQuadrant([second, first], 22);
		const quickWins = groups.find((g) => g.quadrant === 'quickWins');
		expect(quickWins?.features.map((f) => f.id)).toEqual(['second', 'first']);
	});
});

describe('quadrantLabel', () => {
	// design/03-seekarte.html, Abschnitt "Verzeichnis": Gruppenüberschriften "Quick Wins",
	// "Große Vorhaben", "Nebenbei", "Vermeiden".
	it('liefert die deutschen Beschriftungen aus dem Entwurf', () => {
		expect(quadrantLabel('quickWins')).toBe('Quick Wins');
		expect(quadrantLabel('grosseVorhaben')).toBe('Große Vorhaben');
		expect(quadrantLabel('nebenbei')).toBe('Nebenbei');
		expect(quadrantLabel('vermeiden')).toBe('Vermeiden');
	});
});
