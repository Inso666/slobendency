// F-03 · Kartenstore und Kommandos — Unit-Tests für mapStore.ts.
// Quellen: features/F-03-kartenstore.md (Abschnitte „Fachregeln", „Akzeptanzkriterien",
// „Tests"), PRD.md (FR-73, FR-24, FR-13, FR-46, INT-01 … INT-07), features/README.md
// (Leitplanke 2: unveränderliches Aggregat; Leitplanke 3: Kommandos rufen ausschließlich
// Aggregatsoperationen auf, statt eigene Regeln durchzusetzen).
//
// Kommandos, die scheitern können, geben laut F-03 „Umfang" das Result aus F-02 unverändert
// weiter. Die hier erwarteten Regelcodes (INT-01 … INT-07, FIELD, NOT_FOUND) stammen aus der
// bereits gemergten src/lib/model/validation.ts und sind deshalb kein Ratewerk, sondern die
// unmittelbare Konsequenz aus Konvention 3.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, type Readable } from 'svelte/store';
import { SCHEMA_VERSION } from '../model/types';
import type { Feature, FeatureMap, Relation } from '../model/types';
import type { Result } from '../model/validation';
import {
	createFeature,
	createRelation,
	deleteFeature,
	deleteRelation,
	editFeature,
	editRelation,
	featureCount,
	loadMap,
	map,
	relationCount,
	renameFeatureId,
	resetMap,
	selectedFeature
} from './mapStore';
import { connectSource, highlightMode, selectedId } from './selection';

function feature(overrides: Partial<Feature> = {}): Feature {
	return { id: 'login', label: 'Benutzer-Login', impact: 8, effort: 3, ...overrides };
}

function relation(overrides: Partial<Relation> = {}): Relation {
	return { from: 'sso', to: 'login', type: 'requires', ...overrides };
}

