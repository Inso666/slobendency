// F-21 · PNG-Export — Unit-Tests für die reinen Hilfsfunktionen von png.ts
// (features/F-21-export-png.md, Abschnitte „Umfang", „Fachregeln", „Akzeptanzkriterien",
// „Tests": „Unit: Größenrechnung je Faktor, Hintergrundfüllung, Dateiname"), PRD.md (FR-64,
// FR-69, AK-11).
//
// downloadPng() selbst wird hier bewusst NICHT unit-getestet (siehe Kopfkommentar von png.ts) —
// vollständig abgedeckt in e2e/F-21-export-png.spec.ts.
//
// Tests prüfen ausschließlich beobachtbares Verhalten der drei reinen Funktionen (Eingabe
// hinein, Rückgabewert heraus), nie eine bestimmte interne Umsetzung
// (features/README.md, Regeln für den Test-Agenten).

import { describe, expect, it } from 'vitest';
import { pngBackgroundFill, pngCanvasSize, pngFilename, type PngOptions } from './png';

// -------------------------------------------------------------------------------------------
// pngCanvasSize — Größenrechnung je Faktor (F-21, Abschnitt „Ablauf" Schritt 3; AK-11).
// -------------------------------------------------------------------------------------------

describe('pngCanvasSize — Größenrechnung je Faktor (F-21, Ablauf Schritt 3)', () => {
	// F-21, Abschnitt „Ablauf" Schritt 3: „Canvas mit breite × faktor und höhe × faktor anlegen."
	it('multipliziert Breite und Höhe der viewBox mit dem Faktor 1', () => {
		expect(pngCanvasSize({ width: 868, height: 648 }, 1)).toEqual({ width: 868, height: 648 });
	});

	it('multipliziert Breite und Höhe der viewBox mit dem Faktor 2', () => {
		expect(pngCanvasSize({ width: 868, height: 648 }, 2)).toEqual({ width: 1736, height: 1296 });
	});

	it('multipliziert Breite und Höhe der viewBox mit dem Faktor 4', () => {
		expect(pngCanvasSize({ width: 868, height: 648 }, 4)).toEqual({ width: 3472, height: 2592 });
	});

	// AK-11: „Ein PNG bei 4× hat exakt die vierfache Pixelbreite gegenüber 1× (AK-11)." — hier auf
	// der reinen Größenrechnung geprüft; e2e/F-21-export-png.spec.ts prüft dasselbe Kriterium am
	// tatsächlich erzeugten Bild.
	it('liefert bei Faktor 4 exakt die vierfache Pixelbreite und -höhe gegenüber Faktor 1 (AK-11)', () => {
		const viewBox = { width: 731, height: 512 };
		const at1x = pngCanvasSize(viewBox, 1);
		const at4x = pngCanvasSize(viewBox, 4);
		expect(at4x.width).toBe(at1x.width * 4);
		expect(at4x.height).toBe(at1x.height * 4);
	});
});

// -------------------------------------------------------------------------------------------
// pngBackgroundFill — Hintergrundfüllung (F-21, Abschnitt „Ablauf" Schritt 4; FR-69).
// -------------------------------------------------------------------------------------------

describe('pngBackgroundFill — Hintergrundfüllung (F-21, Ablauf Schritt 4, FR-69)', () => {
	// FR-69: „PNG-Export mit weißem Hintergrund (Standard)." Weder options.transparent noch
	// options.theme gesetzt.
	it('liefert reines Weiß als Standard, ohne options.theme oder options.transparent', () => {
		const options: PngOptions = { scale: 1 };
		expect(pngBackgroundFill(options)).toBe('#ffffff');
	});

	// F-21, Abschnitt „Akzeptanzkriterien": „Standardmäßig ist der Hintergrund weiß; mit gesetzter
	// Option ist er durchsichtig."
	it('liefert null (durchsichtig), wenn options.transparent gesetzt ist', () => {
		const options: PngOptions = { scale: 1, transparent: true };
		expect(pngBackgroundFill(options)).toBeNull();
	});

	// F-21, Abschnitt „Ablauf" Schritt 4: „bei gewählter Nachttafel in deren --paper" —
	// wortgleich mit dem --paper-Token der Nachttafel aus src/app.css (#0d161a).
	it('liefert das --paper-Token der Nachttafel, wenn options.theme "dark" ist', () => {
		const options: PngOptions = { scale: 2, theme: 'dark' };
		expect(pngBackgroundFill(options)).toBe('#0d161a');
	});

	// transparent hat Vorrang vor der Tafel — ein transparenter Export bleibt transparent,
	// unabhängig von options.theme.
	it('liefert null, auch wenn zugleich options.theme "dark" gesetzt ist', () => {
		const options: PngOptions = { scale: 4, theme: 'dark', transparent: true };
		expect(pngBackgroundFill(options)).toBeNull();
	});

	// options.theme "light" verhält sich wie der Standard (kein options.theme).
	it('liefert reines Weiß bei options.theme "light"', () => {
		const options: PngOptions = { scale: 1, theme: 'light' };
		expect(pngBackgroundFill(options)).toBe('#ffffff');
	});
});

// -------------------------------------------------------------------------------------------
// pngFilename — Dateiname (F-21, Abschnitt „Ablauf" Schritt 5).
// -------------------------------------------------------------------------------------------

describe('pngFilename — Dateiname mit Faktor (F-21, Ablauf Schritt 5)', () => {
	// F-21, Abschnitt „Ablauf" Schritt 5: „Download mit Dateiname featuremap-JJJJ-MM-TT@2x.png
	// (Faktor im Namen)."
	it('baut den Dateinamen mit Faktor 2 exakt nach dem Beispiel aus der Featurebeschreibung', () => {
		expect(pngFilename(new Date(2026, 8, 8), 2)).toBe('featuremap-2026-09-08@2x.png');
	});

	it('baut den Dateinamen mit Faktor 1', () => {
		expect(pngFilename(new Date(2026, 8, 8), 1)).toBe('featuremap-2026-09-08@1x.png');
	});

	it('baut den Dateinamen mit Faktor 4', () => {
		expect(pngFilename(new Date(2026, 8, 8), 4)).toBe('featuremap-2026-09-08@4x.png');
	});

	// Zweistelliges Auffüllen von Monat und Tag, dasselbe Muster wie exportFilename() (F-19) und
	// exportSvgFilename() (F-20).
	it('füllt einstelligen Monat und Tag mit einer führenden Null auf', () => {
		expect(pngFilename(new Date(2026, 0, 3), 1)).toBe('featuremap-2026-01-03@1x.png');
	});

	// Endung .png.
	it('endet auf .png', () => {
		expect(pngFilename(new Date(2026, 11, 31), 4)).toMatch(/\.png$/);
	});
});
