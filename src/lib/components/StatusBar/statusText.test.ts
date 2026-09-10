// F-23 · Fußleiste, Hinweise, Zurücksetzen — Unit-Tests für statusText.ts.
// Quellen: features/F-23-statuszeile.md (Abschnitte "Umfang", "Fachregeln", "Tests": "Unit:
// Formatierung der Felder, Auswahl des Zustandstextes je StorageState, Kursbildung."),
// PRD.md (FR-41, FR-42, FR-70, FR-71, FR-74, NFR-31, NFR-32, INT-05), features/README.md
// (Ubiquitous Language: "Kurs — requiresPath — Kette transitiver Vorbedingungen").
//
// Tests prüfen ausschließlich das beobachtbare Ergebnis der reinen Funktionen (Eingabe →
// Ergebnis), nie eine innere Zerlegung (CLAUDE.md, Regeln für den Test-Agenten).

import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../../model/types';
import type { Feature, FeatureMap, Relation } from '../../model/types';
import {
	courseText,
	cycleWarningText,
	formatSavedAt,
	inventoryText,
	saveStatusText
} from './statusText';

function buildMap(features: Feature[], relations: Relation[] = []): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features, relations };
}

describe('saveStatusText — Auswahl des Zustandstextes je StorageState (F-23, Abschnitt "Umfang", Zeile "Speicherzustand")', () => {
	// F-23-AK: "Nach einer Änderung wechselt der Speicherzustand auf 'Wird gespeichert …'."
	it('zeigt "Wird gespeichert …" während der Bündelungsfrist', () => {
		expect(saveStatusText({ saving: true, storageState: 'ready', lastSavedAt: null })).toEqual({
			text: 'Wird gespeichert …',
			warning: false
		});
	});

	// Die laufende Bündelungsfrist geht jedem gespeicherten Zustand vor — erst nach ihrem Ende
	// steht fest, ob der anstehende Schreibvorgang gelingt oder mit QuotaExceededError scheitert.
	it('lässt die Bündelungsfrist auch bei zuvor vollem Speicher Vorrang haben', () => {
		expect(
			saveStatusText({ saving: true, storageState: 'quotaExceeded', lastSavedAt: new Date() })
		).toEqual({ text: 'Wird gespeichert …', warning: false });
	});

	// F-23, Abschnitt "Umfang": "Gespeichert 12:04 aus lastSavedAt."
	it('zeigt "Gespeichert HH:MM" nach einem erfolgreichen Schreibvorgang', () => {
		const result = saveStatusText({
			saving: false,
			storageState: 'ready',
			lastSavedAt: new Date(2024, 0, 1, 9, 4)
		});
		expect(result).toEqual({ text: 'Gespeichert 09:04', warning: false });
	});

	// NFR-32: "läuft die App im Sitzungsmodus weiter und weist auf die fehlende Persistenz hin."
	it('zeigt den Sitzungsmodus-Hinweis bei storageState "unavailable"', () => {
		expect(
			saveStatusText({ saving: false, storageState: 'unavailable', lastSavedAt: null })
		).toEqual({ text: 'Nicht gespeichert — Sitzungsmodus', warning: false });
	});

	// F-23, Abschnitt "Umfang": "bei quotaExceeded 'Speicher voll' in --magenta." NFR-31.
	it('zeigt "Speicher voll" als Warnung bei storageState "quotaExceeded"', () => {
		const result = saveStatusText({
			saving: false,
			storageState: 'quotaExceeded',
			lastSavedAt: new Date(2024, 0, 1, 9, 4)
		});
		expect(result).toEqual({ text: 'Speicher voll', warning: true });
	});

	// Vor dem allerersten erfolgreichen Schreibvorgang einer Sitzung (Bündelungsfrist bereits
	// abgelaufen, aber noch nie erfolgreich geschrieben) ist noch nichts "gespeichert".
	it('zeigt "Wird gespeichert …" vor dem ersten erfolgreichen Schreibvorgang', () => {
		expect(saveStatusText({ saving: false, storageState: 'ready', lastSavedAt: null })).toEqual({
			text: 'Wird gespeichert …',
			warning: false
		});
	});

	// Derselbe Fall gilt unmittelbar nach der Wiederherstellung einer beschädigten Karte
	// (storageState "recovered", FR-74) — auch hier ist noch kein Schreibvorgang erfolgt.
	it('zeigt "Wird gespeichert …" bei storageState "recovered" ohne vorherigen Schreibvorgang', () => {
		expect(
			saveStatusText({ saving: false, storageState: 'recovered', lastSavedAt: null })
		).toEqual({ text: 'Wird gespeichert …', warning: false });
	});
});

