// F-02 · Domänenmodell und Invarianten — Unit-Tests für das Aggregat FeatureMap.
// Quellen: features/F-02-domaenenmodell.md (Abschnitte „Fachregeln", „Revier-Ableitung",
// „Akzeptanzkriterien"), PRD.md Abschnitt 3.3 (INT-01 … INT-07) und 3.1 (Feldregeln).

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './types';
import type { Feature, FeatureMap, Relation } from './types';
import {
	addFeature,
	addRelation,
	emptyMap,
	quadrantOf,
	relationsOf,
	removeFeature,
	removeRelation,
	renameFeature,
	updateFeature,
	updateRelation
} from './validation';
import type { Result } from './validation';

function feature(overrides: Partial<Feature> = {}): Feature {
	return { id: 'login', label: 'Benutzer-Login', impact: 8, effort: 3, ...overrides };
}

function mapWith(features: Feature[], relations: Relation[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

function expectRejected(result: Result<unknown>, rule: string, field?: string): void {
	expect(result.ok).toBe(false);
	if (result.ok) return;
	const match = result.errors.some((e) => e.rule === rule && (field === undefined || e.field === field));
	expect(match, `erwartete Regel "${rule}"${field ? ` auf Feld "${field}"` : ''}, erhielt ${JSON.stringify(result.errors)}`).toBe(true);
}

describe('emptyMap', () => {
	// PRD 3.1: „schemaVersion | integer | Aktuell 1"; FR-73: genau eine aktive Karte.
	it('liefert eine leere Karte mit aktueller Schemaversion', () => {
		expect(emptyMap()).toEqual({ schemaVersion: SCHEMA_VERSION, features: [], relations: [] });
	});
});

describe('addFeature', () => {
	// Grundfall: Feature wird der Karte hinzugefügt, Ursprungskarte bleibt unverändert
	// (features/README.md, Leitplanke 2: „Das Aggregat ist unveränderlich").
	it('fügt ein gültiges Feature hinzu, ohne die Ursprungskarte zu verändern', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature());

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.features).toEqual([feature()]);
		expect(map.features).toEqual([]);
	});

	// INT-01: „Feature.id ist mapweit eindeutig" — Anlegen wird abgelehnt.
	it('lehnt ein Feature mit bereits vergebener Kennung ab (INT-01)', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = addFeature(map, feature({ id: 'login', impact: 1, effort: 1 }));

		expectRejected(result, 'INT-01', 'id');
	});

	// F-02, Ubiquitous Language: Kennung ist „Groß-/Kleinschreibung signifikant" — 'Login'
	// und 'login' sind verschiedene Kennungen und dürfen beide existieren.
	it('behandelt Kennungen groß-/kleinschreibungssensitiv (INT-01)', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = addFeature(map, feature({ id: 'Login' }));

		expect(result.ok).toBe(true);
	});

	// INT-07: „impact und effort sind nicht-negative Ganzzahlen".
	it('lehnt einen negativen impact ab (INT-07)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', impact: -1 }));

		expectRejected(result, 'INT-07', 'impact');
	});

	it('lehnt einen negativen effort ab (INT-07)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', effort: -1 }));

		expectRejected(result, 'INT-07', 'effort');
	});

	it('lehnt einen nicht-ganzzahligen impact ab (INT-07)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', impact: 1.5 }));

		expectRejected(result, 'INT-07', 'impact');
	});

	it('lehnt einen nicht-ganzzahligen effort ab (INT-07)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', effort: 2.2 }));

		expectRejected(result, 'INT-07', 'effort');
	});

	// F-02 „Ergänzende Feldregeln": Kennung erfordert `^[A-Za-z0-9_-]+$`.
	it('lehnt eine Kennung mit unzulässigen Zeichen ab', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'login user' }));

		expect(result.ok).toBe(false);
	});

	// PRD 4.2 (Grammatik, `identifier = (letter | "_"), {...}`) ist maßgeblich gegenüber dem
	// weiteren Zeichensatz aus PRD 3.1 — Entscheidung des Orchestrators, features/STATUS.md,
	// Abschnitt „Entscheidungen des Orchestrators" (05.09.): eine Kennung, die mit Ziffer oder
	// Bindestrich beginnt, ist ungültig.
	it('lehnt eine Kennung ab, die mit einer Ziffer beginnt (PRD 4.2)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: '1login' }));

		expect(result.ok).toBe(false);
	});

	it('lehnt eine Kennung ab, die mit einem Bindestrich beginnt (PRD 4.2)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: '-login' }));

		expect(result.ok).toBe(false);
	});

	it('akzeptiert eine Kennung, die mit einem Unterstrich beginnt (PRD 4.2)', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: '_login' }));

		expect(result.ok).toBe(true);
	});

	it('lehnt eine leere Kennung ab', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: '' }));

		expect(result.ok).toBe(false);
	});

	// F-02 „Ergänzende Feldregeln": Kennung maximal 64 Zeichen (NFR-23).
	it('akzeptiert eine Kennung mit genau 64 Zeichen', () => {
		const map = mapWith([]);
		const id = 'a'.repeat(64);

		const result = addFeature(map, feature({ id }));

		expect(result.ok).toBe(true);
	});

	it('lehnt eine Kennung mit 65 Zeichen ab', () => {
		const map = mapWith([]);
		const id = 'a'.repeat(65);

		const result = addFeature(map, feature({ id }));

		expect(result.ok).toBe(false);
	});

	// F-02 „Ergänzende Feldregeln": Anzeigename maximal 200 Zeichen (NFR-23).
	it('akzeptiert ein Label mit genau 200 Zeichen', () => {
		const map = mapWith([]);
		const label = 'a'.repeat(200);

		const result = addFeature(map, feature({ id: 'x', label }));

		expect(result.ok).toBe(true);
	});

	it('lehnt ein Label mit 201 Zeichen ab', () => {
		const map = mapWith([]);
		const label = 'a'.repeat(201);

		const result = addFeature(map, feature({ id: 'x', label }));

		expect(result.ok).toBe(false);
	});

	// F-02 „Ergänzende Feldregeln": Anzeigename „darf kein Anführungszeichen und keinen
	// Zeilenumbruch enthalten — sonst wäre er in der DSL nicht darstellbar."
	it('lehnt ein Label mit Anführungszeichen ab', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', label: 'Enthält "Zitat"' }));

		expect(result.ok).toBe(false);
	});

	it('lehnt ein Label mit Zeilenumbruch ab', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', label: 'Zeile eins\nZeile zwei' }));

		expect(result.ok).toBe(false);
	});

	// AK: „Ein Feature mit impact = 7 bleibt nach beliebigen Operationen bei 7" (FR-03, DSL-04:
	// Werte außerhalb der Fibonacci-Reihe sind gültig und werden nie gerundet).
	it('übernimmt einen impact von 7 unverändert, obwohl er nicht in der Fibonacci-Reihe liegt', () => {
		const map = mapWith([]);

		const result = addFeature(map, feature({ id: 'x', impact: 7 }));

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.features.find((f) => f.id === 'x')?.impact).toBe(7);
	});
});

