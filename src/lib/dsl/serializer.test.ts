// F-06 · DSL-Serializer — Unit-Tests für serialize().
// Quellen: features/F-06-dsl-serializer.md (Abschnitte „Ausgabeform", „Akzeptanzkriterien",
// „Tests"), PRD.md Abschnitt 4.6 (DSL-10 bis DSL-14), PRD 9 (AK-03, AK-04, AK-05),
// features/README.md („Zwei Präzisierungen gegenüber den Quellen", Nr. 2: Sortierung der
// Beziehungen im Export).
//
// Tests prüfen ausschließlich das beobachtbare Verhalten von serialize() (FeatureMap → Text),
// nie eine innere Zerlegung (features/README.md, Regeln für den Test-Agenten: „Tests prüfen
// beobachtbares Verhalten, nicht die innere Umsetzung"). Für den Round-Trip (DSL-14) wird der
// echte Parser aus ./parser.ts verwendet, nicht behauptet.
//
// Kein E2E-Test: F-06 hat keine Oberfläche (Export-Dialog ist F-19, „Nicht Teil dieses
// Features"). F-05 (ebenfalls reiner ACL-Baustein ohne Oberfläche) wurde aus demselben Grund
// ohne e2e/F-05-*.spec.ts abgenommen — dieselbe Einordnung gilt hier.
//
// Zwei Beobachtungen zu widersprüchlichen bzw. unterspezifizierten Stellen in den Quellen
// (siehe Abschlussbericht an den Orchestrator für Details):
//
// 1. Die Beispielausgabe im Abschnitt „Ausgabeform" von F-06 zeigt bei drei Features mit
//    einstelligen impact-Werten (5, 3, 8) trotzdem zwei Leerzeichen zwischen dem Komma und
//    „effort=" („impact=5,  effort=5"). Der Fließtext direkt darüber benennt den Trenner
//    dagegen wörtlich als `, ` (Komma, ein Leerzeichen) und beschreibt die Ausrichtung als
//    rechtsbündiges Auffüllen des *Nutzenwerts selbst* — das platzierte Leerzeichen läge damit
//    vor dem Komma, nicht dahinter. Beide Lesarten ergeben unterschiedliche Bytes. Zusätzlich
//    referenzieren die Beziehungszeilen des Beispiels Features („api", „rollen", „sso"), die im
//    gezeigten Feature-Block gar nicht definiert sind — das Beispiel ist also ohnehin kein
//    lauffähiges, in sich konsistentes Dokument, sondern nur eine Stil-Illustration. Diese
//    Tests prüfen deshalb die eindeutig aus dem Regeltext ableitbaren Eigenschaften (Werte
//    korrekt, „effort="-Spalte fluchtet exakt, kein Leerzeichen zwischen Bezeichner und Wert),
//    legen sich aber nicht auf die exakte Platzierung des Auffüll-Leerzeichens relativ zum
//    Komma fest.
// 2. Die feste Struktur (DSL-10) nennt immer Kopfzeile, Leerzeile, Feature-Block, Leerzeile,
//    Beziehungs-Block. Eine Karte mit Features, aber ohne Beziehungen, ist von den Quellen
//    nicht explizit benannt. Aus „Datei endet mit genau einem Zeilenumbruch" (DSL-10) und der
//    AK für die leere Karte („featuremap v1" gefolgt von *einem* Zeilenumbruch, ohne
//    Leerzeilen für die beiden leeren Blöcke) folgt zwingend: eine Leerzeile trennt nur zwei
//    tatsächlich vorhandene Blöcke. Ein leerer Beziehungs-Block erzeugt keine führende
//    Leerzeile, sonst entstünden zwei Zeilenumbrüche am Dateiende. Das ist keine Auslegung,
//    sondern die einzige mit DSL-10 widerspruchsfreie Lesart, und wird unten getestet.

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model/types';
import type { Feature, FeatureMap, Relation, RelationType } from '../model/types';
import { serialize } from './serializer';
import { parse } from './parser';
import type { ParseResult } from './parser';

function feature(id: string, impact: number, effort: number, label?: string): Feature {
	return label === undefined ? { id, impact, effort } : { id, impact, effort, label };
}