function mapFixture(features: Feature[], relations: Relation[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

function expectRejected(result: Result<unknown>, rule: string, field?: string): void {
	expect(result.ok).toBe(false);
	if (result.ok) return;
	const match = result.errors.some(
		(e) => e.rule === rule && (field === undefined || e.field === field)
	);
	expect(
		match,
		`erwartete Regel "${rule}"${field ? ` auf Feld "${field}"` : ''}, erhielt ${JSON.stringify(result.errors)}`
	).toBe(true);
}

/** Zählt, wie oft ein Readable seit dem Abonnieren einen Wert gemeldet hat (inkl. des
 * sofortigen Erstaufrufs beim Abonnieren selbst). */
function countUpdates(store: Readable<unknown>): () => number {
	let calls = 0;
	store.subscribe(() => {
		calls += 1;
	});
	return () => calls;
}

beforeEach(() => {
	// highlightMode ist reiner Sitzungszustand ohne Kommando, das ihn zurücksetzt — direktes
	// Zurücksetzen ist deshalb hier zulässig und keine Umgehung eines Store-Kommandos.
	highlightMode.set('transitive');
});

describe('loadMap', () => {
	// AK: „loadMap ersetzt die Karte vollständig und hebt Selektion und Verbindungsvorgang
	// auf." Ausgangszustand hat eigene Daten und eine laufende Selektion/Verbindung, damit
	// der vollständige Ersatz beobachtbar ist.
	it('ersetzt die Karte vollständig und hebt Selektion und Verbindungsvorgang auf', () => {
		loadMap(mapFixture([feature({ id: 'alt' })]));
		selectedId.set('alt');
		connectSource.set('alt');

		const next = mapFixture([feature({ id: 'neu', impact: 5, effort: 13 })]);
		loadMap(next);

		expect(get(map)).toEqual(next);
		expect(get(selectedId)).toBeNull();
		expect(get(connectSource)).toBeNull();
	});
});

describe('resetMap', () => {
	// F-03 „Umfang": resetMap() → „leere Karte".
	it('leert Features und Beziehungen der Karte', () => {
		loadMap(mapFixture([feature()], []));

		resetMap();

		expect(get(map)).toEqual(mapFixture([], []));
	});
});

describe('createFeature', () => {
	// AK: „Ein Abonnent des Stores erhält nach jedem erfolgreichen Kommando genau eine
	// Aktualisierung mit der neuen Karte." Fachregel: „Jede Datenänderung wirkt sofort auf
	// alle Abnehmer" (FR-24) — deshalb zwei unabhängige Abonnenten.
	it('fügt ein gültiges Feature hinzu und benachrichtigt jeden Abonnenten genau einmal', () => {
		loadMap(mapFixture([]));
		const calls1 = countUpdates(map);
		const calls2 = countUpdates(map);

		const result = createFeature(feature());

		expect(result.ok).toBe(true);
		expect(get(map).features).toEqual([feature()]);
		expect(calls1()).toBe(2);
		expect(calls2()).toBe(2);
	});

	// AK-06: featureCount entspricht dem Karteninhalt.
	it('erhöht featureCount nach erfolgreichem Anlegen', () => {
		loadMap(mapFixture([]));

		createFeature(feature());

		expect(get(featureCount)).toBe(1);
	});

	// AK: „Ein fehlgeschlagenes Kommando löst keine Aktualisierung aus und lässt die Karte
	// unverändert." INT-01: Kennung ist mapweit eindeutig.
	it('lehnt eine bereits vergebene Kennung ab, ohne Abonnenten zu benachrichtigen (INT-01)', () => {
		const start = mapFixture([feature({ id: 'login' })]);
		loadMap(start);
		const calls = countUpdates(map);

		const result = createFeature(feature({ id: 'login', impact: 1, effort: 1 }));

		expectRejected(result, 'INT-01', 'id');
		expect(get(map)).toEqual(start);
		expect(calls()).toBe(1);
	});

	// INT-07: impact/effort sind nicht-negative Ganzzahlen. Konvention 3: Der Store setzt
	// keine eigenen Regeln durch, sondern reicht die Regel des Aggregats unverändert weiter.
	it('lehnt einen negativen impact ab, ohne die Karte zu verändern (INT-07)', () => {
		const start = mapFixture([]);
		loadMap(start);

		const result = createFeature(feature({ impact: -1 }));

		expectRejected(result, 'INT-07', 'impact');
		expect(get(map)).toEqual(start);
	});

	// Feldregel für die Kennung (PRD 3.1: „Zeichensatz [A-Za-z0-9_-]+").
	it('lehnt eine Kennung mit unzulässigem Zeichen ab, ohne die Karte zu verändern', () => {
		const start = mapFixture([]);
		loadMap(start);

		const result = createFeature(feature({ id: 'login mit leerzeichen' }));

		expectRejected(result, 'FIELD', 'id');
		expect(get(map)).toEqual(start);
	});
});

describe('editFeature', () => {
	it('ändert ein bestehendes Feature und benachrichtigt Abonnenten genau einmal', () => {
		loadMap(mapFixture([feature({ id: 'login', impact: 8, effort: 3 })]));
		const calls = countUpdates(map);

		const result = editFeature('login', { impact: 13 });

		expect(result.ok).toBe(true);
		expect(get(map).features).toEqual([feature({ id: 'login', impact: 13, effort: 3 })]);
		expect(calls()).toBe(2);
	});

	it('lehnt eine unbekannte Kennung ab, ohne die Karte zu verändern', () => {
		const start = mapFixture([feature({ id: 'login' })]);
		loadMap(start);
		const calls = countUpdates(map);

		const result = editFeature('unbekannt', { impact: 1 });

		expect(result.ok).toBe(false);
		expect(get(map)).toEqual(start);
		expect(calls()).toBe(1);
	});

	// INT-07 gilt auch für die Änderung eines bestehenden Features.
	it('lehnt einen negativen effort in der Änderung ab, ohne die Karte zu verändern (INT-07)', () => {
		const start = mapFixture([feature({ id: 'login', impact: 8, effort: 3 })]);
		loadMap(start);

		const result = editFeature('login', { effort: -1 });

		expectRejected(result, 'INT-07', 'effort');
		expect(get(map)).toEqual(start);
	});
});

describe('renameFeatureId', () => {
	// AK: „renameFeatureId auf das selektierte Feature setzt selectedId auf die neue
	// Kennung." INT-06: Referenzen in relations werden mitgezogen.
	it('benennt die Kennung um, zieht relations nach (INT-06) und zieht die Selektion nach', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })], [relation()]));
		selectedId.set('login');

		const result = renameFeatureId('login', 'userLogin');

		expect(result.ok).toBe(true);
		expect(get(map).features.map((f) => f.id)).toEqual(['userLogin', 'sso']);
		expect(get(map).relations).toEqual([relation({ to: 'userLogin' })]);
		expect(get(selectedId)).toBe('userLogin');
	});

	// Fachregel gilt nur für das selektierte Feature — eine Umbenennung ohne Bezug zur
	// aktuellen Selektion lässt selectedId unangetastet.
	it('lässt selectedId unverändert, wenn ein anderes Feature umbenannt wird', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]));
		selectedId.set('sso');

		renameFeatureId('login', 'userLogin');

		expect(get(selectedId)).toBe('sso');
	});

	// INT-01: Zielkennung darf nicht bereits vergeben sein.
	it('lehnt eine bereits vergebene Zielkennung ab, ohne die Karte zu verändern (INT-01)', () => {
		const start = mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]);
		loadMap(start);

		const result = renameFeatureId('login', 'sso');

		expectRejected(result, 'INT-01', 'id');
		expect(get(map)).toEqual(start);
	});

	it('lehnt eine unbekannte Ausgangskennung ab', () => {
		loadMap(mapFixture([feature({ id: 'login' })]));

		const result = renameFeatureId('unbekannt', 'neu');

		expect(result.ok).toBe(false);
	});
});