describe('updateFeature', () => {
	it('ändert ein bestehendes Feature, ohne die Ursprungskarte zu verändern', () => {
		const map = mapWith([feature({ id: 'login', label: 'Alt' })]);

		const result = updateFeature(map, 'login', { label: 'Neu' });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.features.find((f) => f.id === 'login')?.label).toBe('Neu');
		expect(map.features.find((f) => f.id === 'login')?.label).toBe('Alt');
	});

	it('scheitert, wenn die Kennung nicht existiert', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = updateFeature(map, 'unbekannt', { label: 'Neu' });

		expect(result.ok).toBe(false);
	});

	// INT-07 gilt auch bei Änderungen, nicht nur beim Anlegen.
	it('lehnt eine Änderung auf einen negativen effort ab (INT-07)', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = updateFeature(map, 'login', { effort: -3 });

		expectRejected(result, 'INT-07', 'effort');
	});

	// AK: impact = 7 bleibt bei beliebigen — auch unbeteiligten — Operationen erhalten.
	it('lässt einen impact von 7 unverändert, wenn nur das Label geändert wird', () => {
		const map = mapWith([feature({ id: 'x', impact: 7 })]);

		const result = updateFeature(map, 'x', { label: 'Neuer Name' });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.features.find((f) => f.id === 'x')?.impact).toBe(7);
	});
});

