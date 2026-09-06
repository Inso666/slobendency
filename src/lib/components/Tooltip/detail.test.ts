// F-15 · Detail-Kartusche — Unit-Tests für detail.ts (features/F-15-detail-kartusche.md,
// Abschnitt "Tests": "Aufteilung in ein- und ausgehende Beziehungen, Revierbenennung, leerer
// Zustand"; Akzeptanzkriterien 1 und 6; PRD FR-40; features/README.md, Ubiquitous Language).

import { describe, expect, it } from 'vitest';
import { bearingsOf, quadrantLabel } from './detail';
import type { FeatureMap } from '../../model/types';

/**
 * Karte nach dem Vorbild aus design/03-seekarte.html: „Rollen & Rechte" hat drei ausgehende
 * (benötigt, hängt zusammen, schließt aus) und eine eingehende Beziehung.
 */
function seekarte(): FeatureMap {
	return {
		schemaVersion: 1,
		features: [
			{ id: 'rollen', label: 'Rollen & Rechte', impact: 13, effort: 8 },
			{ id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 },
			{ id: 'audit', label: 'Audit-Log', impact: 5, effort: 5 },
			{ id: 'gast', label: 'Gastzugang', impact: 3, effort: 2 },
			{ id: 'api', label: 'Öffentliche API', impact: 8, effort: 21 },
			{ id: 'dark', label: 'Dark Mode', impact: 2, effort: 3 }
		],
		relations: [
			{ from: 'rollen', to: 'sso', type: 'requires', label: 'nutzt Identität' },
			{ from: 'rollen', to: 'audit', type: 'relates', label: 'gemeinsame Events' },
			{ from: 'rollen', to: 'gast', type: 'excludes', label: 'widerspricht sich' },
			{ from: 'api', to: 'rollen', type: 'requires' }
		]
	};
}