describe('deleteFeature', () => {
	// AK: „deleteFeature auf das selektierte Feature setzt selectedId auf null."
	it('hebt die Selektion auf, wenn das selektierte Feature gelöscht wird (FR-46)', () => {
		loadMap(mapFixture([feature({ id: 'login' })]));
		selectedId.set('login');

		deleteFeature('login');

		expect(get(selectedId)).toBeNull();
	});

	it('lässt die Selektion unverändert, wenn ein anderes Feature gelöscht wird', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]));
		selectedId.set('sso');

		deleteFeature('login');

		expect(get(selectedId)).toBe('sso');
	});

	// Fachregel: „Wird ein Feature gelöscht, das Start eines Verbindungsvorgangs ist, wird
	// der Vorgang abgebrochen" (PRD FR-13).
	it('bricht einen laufenden Verbindungsvorgang ab, wenn dessen Start gelöscht wird (FR-13)', () => {
		loadMap(mapFixture([feature({ id: 'login' })]));
		connectSource.set('login');

		deleteFeature('login');

		expect(get(connectSource)).toBeNull();
	});

	it('lässt einen laufenden Verbindungsvorgang unverändert, wenn ein anderes Feature gelöscht wird', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]));
		connectSource.set('sso');

		deleteFeature('login');

		expect(get(connectSource)).toBe('sso');
	});

	// INT-02: Löschen eines Features entfernt alle seine Beziehungen; AK-06: featureCount und
	// relationCount folgen dem Karteninhalt.
	it('entfernt ein Feature samt seiner Beziehungen (INT-02) und aktualisiert die Zähler', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })], [relation()]));

		deleteFeature('login');

		expect(get(map).features.map((f) => f.id)).toEqual(['sso']);
		expect(get(map).relations).toEqual([]);
		expect(get(featureCount)).toBe(1);
		expect(get(relationCount)).toBe(0);
	});
});

describe('createRelation', () => {
	it('legt eine gültige Beziehung an und benachrichtigt Abonnenten genau einmal', () => {
		loadMap(mapFixture([feature({ id: 'login' }), feature({ id: 'sso', impact: 5, effort: 13 })]));
		const calls = countUpdates(map);

		const result = createRelation(relation());

		expect(result.ok).toBe(true);
		expect(get(map).relations).toEqual([relation()]);
		expect(get(relationCount)).toBe(1);
		expect(calls()).toBe(2);
	});

	// INT-02: from/to müssen auf existierende Features verweisen.
	it('lehnt eine Beziehung auf ein unbekanntes Feature ab, ohne die Karte zu verändern (INT-02)', () => {
		const start = mapFixture([feature({ id: 'sso' })]);
		loadMap(start);

		const result = createRelation(relation());

		expectRejected(result, 'INT-02', 'to');
		expect(get(map)).toEqual(start);
	});

	// INT-03: keine Selbstreferenz.
	it('lehnt eine Beziehung eines Features auf sich selbst ab (INT-03)', () => {
		loadMap(mapFixture([feature({ id: 'login' })]));

		const result = createRelation(relation({ from: 'login', to: 'login' }));

		expectRejected(result, 'INT-03');
	});

	// INT-04: kein identisches Tripel doppelt.
	it('lehnt ein bereits vorhandenes Beziehungstripel ab (INT-04)', () => {
		const start = mapFixture(
			[feature({ id: 'login' }), feature({ id: 'sso', impact: 5, effort: 13 })],
			[relation()]
		);
		loadMap(start);

		const result = createRelation(relation());

		expectRejected(result, 'INT-04');
		expect(get(map)).toEqual(start);
	});
});