describe('inventoryText — Formatierung des Bestand-Felds (F-23, Abschnitt "Umfang")', () => {
	// F-23, Abschnitt "Umfang": Beispiel "14 Features · 9 Beziehungen".
	it('formatiert Plural für Feature- und Beziehungszahl', () => {
		expect(inventoryText(14, 9)).toBe('14 Features · 9 Beziehungen');
	});

	// Deutsche Singular-/Pluralregel wie bereits in FeatureList.svelte (F-14): 1 → Singular.
	it('formatiert Singular für genau ein Feature und genau eine Beziehung', () => {
		expect(inventoryText(1, 1)).toBe('1 Feature · 1 Beziehung');
	});

	// 0 gilt in der deutschen Pluralregel als Plural, wie ebenfalls in FeatureList.svelte.
	it('formatiert Plural für eine leere Karte', () => {
		expect(inventoryText(0, 0)).toBe('0 Features · 0 Beziehungen');
	});

	// Singular und Plural werden unabhängig je Feld gewählt.
	it('wählt Singular und Plural unabhängig je Feld', () => {
		expect(inventoryText(1, 3)).toBe('1 Feature · 3 Beziehungen');
		expect(inventoryText(5, 1)).toBe('5 Features · 1 Beziehung');
	});
});

describe('cycleWarningText — Formatierung des Zyklen-Felds (INT-05, AK-08)', () => {
	// F-23, Abschnitt "Umfang": "Keine Zyklen".
	it('zeigt "Keine Zyklen" ohne Zyklus', () => {
		expect(cycleWarningText(0)).toBe('Keine Zyklen');
	});

	// F-23, Abschnitt "Umfang": "1 Zyklus-Warnung" (Singular).
	it('zeigt Singular "1 Zyklus-Warnung" bei genau einem Zyklus', () => {
		expect(cycleWarningText(1)).toBe('1 Zyklus-Warnung');
	});

	// F-23, Abschnitt "Umfang": "n Zyklus-Warnungen" (Plural ab 2).
	it('zeigt Plural "n Zyklus-Warnungen" bei mehreren Zyklen', () => {
		expect(cycleWarningText(2)).toBe('2 Zyklus-Warnungen');
		expect(cycleWarningText(5)).toBe('5 Zyklus-Warnungen');
	});
});

describe('formatSavedAt — Uhrzeitformat (F-23, Abschnitt "Umfang": "Gespeichert 12:04")', () => {
	it('formatiert Stunde und Minute jeweils zweistellig mit führender Null', () => {
		expect(formatSavedAt(new Date(2024, 0, 1, 0, 0))).toBe('00:00');
		expect(formatSavedAt(new Date(2024, 0, 1, 9, 4))).toBe('09:04');
		expect(formatSavedAt(new Date(2024, 0, 1, 23, 59))).toBe('23:59');
	});
});

