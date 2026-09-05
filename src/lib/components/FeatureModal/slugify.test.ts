// F-13 · Feature-Formular — Unit-Tests für slugify (features/F-13-feature-formular.md,
// Abschnitt "Slugify").

import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
	// F-13-AK: "Anzeigename Rollen & Rechte schlägt die Kennung rollen-rechte vor."
	it('schlägt aus "Rollen & Rechte" die Kennung "rollen-rechte" vor', () => {
		expect(slugify('Rollen & Rechte')).toBe('rollen-rechte');
	});

	// F-13, Abschnitt "Slugify": Kleinbuchstaben.
	it('wandelt Großbuchstaben in Kleinbuchstaben um', () => {
		expect(slugify('FOO Bar')).toBe('foo-bar');
	});

	// F-13, Abschnitt "Slugify": Umlaute nach ae/oe/ue, ß nach ss.
	it.each([
		['Über', 'ueber'],
		['Öffentliche API', 'oeffentliche-api'],
		['Käse', 'kaese'],
		['Straße', 'strasse'],
		['GRÖSSE', 'groesse']
	])('wandelt Umlaute in "%s" nach "%s" um', (input, expected) => {
		expect(slugify(input)).toBe(expected);
	});

	// F-13, Abschnitt "Slugify": alles außerhalb von [a-z0-9-] wird zu "-".
	it('ersetzt Zeichen außerhalb von [a-z0-9-] durch Bindestriche', () => {
		expect(slugify('A/B Test!!')).toBe('a-b-test');
	});

	// F-13, Abschnitt "Slugify": mehrfache Bindestriche werden zusammengefasst.
	it('fasst mehrfache Bindestriche zu einem zusammen', () => {
		expect(slugify('a---b   c')).toBe('a-b-c');
	});

	// F-13, Abschnitt "Slugify": an den Enden getrimmt.
	it('trimmt Bindestriche an Anfang und Ende', () => {
		expect(slugify('  -Test-  ')).toBe('test');
	});

	// F-13, Abschnitt "Slugify": "Ergibt das leeren Text, bleibt das Feld leer."
	it('liefert einen leeren Text, wenn nichts Zulässiges übrig bleibt', () => {
		expect(slugify('!!!')).toBe('');
	});

	it('liefert einen leeren Text für einen leeren Anzeigenamen', () => {
		expect(slugify('')).toBe('');
	});

	// F-13, Abschnitt "Slugify": "auf 64 Zeichen gekürzt."
	it('kürzt das Ergebnis auf 64 Zeichen', () => {
		const input = 'a'.repeat(100);
		const result = slugify(input);
		expect(result).toHaveLength(64);
		expect(result).toBe('a'.repeat(64));
	});
});