describe('editRelation', () => {
	it('ändert Label und Typ einer bestehenden Beziehung', () => {
		loadMap(
			mapFixture(
				[feature({ id: 'login' }), feature({ id: 'sso', impact: 5, effort: 13 })],
				[relation()]
			)
		);

		const result = editRelation(relation(), { label: 'nutzt Session' });

		expect(result.ok).toBe(true);
		expect(get(map).relations).toEqual([relation({ label: 'nutzt Session' })]);
	});

	it('lehnt die Änderung einer nicht vorhandenen Beziehung ab', () => {
		const start = mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]);
		loadMap(start);

		const result = editRelation(relation(), { label: 'x' });

		expect(result.ok).toBe(false);
		expect(get(map)).toEqual(start);
	});

	// Kantenbeschriftung max. 120 Zeichen (PRD NFR-23, src/lib/model/validation.ts).
	it('lehnt eine zu lange Kantenbeschriftung ab, ohne die Karte zu verändern', () => {
		const start = mapFixture(
			[feature({ id: 'login' }), feature({ id: 'sso', impact: 5, effort: 13 })],
			[relation()]
		);
		loadMap(start);

		const result = editRelation(relation(), { label: 'x'.repeat(121) });

		expectRejected(result, 'FIELD', 'label');
		expect(get(map)).toEqual(start);
	});
});

describe('deleteRelation', () => {
	it('entfernt eine bestehende Beziehung und aktualisiert relationCount', () => {
		loadMap(
			mapFixture(
				[feature({ id: 'login' }), feature({ id: 'sso', impact: 5, effort: 13 })],
				[relation()]
			)
		);

		deleteRelation(relation());

		expect(get(map).relations).toEqual([]);
		expect(get(relationCount)).toBe(0);
	});

	it('lässt die Karte unverändert, wenn die Beziehung nicht vorhanden ist', () => {
		const start = mapFixture([feature({ id: 'login' }), feature({ id: 'sso' })]);
		loadMap(start);

		deleteRelation(relation());

		expect(get(map)).toEqual(start);
	});
});

describe('featureCount und relationCount', () => {
	// AK-06: „featureCount und relationCount entsprechen jederzeit dem Karteninhalt." Prüfung
	// über eine Folge mehrerer Kommandos, nicht nur eines einzelnen.
	it('folgen jeder Kommandofolge aus Anlegen, Verknüpfen und Löschen', () => {
		loadMap(mapFixture([]));
		expect(get(featureCount)).toBe(0);
		expect(get(relationCount)).toBe(0);

		createFeature(feature({ id: 'login' }));
		createFeature(feature({ id: 'sso', impact: 5, effort: 13 }));
		expect(get(featureCount)).toBe(2);

		createRelation(relation());
		expect(get(relationCount)).toBe(1);

		deleteFeature('login');
		expect(get(featureCount)).toBe(1);
		expect(get(relationCount)).toBe(0);
	});
});

describe('selectedFeature', () => {
	// Abgeleiteter Store aus map und selectedId (F-03 „Umfang").
	it('liefert das Feature zur aktuellen Selektion oder null ohne Selektion', () => {
		loadMap(mapFixture([feature({ id: 'login' })]));
		expect(get(selectedFeature)).toBeNull();

		selectedId.set('login');
		expect(get(selectedFeature)).toEqual(feature({ id: 'login' }));

		selectedId.set(null);
		expect(get(selectedFeature)).toBeNull();
	});
});