describe('bearingsOf', () => {
	// F-15-AK: „Selektion eines Features mit drei ausgehenden und einer eingehenden Beziehung
	// zeigt beide Abschnitte." PRD FR-40.
	it('teilt die Beziehungen eines Features in ausgehende und eingehende auf', () => {
		const bearings = bearingsOf(seekarte(), 'rollen');

		expect(bearings.outgoing).toHaveLength(3);
		expect(bearings.incoming).toHaveLength(1);
	});

	// F-15, Abschnitt „Umfang": „Geht aus von hier" nennt je Zeile Art, Ziel und Beschriftung.
	it('nennt bei ausgehenden Beziehungen das Ziel als Gegenüber, mit Art und Beschriftung', () => {
		const bearings = bearingsOf(seekarte(), 'rollen');

		expect(bearings.outgoing).toEqual([
			{
				counterpartId: 'sso',
				name: 'Single Sign-On',
				type: 'requires',
				label: 'nutzt Identität'
			},
			{
				counterpartId: 'audit',
				name: 'Audit-Log',
				type: 'relates',
				label: 'gemeinsame Events'
			},
			{
				counterpartId: 'gast',
				name: 'Gastzugang',
				type: 'excludes',
				label: 'widerspricht sich'
			}
		]);
	});

	// F-15, Abschnitt „Umfang": „Führt hierher" zeigt die eingehenden Beziehungen — dort ist
	// das Gegenüber die Quelle, nicht das Ziel.
	it('nennt bei eingehenden Beziehungen die Quelle als Gegenüber', () => {
		const bearings = bearingsOf(seekarte(), 'rollen');

		expect(bearings.incoming).toEqual([
			{ counterpartId: 'api', name: 'Öffentliche API', type: 'requires' }
		]);
	});

	// PRD 3.1: „label — Anzeigename. Fehlt er, wird id angezeigt."
	it('zeigt die Kennung des Gegenübers, wenn dieses keinen Anzeigenamen hat', () => {
		const map: FeatureMap = {
			schemaVersion: 1,
			features: [
				{ id: 'a', label: 'A', impact: 1, effort: 1 },
				{ id: 'b', impact: 2, effort: 2 }
			],
			relations: [{ from: 'a', to: 'b', type: 'requires' }]
		};

		expect(bearingsOf(map, 'a').outgoing[0].name).toBe('b');
	});

	// Eine Beziehung ohne Beschriftung trägt kein leeres Label, sondern gar keines
	// (Relation.label ist optional, PRD 3.1).
	it('lässt die Beschriftung weg, wenn die Beziehung keine hat', () => {
		const bearings = bearingsOf(seekarte(), 'rollen');

		expect(bearings.incoming[0].label).toBeUndefined();
	});

	// F-15, Abschnitt „Umfang": Ein Feature kann mit demselben Gegenüber in beide Richtungen
	// verbunden sein; jede Richtung gehört in ihren eigenen Abschnitt.
	it('ordnet dasselbe Gegenüber in beiden Richtungen je einmal zu', () => {
		const map: FeatureMap = {
			schemaVersion: 1,
			features: [
				{ id: 'a', label: 'A', impact: 1, effort: 1 },
				{ id: 'b', label: 'B', impact: 2, effort: 2 }
			],
			relations: [
				{ from: 'a', to: 'b', type: 'requires' },
				{ from: 'b', to: 'a', type: 'relates' }
			]
		};

		const bearings = bearingsOf(map, 'a');
		expect(bearings.outgoing.map((b) => b.counterpartId)).toEqual(['b']);
		expect(bearings.incoming.map((b) => b.counterpartId)).toEqual(['b']);
		expect(bearings.outgoing[0].type).toBe('requires');
		expect(bearings.incoming[0].type).toBe('relates');
	});

	// Die Reihenfolge der Karte bleibt erhalten — die Kartusche erfindet keine eigene.
	it('behält je Abschnitt die Reihenfolge der Beziehungen aus der Karte bei', () => {
		const map = seekarte();
		map.relations = [
			{ from: 'rollen', to: 'gast', type: 'excludes' },
			{ from: 'rollen', to: 'sso', type: 'requires' },
			{ from: 'rollen', to: 'audit', type: 'relates' }
		];

		expect(bearingsOf(map, 'rollen').outgoing.map((b) => b.counterpartId)).toEqual([
			'gast',
			'sso',
			'audit'
		]);
	});

	// F-15-AK: „Ein Feature ohne Beziehungen zeigt einen erklärenden Hinweis statt leerer
	// Abschnitte." Grundlage dafür sind zwei leere Listen.
	it('liefert für ein Feature ohne Beziehungen zwei leere Listen', () => {
		const bearings = bearingsOf(seekarte(), 'dark');

		expect(bearings.outgoing).toEqual([]);
		expect(bearings.incoming).toEqual([]);
	});

	// Grenzfall: Zwischen Aufheben der Selektion und Neuzeichnen darf eine unbekannte Kennung
	// nicht zum Absturz führen (NFR-30 sinngemäß).
	it('liefert für eine unbekannte Kennung zwei leere Listen', () => {
		const bearings = bearingsOf(seekarte(), 'gibtsnicht');

		expect(bearings.outgoing).toEqual([]);
		expect(bearings.incoming).toEqual([]);
	});

	// features/README.md, Leitplanke 2: Das Aggregat ist unveränderlich; eine Leseoperation
	// verändert die Karte nicht.
	it('verändert die übergebene Karte nicht', () => {
		const map = seekarte();
		const vorher = JSON.stringify(map);

		bearingsOf(map, 'rollen');

		expect(JSON.stringify(map)).toBe(vorher);
	});
});

describe('quadrantLabel', () => {
	// F-15, Abschnitt „Fachregeln": „Das Revier wird … in der Sprache der Oberfläche benannt:
	// Quick Wins, Große Vorhaben, Nebenbei, Vermeiden." features/README.md, Ubiquitous Language.
	it('benennt quickWins als „Quick Wins"', () => {
		expect(quadrantLabel('quickWins')).toBe('Quick Wins');
	});

	it('benennt grosseVorhaben als „Große Vorhaben"', () => {
		expect(quadrantLabel('grosseVorhaben')).toBe('Große Vorhaben');
	});

	it('benennt nebenbei als „Nebenbei"', () => {
		expect(quadrantLabel('nebenbei')).toBe('Nebenbei');
	});

	it('benennt vermeiden als „Vermeiden"', () => {
		expect(quadrantLabel('vermeiden')).toBe('Vermeiden');
	});

	// Vier Reviere, vier unterscheidbare Namen — kein Revier bleibt namenlos oder doppelt.
	it('vergibt für alle vier Reviere unterschiedliche Namen', () => {
		const namen = (['quickWins', 'grosseVorhaben', 'nebenbei', 'vermeiden'] as const).map(
			quadrantLabel
		);

		expect(new Set(namen).size).toBe(4);
	});
});