describe('renameFeature', () => {
	// INT-06: „Umbenennen einer id zieht alle Referenzen in relations automatisch nach" —
	// AK-10: „Umbenennen einer Feature-ID hält alle Beziehungen intakt."
	it('zieht ausgehende und eingehende Beziehungen bei einer Umbenennung nach (INT-06, AK-10)', () => {
		const map = mapWith(
			[feature({ id: 'sso' }), feature({ id: 'login' }), feature({ id: 'export' })],
			[
				{ from: 'sso', to: 'login', type: 'requires' },
				{ from: 'export', to: 'sso', type: 'relates' }
			]
		);

		const result = renameFeature(map, 'sso', 'single-sign-on');

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.features.some((f) => f.id === 'sso')).toBe(false);
		expect(result.value.features.some((f) => f.id === 'single-sign-on')).toBe(true);
		expect(result.value.relations).toEqual(
			expect.arrayContaining([
				{ from: 'single-sign-on', to: 'login', type: 'requires' },
				{ from: 'export', to: 'single-sign-on', type: 'relates' }
			])
		);
		expect(result.value.relations).toHaveLength(2);
		// Ursprungskarte bleibt unverändert.
		expect(map.features.some((f) => f.id === 'sso')).toBe(true);
		expect(map.relations).toEqual([
			{ from: 'sso', to: 'login', type: 'requires' },
			{ from: 'export', to: 'sso', type: 'relates' }
		]);
	});

	// INT-01 gilt auch beim Umbenennen: die Zielkennung darf nicht bereits vergeben sein.
	it('lehnt eine Umbenennung auf eine bereits vergebene Kennung ab (INT-01)', () => {
		const map = mapWith([feature({ id: 'login' }), feature({ id: 'sso' })]);

		const result = renameFeature(map, 'sso', 'login');

		expectRejected(result, 'INT-01', 'id');
	});

	it('lehnt eine Umbenennung auf eine ungültige Kennung ab', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = renameFeature(map, 'login', 'ungültige id!');

		expect(result.ok).toBe(false);
	});

	it('scheitert, wenn die umzubenennende Kennung nicht existiert', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = renameFeature(map, 'unbekannt', 'neu');

		expect(result.ok).toBe(false);
	});
});

describe('removeFeature', () => {
	// AK-09: „Löschen eines Features entfernt alle zugehörigen Kanten aus Map und Export."
	// INT-02: „Löschen eines Features entfernt alle seine Beziehungen."
	it('entfernt ein Feature mit drei Beziehungen zusammen mit genau diesen drei Beziehungen (AK-09)', () => {
		const map = mapWith(
			[
				feature({ id: 'sso' }),
				feature({ id: 'login' }),
				feature({ id: 'export' }),
				feature({ id: 'legacy-auth' })
			],
			[
				{ from: 'sso', to: 'login', type: 'requires' },
				{ from: 'export', to: 'sso', type: 'relates' },
				{ from: 'sso', to: 'legacy-auth', type: 'excludes' },
				{ from: 'export', to: 'login', type: 'relates' }
			]
		);

		const result = removeFeature(map, 'sso');

		expect(result.features.some((f) => f.id === 'sso')).toBe(false);
		expect(result.relations).toEqual([{ from: 'export', to: 'login', type: 'relates' }]);
		// Ursprungskarte bleibt unverändert.
		expect(map.features.some((f) => f.id === 'sso')).toBe(true);
		expect(map.relations).toHaveLength(4);
	});

	it('lässt die Karte inhaltlich unverändert, wenn die Kennung nicht existiert', () => {
		const map = mapWith([feature({ id: 'login' })]);

		const result = removeFeature(map, 'unbekannt');

		expect(result.features).toEqual(map.features);
		expect(result.relations).toEqual(map.relations);
	});
});

