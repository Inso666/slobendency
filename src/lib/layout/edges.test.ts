// F-10 · Kanten und Signaturenkatalog — Unit-Tests für src/lib/layout/edges.ts.
// Quellen: features/F-10-kanten.md (Abschnitte „Umfang", „Signaturenkatalog", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (5.6, FR-45), features/README.md (Leitplanke 2).
//
// Die Kantengeometrie ist eine reine Rechenfunktion (F-10, Abschnitt „DDD-Einordnung") und
// deshalb ohne DOM testbar. Die Trimmwerte selbst (TRIM_SOURCE usw.) werden aus dem Modul
// importiert statt hartkodiert, damit die Tests eine Regel prüfen („um den vorgesehenen Wert
// gekürzt"), nicht eine konkret vorgerechnete Zahl.

import { describe, expect, it } from 'vitest';
import {
	TRIM_SOURCE,
	TRIM_TARGET,
	TRIM_TARGET_EXCLUDE,
	TRIM_TARGET_RING,
	layoutEdges,
	type EdgeGeometry
} from './edges';
import type { Placement } from './jitter';
import type { Relation, RelationType } from '../model/types';

function placement(id: string, x: number, y: number): Placement {
	return { id, x, y, anchorX: x, anchorY: y, jittered: false };
}

function relation(from: string, to: string, type: RelationType, label?: string): Relation {
	return { from, to, type, label };
}

function firstGeometry(relations: Relation[], placements: Placement[]): EdgeGeometry {
	const geometries = layoutEdges(relations, placements);
	return geometries[0];
}

describe('layoutEdges — Trimmwert je Zielart (F-10 „Tests": „Trimmwert je Zielart")', () => {
	// Waagerechte Strecke von (0,0) nach (100,0): die Trimmung wirkt hier ausschließlich auf
	// die x-Koordinate, was die erwarteten Werte unabhängig von der Winkelberechnung macht.
	const placements = [placement('a', 0, 0), placement('b', 100, 0)];

	it('kürzt eine requires-Kante am Ziel um TRIM_TARGET_RING, weil das Ziel den Ring trägt', () => {
		const g = firstGeometry([relation('a', 'b', 'requires')], placements);
		expect(g.x2).toBeCloseTo(100 - TRIM_TARGET_RING, 6);
		expect(g.y2).toBeCloseTo(0, 6);
	});

	it('kürzt eine relates-Kante am Ziel um TRIM_TARGET (nur Pfeilspitze, kein Ring)', () => {
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);
		expect(g.x2).toBeCloseTo(100 - TRIM_TARGET, 6);
	});

	it('kürzt eine excludes-Kante am Ziel um TRIM_TARGET_EXCLUDE, Platz für die x-Marke', () => {
		const g = firstGeometry([relation('a', 'b', 'excludes')], placements);
		expect(g.x2).toBeCloseTo(100 - TRIM_TARGET_EXCLUDE, 6);
	});

	it('kürzt die Quelle bei jeder Art gleich um TRIM_SOURCE', () => {
		for (const type of ['requires', 'relates', 'excludes'] as const) {
			const g = firstGeometry([relation('a', 'b', type)], placements);
			expect(g.x1, `Quelle bei ${type}`).toBeCloseTo(TRIM_SOURCE, 6);
			expect(g.y1, `Quelle bei ${type}`).toBeCloseTo(0, 6);
		}
	});
});

describe('layoutEdges — Trimmung an beiden Enden entlang einer schrägen Strecke', () => {
	// 3-4-5-Dreieck: Gesamtlänge 50, Richtungsvektor (0.6, 0.8) — eindeutig nachrechenbar ohne
	// Rundungsfallen.
	it('kürzt Quelle und Ziel entlang der Verbindungslinie, nicht achsenparallel', () => {
		const placements = [placement('a', 0, 0), placement('b', 30, 40)];
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);
		const ux = 30 / 50;
		const uy = 40 / 50;

		expect(g.x1).toBeCloseTo(ux * TRIM_SOURCE, 5);
		expect(g.y1).toBeCloseTo(uy * TRIM_SOURCE, 5);
		expect(g.x2).toBeCloseTo(30 - ux * TRIM_TARGET, 5);
		expect(g.y2).toBeCloseTo(40 - uy * TRIM_TARGET, 5);
	});
});