describe('courseText — Kursbildung (F-23, Abschnitt "Umfang", Zeile "Kurs"; features/README.md: "Kurs — requiresPath")', () => {
	const rollenRechte: Feature = {
		id: 'rollen-rechte',
		label: 'Rollen & Rechte',
		impact: 13,
		effort: 8
	};
	const sso: Feature = { id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 };
	const login: Feature = { id: 'login', label: 'Benutzer-Login', impact: 8, effort: 3 };

	// F-23, Abschnitt "Umfang": "ohne Selektion leer."
	it('liefert einen leeren Kurs ohne Selektion', () => {
		const map = buildMap(
			[rollenRechte, sso, login],
			[
				{ from: rollenRechte.id, to: sso.id, type: 'requires' },
				{ from: sso.id, to: login.id, type: 'requires' }
			]
		);
		expect(courseText(map, null)).toBe('');
	});

	// F-23, Abschnitt "Umfang", Beispiel — wortgleich aus design/03-seekarte.html übernommen:
	// "Rollen & Rechte → Single Sign-On → Benutzer-Login" (AK-06-Kettenform aus F-07,
	// hier als Anzeigetext).
	it('bildet die vollständige transitive requires-Kette mit Anzeigenamen', () => {
		const map = buildMap(
			[rollenRechte, sso, login],
			[
				{ from: rollenRechte.id, to: sso.id, type: 'requires' },
				{ from: sso.id, to: login.id, type: 'requires' }
			]
		);
		expect(courseText(map, rollenRechte.id)).toBe(
			'Rollen & Rechte → Single Sign-On → Benutzer-Login'
		);
	});

	// FR-42 / F-07: relates und excludes werden nicht verfolgt — nur requires bildet eine
	// transitive Ordnung (PRD 3.2, "Begründung der Einschränkung").
	it('folgt ausschließlich requires-Kanten, nicht relates oder excludes', () => {
		const d: Feature = { id: 'd', label: 'Ohne Vorbedingung', impact: 1, effort: 1 };
		const map = buildMap([rollenRechte, d], [{ from: rollenRechte.id, to: d.id, type: 'relates' }]);
		expect(courseText(map, rollenRechte.id)).toBe('Rollen & Rechte');
	});

	// Ohne ausgehende requires-Kante besteht der Kurs nur aus dem selektierten Feature selbst
	// (Designentscheidung dieses Test-Agenten, siehe Kopfkommentar von statusText.ts).
	it('zeigt nur den Anzeigenamen des selektierten Features ohne ausgehende requires-Kante', () => {
		const map = buildMap([rollenRechte], []);
		expect(courseText(map, rollenRechte.id)).toBe('Rollen & Rechte');
	});

	// Ohne label fällt der Kurs auf die Kennung zurück (Ubiquitous Language, displayNameOf aus
	// FeatureList/listing.ts, F-14 — hier wiederverwendet statt erneut formuliert).
	it('fällt ohne label auf die Kennung zurück', () => {
		const ohneLabel: Feature = { id: 'ohne-label', impact: 1, effort: 1 };
		const map = buildMap([ohneLabel], []);
		expect(courseText(map, ohneLabel.id)).toBe('ohne-label');
	});

	// Verzweigung (mehrere ausgehende requires-Kanten): Designentscheidung dieses Test-Agenten
	// für Determinismus ohne Quellenvorgabe — dieselbe Tie-Break-Regel wie findRequiresCycles
	// (F-07): das alphabetisch kleinste Ziel gewinnt.
	it('folgt bei mehreren ausgehenden requires-Kanten dem alphabetisch kleinsten Ziel', () => {
		const y: Feature = { id: 'y', label: 'Y', impact: 1, effort: 1 };
		const x: Feature = { id: 'x', label: 'X', impact: 1, effort: 1 };
		const map = buildMap(
			[rollenRechte, x, y],
			[
				{ from: rollenRechte.id, to: y.id, type: 'requires' },
				{ from: rollenRechte.id, to: x.id, type: 'requires' }
			]
		);
		expect(courseText(map, rollenRechte.id)).toBe('Rollen & Rechte → X');
	});

	// Zyklusschutz wie requiresClosure (F-07): ein bereits besuchtes Feature bricht die Kette
	// ab, statt sie endlos fortzusetzen.
	it('bricht bei einem Zyklus ab, statt endlos zu wiederholen', () => {
		const map = buildMap(
			[rollenRechte, sso],
			[
				{ from: rollenRechte.id, to: sso.id, type: 'requires' },
				{ from: sso.id, to: rollenRechte.id, type: 'requires' }
			]
		);
		expect(courseText(map, rollenRechte.id)).toBe('Rollen & Rechte → Single Sign-On');
	});
});
