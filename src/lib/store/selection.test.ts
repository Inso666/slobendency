// F-03 · Kartenstore und Kommandos — Unit-Tests für selection.ts.
// Quelle: features/F-03-kartenstore.md, Abschnitte „Umfang" und „Fachregeln"; PRD.md
// FR-13, FR-46. Kommandos in mapStore.ts, die selectedId/connectSource ebenfalls anfassen
// (deleteFeature, renameFeatureId, loadMap), sind in mapStore.test.ts geprüft.
//
// F-16 · features/F-16-verbindungsvorgang.md, Abschnitt „Tests": „Unit: Zustandsmaschine des
// Vorgangs (leer → Start gesetzt → Dialog → angelegt beziehungsweise abgebrochen)." Die vier
// Zustände werden über connectSource/connectTarget nachgestellt:
//   leer            connectSource = null,        connectTarget = null
//   Start gesetzt   connectSource = <id>,         connectTarget = null
//   Dialog          connectSource = <id>,         connectTarget = <andere id>
//   angelegt/abgebrochen  cancelConnection() aus jedem der drei laufenden Zustände heraus
// (F-16, Ablauf Schritt 5 und Abschnitt „Abbruch"). handleEscape() prüft zusätzlich FR-13
// gegen FR-46 ab: erst ESC bricht einen laufenden Vorgang ab, erst ein zweites ESC ohne
// zwischenzeitlich neu gesetzten Start hebt die Selektion auf (F-16, Abschnitt „Abbruch").

import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	cancelConnection,
	clearSelection,
	connectSource,
	connectTarget,
	handleEscape,
	highlightMode,
	selectedId
} from './selection';

describe('clearSelection', () => {
	// F-03 „Umfang": „clearSelection(): void; // hebt Selektion und Verbindungsvorgang auf".
	// highlightMode ist kein Teil der „Selektion" im Sinn dieses Kommandos (eigener,
	// dauerhafter Umschalter, FR-44) und bleibt deshalb unverändert.
	it('setzt selectedId und connectSource auf null, lässt highlightMode unverändert', () => {
		selectedId.set('login');
		connectSource.set('sso');
		highlightMode.set('direct');

		clearSelection();

		expect(get(selectedId)).toBeNull();
		expect(get(connectSource)).toBeNull();
		expect(get(highlightMode)).toBe('direct');
	});

	it('bleibt ohne laufende Selektion oder Verbindungsvorgang wirkungslos', () => {
		selectedId.set(null);
		connectSource.set(null);

		clearSelection();

		expect(get(selectedId)).toBeNull();
		expect(get(connectSource)).toBeNull();
	});
});

describe('cancelConnection', () => {
	// F-16-AK „ESC bricht den laufenden Vorgang ab, ohne die Selektion zu verlieren" —
	// cancelConnection() ist der gemeinsame Baustein dafür (Knopf "Abbrechen" im Hinweisband,
	// im Dialog, sowie die erste ESC-Stufe aus handleEscape()). Zustand "Start gesetzt".
	it('leert connectSource im Zustand "Start gesetzt", lässt die Selektion unangetastet', () => {
		selectedId.set('rollen');
		connectSource.set('rollen');
		connectTarget.set(null);

		cancelConnection();

		expect(get(connectSource)).toBeNull();
		expect(get(connectTarget)).toBeNull();
		expect(get(selectedId)).toBe('rollen');
	});

	// F-16, Ablauf Schritt 3/4: Zustand "Dialog" — Start und Ziel bereits gesetzt.
	it('leert connectSource und connectTarget im Zustand "Dialog", lässt die Selektion unangetastet', () => {
		selectedId.set('rollen');
		connectSource.set('rollen');
		connectTarget.set('sso');

		cancelConnection();

		expect(get(connectSource)).toBeNull();
		expect(get(connectTarget)).toBeNull();
		expect(get(selectedId)).toBe('rollen');
	});

	// F-16, Ablauf Schritt 5: "Nach dem Anlegen wird connectSource geleert" — derselbe Baustein
	// beendet den Vorgang auch im Erfolgsfall (RelationDialog ruft ihn nach erfolgreichem
	// createRelation auf).
	it('beendet den Vorgang ebenso nach erfolgreichem Anlegen einer Beziehung', () => {
		selectedId.set(null);
		connectSource.set('rollen');
		connectTarget.set('sso');

		cancelConnection();

		expect(get(connectSource)).toBeNull();
		expect(get(connectTarget)).toBeNull();
	});

	it('bleibt im Zustand "leer" wirkungslos', () => {
		selectedId.set('rollen');
		connectSource.set(null);
		connectTarget.set(null);

		cancelConnection();

		expect(get(connectSource)).toBeNull();
		expect(get(connectTarget)).toBeNull();
		expect(get(selectedId)).toBe('rollen');
	});
});

describe('handleEscape', () => {
	// F-16, Abschnitt "Abbruch": "ESC — bricht zuerst den Verbindungsvorgang ab, erst ein
	// zweites ESC hebt die Selektion auf." Nachzuholender Test aus features/STATUS.md
	// (Anmerkung zu F-16): in F-11 mangels Oberfläche für einen laufenden Verbindungsvorgang
	// nicht fahrbar, jetzt über den reinen Zustand nachgestellt. Zustand "Start gesetzt".
	it('bricht im Zustand "Start gesetzt" nur den Vorgang ab und lässt die Selektion unangetastet', () => {
		selectedId.set('rollen');
		connectSource.set('rollen');
		connectTarget.set(null);

		handleEscape();

		expect(get(connectSource)).toBeNull();
		expect(get(selectedId)).toBe('rollen');
	});

	// Dieselbe erste Stufe im Zustand "Dialog" (Start und Ziel bereits gesetzt).
	it('bricht im Zustand "Dialog" nur den Vorgang ab (Start und Ziel) und lässt die Selektion unangetastet', () => {
		selectedId.set('rollen');
		connectSource.set('rollen');
		connectTarget.set('sso');

		handleEscape();

		expect(get(connectSource)).toBeNull();
		expect(get(connectTarget)).toBeNull();
		expect(get(selectedId)).toBe('rollen');
	});

	// Zweite Stufe: ohne laufenden Vorgang hebt derselbe Aufruf die Selektion auf (FR-46).
	it('hebt im Zustand "leer" die Selektion auf', () => {
		selectedId.set('rollen');
		connectSource.set(null);
		connectTarget.set(null);

		handleEscape();

		expect(get(selectedId)).toBeNull();
	});

	// F-16-AK vollständig: zwei aufeinanderfolgende ESC — erst der Vorgang, dann die Selektion.
	it('hebt bei zwei aufeinanderfolgenden Aufrufen erst den Vorgang, dann die Selektion auf', () => {
		selectedId.set('rollen');
		connectSource.set('rollen');
		connectTarget.set(null);

		handleEscape();
		expect(get(connectSource)).toBeNull();
		expect(get(selectedId)).toBe('rollen');

		handleEscape();
		expect(get(selectedId)).toBeNull();
	});

	it('bleibt im Zustand "leer" ohne Selektion wirkungslos', () => {
		selectedId.set(null);
		connectSource.set(null);
		connectTarget.set(null);

		handleEscape();

		expect(get(selectedId)).toBeNull();
		expect(get(connectSource)).toBeNull();
	});
});