describe('layoutEdges — Beschriftungsposition (F-10 „Umfang")', () => {
	// „Die Beschriftung sitzt in der Mitte der Strecke, 8 Einheiten senkrecht nach oben
	// versetzt" — gilt für Kanten, die flacher als 45° verlaufen.
	it('setzt die Beschriftung mittig, 8 Einheiten nach oben versetzt, bei einer flachen Kante', () => {
		const placements = [placement('a', 0, 0), placement('b', 100, 20)]; // ≈ 11°, flacher als 45°
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);

		expect(g.labelAnchor).toBe('middle');
		expect(g.labelX).toBeCloseTo(50, 5);
		expect(g.labelY).toBeCloseTo(10 - 8, 5);
	});

	// „verläuft die Kante steiler als 45°, wird die Beschriftung stattdessen seitlich versetzt
	// und je nach Laufrichtung links- oder rechtsbündig gesetzt." Die genaue Versatzweite ist
	// nicht beziffert — geprüft wird nur, dass eine Randausrichtung verwendet wird und dass sie
	// von der Laufrichtung abhängt (beobachtbares Verhalten, keine erzwungene Umsetzung).
	it('richtet die Beschriftung bei einer steilen Kante links- oder rechtsbündig statt mittig aus', () => {
		const placements = [placement('a', 0, 0), placement('b', 20, 100)]; // ≈ 79°, steiler als 45°
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);

		expect(g.labelAnchor).not.toBe('middle');
		expect(['start', 'end']).toContain(g.labelAnchor);
	});

	it('kehrt die Randausrichtung um, wenn sich die Laufrichtung einer steilen Kante umkehrt', () => {
		const vorwaerts = [placement('a', 0, 0), placement('b', 20, 100)];
		const rueckwaerts = [placement('a', 20, 100), placement('b', 0, 0)];

		const gVor = firstGeometry([relation('a', 'b', 'relates')], vorwaerts);
		const gRueck = firstGeometry([relation('a', 'b', 'relates')], rueckwaerts);

		expect(gVor.labelAnchor).not.toBe('middle');
		expect(gRueck.labelAnchor).not.toBe('middle');
		expect(gVor.labelAnchor).not.toBe(gRueck.labelAnchor);
	});

	// Grenzfall exakt 45°: muss sich eindeutig für eine der beiden Regeln entscheiden, nicht
	// abstürzen oder einen dritten Wert liefern.
	it('liefert bei exakt 45° eine gültige, definierte Ausrichtung', () => {
		const placements = [placement('a', 0, 0), placement('b', 100, 100)];
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);
		expect(['start', 'middle', 'end']).toContain(g.labelAnchor);
	});
});

describe('layoutEdges — crossMark nur bei excludes (F-10 „Signaturenkatalog")', () => {
	const placements = [placement('a', 0, 0), placement('b', 100, 0)];

	it('liefert ein crossMark für eine excludes-Kante', () => {
		const g = firstGeometry([relation('a', 'b', 'excludes')], placements);
		expect(g.crossMark).toBeDefined();
		expect(Number.isFinite(g.crossMark?.x)).toBe(true);
		expect(Number.isFinite(g.crossMark?.y)).toBe(true);
		expect(Number.isFinite(g.crossMark?.angle)).toBe(true);
	});

	it('liefert kein crossMark für requires oder relates', () => {
		const gReq = firstGeometry([relation('a', 'b', 'requires')], placements);
		const gRel = firstGeometry([relation('a', 'b', 'relates')], placements);
		expect(gReq.crossMark).toBeUndefined();
		expect(gRel.crossMark).toBeUndefined();
	});
});

describe('layoutEdges — Kante der Länge nahe null bricht nicht (F-10 „Tests")', () => {
	// Zwei versetzte Features derselben Gruppe können praktisch deckungsgleich liegen, wenn der
	// Jitter-Radius sehr klein ausfällt. Die Richtung ist dann unbestimmt, das Ergebnis muss
	// trotzdem aus endlichen Zahlen bestehen statt NaN oder Infinity zu liefern.
	it('liefert endliche Koordinaten für zwei praktisch deckungsgleiche Punkte', () => {
		const placements = [placement('a', 50, 50), placement('b', 50.0001, 50.0001)];
		const g = firstGeometry([relation('a', 'b', 'relates')], placements);

		for (const value of [g.x1, g.y1, g.x2, g.y2, g.labelX, g.labelY]) {
			expect(Number.isFinite(value)).toBe(true);
		}
	});

	it('liefert für zwei exakt deckungsgleiche Punkte ebenfalls nur endliche Koordinaten', () => {
		const placements = [placement('a', 50, 50), placement('b', 50, 50)];
		const g = firstGeometry([relation('a', 'b', 'excludes')], placements);

		for (const value of [g.x1, g.y1, g.x2, g.y2, g.labelX, g.labelY]) {
			expect(Number.isFinite(value)).toBe(true);
		}
		if (g.crossMark) {
			expect(Number.isFinite(g.crossMark.x)).toBe(true);
			expect(Number.isFinite(g.crossMark.y)).toBe(true);
			expect(Number.isFinite(g.crossMark.angle)).toBe(true);
		}
	});
});

describe('layoutEdges — mehrere Kanten (F-10 AK: „Zwei Kanten zwischen demselben Paar mit verschiedener Art sind beide sichtbar")', () => {
	it('liefert für jede Relation genau ein EdgeGeometry, in derselben Reihenfolge', () => {
		const placements = [placement('a', 0, 0), placement('b', 100, 0), placement('c', 0, 100)];
		const relations = [
			relation('a', 'b', 'requires'),
			relation('a', 'b', 'relates'),
			relation('a', 'c', 'excludes')
		];

		const geometries = layoutEdges(relations, placements);
		expect(geometries).toHaveLength(3);
		expect(geometries.map((g) => g.relation)).toEqual(relations);
	});

	it('liefert für zwei verschiedene Arten zwischen demselben Paar unterschiedliche Zieltrimmung', () => {
		const placements = [placement('a', 0, 0), placement('b', 100, 0)];
		const relations = [relation('a', 'b', 'requires'), relation('a', 'b', 'excludes')];
		const [gRequires, gExcludes] = layoutEdges(relations, placements);

		expect(gRequires.x2).not.toBeCloseTo(gExcludes.x2, 3);
	});

	it('liefert eine leere Liste ohne Beziehungen', () => {
		const placements = [placement('a', 0, 0), placement('b', 100, 0)];
		expect(layoutEdges([], placements)).toEqual([]);
	});
});