function relation(from: string, to: string, type: RelationType, label?: string): Relation {
	return label === undefined ? { from, to, type } : { from, to, type, label };
}

function map(features: Feature[], relations: Relation[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

function expectOk(result: ParseResult): asserts result is { ok: true; map: FeatureMap } {
	expect(result.ok, result.ok ? '' : `unerwartete Fehler: ${JSON.stringify((result as { ok: false; errors: unknown }).errors)}`).toBe(
		true
	);
}

// ---------------------------------------------------------------------------------------------
// DSL-10 · feste Struktur, genau ein abschließender Zeilenumbruch
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-10 Struktur', () => {
	// AK: „Die Ausgabe einer leeren Karte ist featuremap v1 gefolgt von einem Zeilenumbruch."
	it('gibt für eine leere Karte genau „featuremap v1\\n" aus', () => {
		expect(serialize(map([], []))).toBe('featuremap v1\n');
	});

	// DSL-10: Kopfzeile, Leerzeile, Feature-Block, Leerzeile, Beziehungs-Block, genau ein
	// abschließender Zeilenumbruch.
	it('trennt Feature- und Beziehungsblock durch je eine Leerzeile und endet mit einem Zeilenumbruch', () => {
		const text = serialize(
			map(
				[feature('a', 1, 1), feature('b', 2, 2)],
				[relation('a', 'b', 'requires')]
			)
		);

		expect(text.endsWith('\n')).toBe(true);
		expect(text.endsWith('\n\n')).toBe(false);

		const lines = text.slice(0, -1).split('\n');
		expect(lines[0]).toBe('featuremap v1');
		expect(lines[1]).toBe('');
		expect(lines[2]).toMatch(/^a\s+:: /);
		expect(lines[3]).toMatch(/^b\s+:: /);
		expect(lines[4]).toBe('');
		expect(lines[5]).toBe('a --> b');
		expect(lines).toHaveLength(6);
	});

	// Ableitung aus DSL-10 (siehe Kommentar oben, Punkt 2): ein leerer Beziehungs-Block erzeugt
	// keine führende Leerzeile, sonst gäbe es zwei Zeilenumbrüche am Dateiende.
	it('hängt bei fehlenden Beziehungen keine Leerzeile und keinen Beziehungs-Block an', () => {
		const text = serialize(map([feature('a', 1, 1), feature('b', 2, 2)], []));

		expect(text.endsWith('\n')).toBe(true);
		expect(text.endsWith('\n\n')).toBe(false);

		const lines = text.slice(0, -1).split('\n');
		expect(lines[0]).toBe('featuremap v1');
		expect(lines[1]).toBe('');
		expect(lines).toHaveLength(4); // Kopfzeile, Leerzeile, zwei Feature-Zeilen.
	});

	it('verwendet ausschließlich \\n als Zeilentrenner, kein \\r', () => {
		const text = serialize(map([feature('a', 1, 1)], []));
		expect(text.includes('\r')).toBe(false);
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-11 · Sortierung der Features nach Zeichencode
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-11 Sortierung der Features', () => {
	it('sortiert Features aufsteigend nach Kennung über Zeichencode, nicht alphabetisch/lokal', () => {
		// Zeichencode: 'B'(66) < 'Z'(90) < '_'(95) < 'a'(97) — eine alphabetische oder
		// case-insensitive Sortierung ergäbe eine andere Reihenfolge.
		const text = serialize(
			map([
				feature('apple', 1, 1),
				feature('_hidden', 2, 2),
				feature('Zebra', 3, 3),
				feature('Banana', 4, 4)
			])
		);

		const ids = text
			.split('\n')
			.filter((l) => l.includes('::'))
			.map((l) => l.split(/[\s[]/)[0]);

		expect(ids).toEqual(['Banana', 'Zebra', '_hidden', 'apple']);
	});

	it('ist stabil gegenüber der Eingabereihenfolge im Array (identischer Inhalt, andere Reihenfolge → derselbe Text)', () => {
		const a = feature('a', 1, 1);
		const b = feature('b', 2, 2);
		const c = feature('c', 3, 3);

		expect(serialize(map([c, a, b]))).toBe(serialize(map([a, b, c])));
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-13 · Anzeigename nur bei Abweichung von der Kennung
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-13 Anzeigename', () => {
	// AK: „Ein Feature, dessen Anzeigename gleich seiner Kennung ist, wird ohne Klammerteil
	// ausgegeben."
	it('lässt den Klammerteil weg, wenn der Anzeigename der Kennung entspricht', () => {
		const text = serialize(map([feature('login', 1, 1, 'login')]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toMatch(/^login\s+:: /);
		expect(line).not.toContain('[');
	});

	it('lässt den Klammerteil weg, wenn kein Anzeigename existiert', () => {
		const text = serialize(map([feature('login', 1, 1)]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toMatch(/^login\s+:: /);
		expect(line).not.toContain('[');
	});

	it('gibt den Klammerteil aus, wenn der Anzeigename existiert und abweicht', () => {
		const text = serialize(map([feature('login', 1, 1, 'Benutzer-Login')]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toMatch(/^login\["Benutzer-Login"\]\s+:: /);
	});

	// Kennung ist case-sensitiv (features/README.md, Sprachtabelle) — ein Anzeigename, der sich
	// nur in Groß-/Kleinschreibung von der Kennung unterscheidet, weicht deshalb ab und wird
	// ausgegeben.
	it('behandelt Groß-/Kleinschreibung als Abweichung (Kennung ist case-sensitiv)', () => {
		const text = serialize(map([feature('Login', 1, 1, 'login')]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toContain('["login"]');
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-12 · Ausrichtung des Namensteils
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-12 Ausrichtung des Namensteils', () => {
	it('füllt den Namensteil mit Leerzeichen auf die Länge des längsten Namensteils im Dokument auf, gefolgt von " :: "', () => {
		// Namensteile: "a" (Länge 1), "bb" (Länge 2, Label == Kennung → kein Klammerteil),
		// "ccc[\"Lang\"]" (Länge 3 + 1 + 6 + 1 = 11 — der längste). Der Attributteil selbst wird
		// hier bewusst nur locker geprüft (siehe Kommentar am Dateianfang, Punkt 1); geprüft
		// wird ausschließlich der exakt aus DSL-12 ableitbare Namensteil samt Auffüllung.
		const text = serialize(
			map([feature('a', 1, 1), feature('bb', 2, 2, 'bb'), feature('ccc', 3, 3, 'Lang')])
		);
		const lines = text.split('\n').filter((l) => l.includes('::'));

		expect(lines[0]).toMatch(new RegExp(`^a${' '.repeat(10)} :: `));
		expect(lines[1]).toMatch(new RegExp(`^bb${' '.repeat(9)} :: `));
		expect(lines[2]).toMatch(/^ccc\["Lang"\] :: /);
	});

	it('padded nicht, wenn nur ein Feature vorhanden ist (Namensteil ist bereits der längste)', () => {
		const text = serialize(map([feature('einzeln', 4, 4)]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toMatch(/^einzeln :: impact=4,\s+effort=4$/);
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-12 · Ausrichtung der Attribute (nur die aus den Quellen eindeutig ableitbaren Teile,
// siehe Kommentar am Dateianfang, Punkt 1)
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-12 Ausrichtung der Attribute', () => {
	it('gibt impact und effort mit den richtigen Werten und Bezeichnern aus, ohne Leerzeichen zwischen Name und Wert', () => {
		const text = serialize(map([feature('a', 5, 13)]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		const attrs = line.split('::')[1];
		expect(attrs).toMatch(/^\s*impact=5,\s+effort=13\s*$/);
	});

	// DSL-12, Zweck laut Regeltext: „damit die Aufwandsspalte fluchtet" — unabhängig davon, ob
	// das Füll-Leerzeichen vor oder nach dem Komma steht (siehe Kommentar am Dateianfang),
	// muss „effort=" in jeder Zeile an derselben Spalte beginnen.
	it('richtet die effort-Spalte aus: „effort=" beginnt in jeder Feature-Zeile an derselben Spalte', () => {
		const text = serialize(
			map([feature('a', 5, 1), feature('b', 13, 2), feature('c', 100, 3)])
		);
		const lines = text.split('\n').filter((l) => l.includes('::'));

		const columns = lines.map((l) => l.indexOf('effort='));
		expect(columns.every((c) => c === columns[0])).toBe(true);
		expect(columns[0]).toBeGreaterThan(-1);
	});

	it('hängt an den letzten Wert einer Zeile (effort) keine Auffüll-Leerzeichen an', () => {
		const text = serialize(map([feature('a', 1, 3), feature('b', 1, 100)]));
		const lines = text.split('\n').filter((l) => l.includes('::'));
		for (const line of lines) {
			expect(line).toMatch(/\d$/);
		}
	});

	// AK-05: „Bei drei Features mit impact=5, effort=5 sind ... im Export stehen bei allen
	// dreien exakt 5/5."
	it('gibt bei mehreren Features mit identischen Werten überall exakt denselben Wert aus (AK-05)', () => {
		const text = serialize(
			map([feature('a', 5, 5), feature('b', 5, 5), feature('c', 5, 5)])
		);
		const lines = text.split('\n').filter((l) => l.includes('::'));
		for (const line of lines) {
			expect(line).toMatch(/impact=5,\s*effort=5$/);
		}
	});

	it('akzeptiert und reproduziert Werte außerhalb der Schätzreihe unverändert (DSL-04)', () => {
		const text = serialize(map([feature('a', 0, 50)]));
		const line = text.split('\n').find((l) => l.includes('::'))!;
		expect(line).toContain('impact=0');
		expect(line).toContain('effort=50');
	});
});

// ---------------------------------------------------------------------------------------------
// Beziehungszeilen: Pfeil-Mapping (PRD 4.3), Beschriftung
// ---------------------------------------------------------------------------------------------

describe('serialize — Beziehungszeilen', () => {
	it('gibt eine Beziehung ohne Beschriftung als "from --> to" aus (requires)', () => {
		const text = serialize(map([feature('a', 1, 1), feature('b', 1, 1)], [relation('a', 'b', 'requires')]));
		expect(text).toContain('a --> b');
	});

	it('gibt eine Beziehung mit Beschriftung als "from -->|"text"| to" ohne Leerzeichen zwischen Pfeil und "|" aus', () => {
		const text = serialize(
			map([feature('a', 1, 1), feature('b', 1, 1)], [relation('a', 'b', 'requires', 'nutzt Identität')])
		);
		expect(text).toContain('a -->|"nutzt Identität"| b');
	});

	it('mapped relates auf "-.->" (PRD 4.3)', () => {
		const text = serialize(map([feature('a', 1, 1), feature('b', 1, 1)], [relation('a', 'b', 'relates', 'x')]));
		expect(text).toContain('a -.->|"x"| b');
	});

	it('mapped excludes auf "--x" (PRD 4.3)', () => {
		const text = serialize(map([feature('a', 1, 1), feature('b', 1, 1)], [relation('a', 'b', 'excludes', 'x')]));
		expect(text).toContain('a --x|"x"| b');
	});
});

// ---------------------------------------------------------------------------------------------
// Sortierung der Beziehungen (features/README.md, „Zwei Präzisierungen", Nr. 2)
// ---------------------------------------------------------------------------------------------

describe('serialize — Sortierung der Beziehungen', () => {
	it('sortiert nach Quelle, dann nach Art in der Reihenfolge requires/relates/excludes, dann nach Ziel', () => {
		const features = [feature('a', 1, 1), feature('b', 1, 1), feature('c', 1, 1), feature('d', 1, 1)];
		// Bewusst in „falscher" Reihenfolge eingefügt (Art alphabetisch wäre
		// excludes/relates/requires — das Gegenteil der geforderten Reihenfolge) und mit
		// unsortierten Zielen je Quelle.
		const relations = [
			relation('b', 'c', 'excludes'),
			relation('a', 'd', 'excludes'),
			relation('a', 'c', 'relates'),
			relation('a', 'b', 'requires'),
			relation('b', 'a', 'requires')
		];

		const text = serialize(map(features, relations));
		const relationLines = text
			.split('\n')
			.filter((l) => l.includes('-->') || l.includes('-.->') || l.includes('--x'));

		expect(relationLines).toEqual(['a --> b', 'a -.-> c', 'a --x d', 'b --> a', 'b --x c']);
	});

	it('sortiert bei gleicher Quelle und Art aufsteigend nach Ziel über Zeichencode', () => {
		const features = [feature('a', 1, 1), feature('B', 1, 1), feature('_z', 1, 1), feature('m', 1, 1)];
		const relations = [
			relation('a', 'm', 'requires'),
			relation('a', '_z', 'requires'),
			relation('a', 'B', 'requires')
		];

		const text = serialize(map(features, relations));
		const relationLines = text.split('\n').filter((l) => l.includes('-->'));

		// Zeichencode: 'B'(66) < '_'(95) < 'm'(109).
		expect(relationLines).toEqual(['a --> B', 'a --> _z', 'a --> m']);
	});

	it('ist stabil gegenüber der Eingabereihenfolge im Array (identischer Inhalt, andere Reihenfolge → derselbe Text)', () => {
		const features = [feature('a', 1, 1), feature('b', 1, 1), feature('c', 1, 1)];
		const r1 = relation('a', 'b', 'requires');
		const r2 = relation('a', 'c', 'relates');

		expect(serialize(map(features, [r1, r2]))).toBe(serialize(map(features, [r2, r1])));
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-14 · Round-Trip-Garantie über echten Parser und Serializer
// ---------------------------------------------------------------------------------------------

describe('serialize — DSL-14 Round-Trip mit festen Beispielen', () => {
	// AK-04: „Zweifacher Export ohne zwischenzeitliche Änderung liefert byteidentischen Text."
	it('liefert bei zweifachem Export ohne Änderung byteidentischen Text (AK-04)', () => {
		const m = map(
			[feature('a', 3, 5, 'Erste Aufgabe'), feature('b', 8, 13)],
			[relation('a', 'b', 'requires', 'braucht')]
		);
		expect(serialize(m)).toBe(serialize(m));
	});

	// AK-03/DSL-14: Export → Import → Export ergibt byteidentischen Text — auch bei
	// Anzeigenamen mit Umlauten, Werten außerhalb der Schätzreihe und Features ohne
	// Anzeigenamen (Feature-Beschreibung, Abschnitt „Akzeptanzkriterien").
	it('ist round-trip-fest bei Umlauten im Anzeigenamen, Werten außerhalb der Schätzreihe und Features ohne Anzeigenamen', () => {
		const m = map(
			[
				feature('uebersicht', 4, 0, 'Übersicht äöü ÄÖÜ ß'),
				feature('ohne_label', 50, 100),
				feature('mit_label', 1, 1, 'Mit Label')
			],
			[
				relation('uebersicht', 'ohne_label', 'requires', 'benötigt Übersicht'),
				relation('mit_label', 'ohne_label', 'excludes')
			]
		);

		const first = serialize(m);
		const parsed = parse(first);
		expectOk(parsed);
		const second = serialize(parsed.map);

		expect(second).toBe(first);
	});

	it('ist round-trip-fest für die leere Karte', () => {
		const first = serialize(map([], []));
		const parsed = parse(first);
		expectOk(parsed);
		expect(serialize(parsed.map)).toBe(first);
	});

	it('ist round-trip-fest für eine Karte ohne Beziehungen', () => {
		const first = serialize(map([feature('a', 1, 1), feature('b', 2, 3)], []));
		const parsed = parse(first);
		expectOk(parsed);
		expect(serialize(parsed.map)).toBe(first);
	});
});

// ---------------------------------------------------------------------------------------------
// DSL-14 · eigenschaftsbasierter Round-Trip-Test über zufällig erzeugte Karten
// (features/F-06-dsl-serializer.md, Abschnitt „Tests")
// ---------------------------------------------------------------------------------------------

/** Deterministischer PRNG (mulberry32), damit fehlschlagende Läufe reproduzierbar bleiben. */
function mulberry32(seed: number): () => number {
	let state = seed;
	return function random() {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomInt(rng: () => number, min: number, max: number): number {
	return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, options: readonly T[]): T {
	return options[randomInt(rng, 0, options.length - 1)];
}

const ID_CHARS_FIRST = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const ID_CHARS_REST = ID_CHARS_FIRST + '0123456789-';

function randomId(rng: () => number, used: Set<string>): string {
	for (;;) {
		const length = randomInt(rng, 1, 10);
		let id = pick(rng, ID_CHARS_FIRST.split(''));
		for (let i = 1; i < length; i += 1) {
			id += pick(rng, ID_CHARS_REST.split(''));
		}
		if (!used.has(id)) {
			used.add(id);
			return id;
		}
	}
}

/** Anzeigename ohne Anführungszeichen/Zeilenumbruch (model/validation.ts verbietet beides), gelegentlich mit Umlauten. */
function randomLabel(rng: () => number, id: string): string | undefined {
	const choice = randomInt(rng, 0, 4);
	if (choice === 0) return undefined;
	if (choice === 1) return id; // entspricht der Kennung → wird beim Export weggelassen (DSL-13)
	const words = ['Übersicht', 'äöü Feature', 'Login', 'Gastzugang B', 'Straße', 'x', 'ß-Test'];
	return `${pick(rng, words)} ${randomInt(rng, 0, 99)}`;
}

function randomRelationLabel(rng: () => number): string | undefined {
	if (randomInt(rng, 0, 1) === 0) return undefined;
	const words = ['nutzt Identität', 'gemeinsame Events', 'widerspricht sich', 'benötigt', 'Übergang'];
	return pick(rng, words);
}

function randomMap(rng: () => number): FeatureMap {
	const featureCount = randomInt(rng, 0, 8);
	const used = new Set<string>();
	const features: Feature[] = [];
	for (let i = 0; i < featureCount; i += 1) {
		const id = randomId(rng, used);
		features.push(feature(id, randomInt(rng, 0, 50), randomInt(rng, 0, 50), randomLabel(rng, id)));
	}

	const relations: Relation[] = [];
	const relationTriples = new Set<string>();
	if (features.length >= 2) {
		const relationCount = randomInt(rng, 0, 6);
		let attempts = 0;
		while (relations.length < relationCount && attempts < relationCount * 10 + 10) {
			attempts += 1;
			const from = pick(rng, features).id;
			let to = pick(rng, features).id;
			if (to === from) continue;
			const type = pick<RelationType>(rng, ['requires', 'relates', 'excludes']);
			const key = `${from} ${to} ${type}`;
			if (relationTriples.has(key)) continue;
			relationTriples.add(key);
			relations.push(relation(from, to, type, randomRelationLabel(rng)));
		}
	}

	return map(features, relations);
}

// Ein Anzeigename, der der Kennung entspricht, wird beim Export ohne Klammerteil ausgegeben
// (DSL-13) und ist danach von „kein Anzeigename gesetzt" nicht mehr unterscheidbar — keine
// Quelle verlangt diese Unterscheidbarkeit über die Rundreise hinweg. Freigegeben vom
// Orchestrator (features/STATUS.md, „Entscheidungen des Orchestrators").
function tupleOf(f: Feature): string {
	const label = f.label === undefined || f.label === f.id ? null : f.label;
	return JSON.stringify([f.id, f.impact, f.effort, label]);
}

function relationTupleOf(r: Relation): string {
	return JSON.stringify([r.from, r.to, r.type, r.label ?? null]);
}

describe('serialize — DSL-14 eigenschaftsbasierter Round-Trip', () => {
	for (let seed = 1; seed <= 30; seed += 1) {
		it(`Export → Import → Export ist byteidentisch (Seed ${seed})`, () => {
			const rng = mulberry32(seed * 2654435761);
			const original = randomMap(rng);

			const firstText = serialize(original);
			const parsed = parse(firstText);
			expectOk(parsed);
			const secondText = serialize(parsed.map);

			expect(secondText).toBe(firstText);

			// Zusätzlich (AK-03): der Inhalt bleibt über die Rundreise erhalten, unabhängig von
			// der Array-Reihenfolge.
			const originalFeatures = new Set(original.features.map(tupleOf));
			const reparsedFeatures = new Set(parsed.map.features.map(tupleOf));
			expect(reparsedFeatures).toEqual(originalFeatures);

			const originalRelations = new Set(original.relations.map(relationTupleOf));
			const reparsedRelations = new Set(parsed.map.relations.map(relationTupleOf));
			expect(reparsedRelations).toEqual(originalRelations);
		});
	}
});
