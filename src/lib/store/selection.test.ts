// F-03 · Kartenstore und Kommandos — Unit-Tests für selection.ts.
// Quelle: features/F-03-kartenstore.md, Abschnitte „Umfang" und „Fachregeln"; PRD.md
// FR-13, FR-46. Kommandos in mapStore.ts, die selectedId/connectSource ebenfalls anfassen
// (deleteFeature, renameFeatureId, loadMap), sind in mapStore.test.ts geprüft.

import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { clearSelection, connectSource, highlightMode, selectedId } from './selection';

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