describe('addRelation', () => {
	function twoFeatures(): FeatureMap {
		return mapWith([feature({ id: 'a' }), feature({ id: 'b' })]);
	}

	it('fügt eine gültige Beziehung hinzu, ohne die Ursprungskarte zu verändern', () => {
		const map = twoFeatures();
		const relation: Relation = { from: 'a', to: 'b', type: 'requires' };

		const result = addRelation(map, relation);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.relations).toEqual([relation]);
		expect(map.relations).toEqual([]);
	});

	// INT-02: „Relation.from und Relation.to müssen auf existierende Features verweisen."
	it('lehnt eine Beziehung mit unbekannter Quelle ab (INT-02)', () => {
		const map = twoFeatures();

		const result = addRelation(map, { from: 'unbekannt', to: 'b', type: 'requires' });

		expectRejected(result, 'INT-02');
	});

	it('lehnt eine Beziehung mit unbekanntem Ziel ab (INT-02)', () => {
		const map = twoFeatures();

		const result = addRelation(map, { from: 'a', to: 'unbekannt', type: 'requires' });

		expectRejected(result, 'INT-02');
	});

	// INT-03: „from ≠ to (keine Selbstreferenz)."
	it('lehnt eine Selbstreferenz ab (INT-03)', () => {
		const map = twoFeatures();

		const result = addRelation(map, { from: 'a', to: 'a', type: 'requires' });

		expectRejected(result, 'INT-03');
	});

	// INT-04: „Kein identisches Tripel (from, to, type) doppelt."
	it('lehnt ein doppeltes Tripel aus Quelle, Ziel und Art ab (INT-04)', () => {
		const map = mapWith(
			[feature({ id: 'a' }), feature({ id: 'b' })],
			[{ from: 'a', to: 'b', type: 'requires' }]
		);

		const result = addRelation(map, { from: 'a', to: 'b', type: 'requires', label: 'zweiter Versuch' });

		expectRejected(result, 'INT-04');
	});

	it('erlaubt dieselbe Quelle und dasselbe Ziel mit unterschiedlicher Art (kein Tripel-Duplikat)', () => {
		const map = mapWith(
			[feature({ id: 'a' }), feature({ id: 'b' })],
			[{ from: 'a', to: 'b', type: 'requires' }]
		);

		const result = addRelation(map, { from: 'a', to: 'b', type: 'relates' });

		expect(result.ok).toBe(true);
	});

	// INT-05: „requires-Kanten dürfen keinen Zyklus bilden" — Verhalten bei Verletzung: „Beziehung
	// wird angelegt, aber als Warnung markiert." Hier zu prüfen: kein Ablehnen durch addFeature
	// selbst; die Zyklenprüfung/-markierung liefert F-07 (features/F-02-domaenenmodell.md,
	// Fachregeln-Tabelle: „Hier nur: kein Ablehnen").
	it('lehnt eine requires-Beziehung, die einen Zyklus schließt, nicht ab (INT-05)', () => {
		const map = mapWith(
			[feature({ id: 'a' }), feature({ id: 'b' })],
			[{ from: 'a', to: 'b', type: 'requires' }]
		);

		const result = addRelation(map, { from: 'b', to: 'a', type: 'requires' });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.relations).toEqual(
			expect.arrayContaining([
				{ from: 'a', to: 'b', type: 'requires' },
				{ from: 'b', to: 'a', type: 'requires' }
			])
		);
	});

	// Kantenbeschriftung maximal 120 Zeichen, dieselbe Zeichenbeschränkung wie Anzeigename (NFR-23).
	it('akzeptiert ein Kantenlabel mit genau 120 Zeichen', () => {
		const map = twoFeatures();
		const label = 'a'.repeat(120);

		const result = addRelation(map, { from: 'a', to: 'b', type: 'requires', label });

		expect(result.ok).toBe(true);
	});

	it('lehnt ein Kantenlabel mit 121 Zeichen ab', () => {
		const map = twoFeatures();
		const label = 'a'.repeat(121);

		const result = addRelation(map, { from: 'a', to: 'b', type: 'requires', label });

		expect(result.ok).toBe(false);
	});

	it('lehnt ein Kantenlabel mit Anführungszeichen ab', () => {
		const map = twoFeatures();

		const result = addRelation(map, { from: 'a', to: 'b', type: 'requires', label: 'Nutzt "Session"' });

		expect(result.ok).toBe(false);
	});
});

describe('updateRelation', () => {
	function mapWithOneRelation(): FeatureMap {
		return mapWith(
			[feature({ id: 'a' }), feature({ id: 'b' })],
			[{ from: 'a', to: 'b', type: 'relates' }]
		);
	}

	it('ändert Typ und Label einer bestehenden Beziehung über ihren Index', () => {
		const map = mapWithOneRelation();

		const result = updateRelation(map, 0, { type: 'requires', label: 'präzisiert' });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.relations[0]).toEqual({ from: 'a', to: 'b', type: 'requires', label: 'präzisiert' });
		// Ursprungskarte bleibt unverändert.
		expect(map.relations[0].type).toBe('relates');
	});

	it('scheitert bei einem nicht existierenden Index', () => {
		const map = mapWithOneRelation();

		const result = updateRelation(map, 5, { label: 'x' });

		expect(result.ok).toBe(false);
	});

	it('scheitert bei einem negativen Index', () => {
		const map = mapWithOneRelation();

		const result = updateRelation(map, -1, { label: 'x' });

		expect(result.ok).toBe(false);
	});
});

describe('removeRelation', () => {
	it('entfernt eine bestehende Beziehung, ohne die Ursprungskarte zu verändern', () => {
		const kept: Relation = { from: 'b', to: 'a', type: 'relates' };
		const removed: Relation = { from: 'a', to: 'b', type: 'requires' };
		const map = mapWith([feature({ id: 'a' }), feature({ id: 'b' })], [removed, kept]);

		const result = removeRelation(map, removed);

		expect(result.relations).toEqual([kept]);
		expect(map.relations).toHaveLength(2);
	});

	it('lässt die Karte inhaltlich unverändert, wenn die Beziehung nicht existiert', () => {
		const map = mapWith(
			[feature({ id: 'a' }), feature({ id: 'b' })],
			[{ from: 'a', to: 'b', type: 'relates' }]
		);

		const result = removeRelation(map, { from: 'a', to: 'b', type: 'requires' });

		expect(result.relations).toEqual(map.relations);
	});
});

describe('relationsOf', () => {
	it('liefert ausgehende und eingehende Beziehungen getrennt', () => {
		const outgoing: Relation = { from: 'sso', to: 'login', type: 'requires' };
		const incoming: Relation = { from: 'export', to: 'sso', type: 'relates' };
		const unrelated: Relation = { from: 'export', to: 'login', type: 'relates' };
		const map = mapWith(
			[feature({ id: 'sso' }), feature({ id: 'login' }), feature({ id: 'export' })],
			[outgoing, incoming, unrelated]
		);

		const result = relationsOf(map, 'sso');

		expect(result.outgoing).toEqual([outgoing]);
		expect(result.incoming).toEqual([incoming]);
	});

	it('liefert leere Listen für ein Feature ohne Beziehungen', () => {
		const map = mapWith([feature({ id: 'einsam' })]);

		const result = relationsOf(map, 'einsam');

		expect(result.outgoing).toEqual([]);
		expect(result.incoming).toEqual([]);
	});
});

describe('quadrantOf', () => {
	// Revier-Ableitung (features/F-02-domaenenmodell.md, Abschnitt „Revier-Ableitung";
	// features/README.md, Präzisierung 1): hoherNutzen = impact >= domainMax/2,
	// hoherAufwand = effort >= domainMax/2.
	//
	// Quadranten-Semantik (PRD 5.3): oben links = niedrig Effort/hoch Impact = quickWins,
	// oben rechts = hoch/hoch = grosseVorhaben, unten links = niedrig/niedrig = nebenbei,
	// unten rechts = hoch Effort/niedrig Impact = vermeiden.

	it('ordnet hohen Impact und niedrigen Effort quickWins zu (obere linke Ecke)', () => {
		expect(quadrantOf({ impact: 21, effort: 1 }, 21)).toBe('quickWins');
	});

	it('ordnet hohen Impact und hohen Effort grosseVorhaben zu (obere rechte Ecke)', () => {
		expect(quadrantOf({ impact: 21, effort: 21 }, 21)).toBe('grosseVorhaben');
	});

	it('ordnet niedrigen Impact und niedrigen Effort nebenbei zu (untere linke Ecke)', () => {
		expect(quadrantOf({ impact: 1, effort: 1 }, 21)).toBe('nebenbei');
	});

	it('ordnet niedrigen Impact und hohen Effort vermeiden zu (untere rechte Ecke)', () => {
		expect(quadrantOf({ impact: 1, effort: 21 }, 21)).toBe('vermeiden');
	});

	// Exakt auf der Schwelle: Formel verwendet >=, die Schwelle selbst zählt als „hoch".
	it('behandelt einen Wert exakt auf der Schwelle als hoch (beide Achsen)', () => {
		expect(quadrantOf({ impact: 10, effort: 10 }, 20)).toBe('grosseVorhaben');
	});

	it('behandelt einen Impact exakt auf der Schwelle bei niedrigem Effort als quickWins', () => {
		expect(quadrantOf({ impact: 10, effort: 9 }, 20)).toBe('quickWins');
	});

	it('behandelt einen Effort exakt auf der Schwelle bei niedrigem Impact als vermeiden', () => {
		expect(quadrantOf({ impact: 9, effort: 10 }, 20)).toBe('vermeiden');
	});

	it('behandelt Werte knapp unter der Schwelle auf beiden Achsen als nebenbei', () => {
		expect(quadrantOf({ impact: 9, effort: 9 }, 20)).toBe('nebenbei');
	});
});
