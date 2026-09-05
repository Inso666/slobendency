// F-08 · Kartengerüst — Architekturtest.
// Quelle: features/F-08-kartengeruest.md, Abschnitt „DDD-Einordnung": „Die Skalen sind reine
// Rechenfunktionen ohne Svelte-Abhängigkeit und daher für sich testbar."
//
// Prüft den Quelltext selbst, wie src/lib/model/architecture.test.ts es für die Domäne tut —
// ein fehlender Import ließe sich sonst nicht beobachten, weil die Datei beim Fehlen von
// `svelte`/`document` schon beim Einlesen scheitern würde.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const layoutDir = dirname(fileURLToPath(import.meta.url));

function sourceFiles(): string[] {
	return readdirSync(layoutDir)
		.filter((name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
		.map((name: string) => join(layoutDir, name));
}

describe('src/lib/layout bleibt frei von Svelte- und DOM-Bezügen', () => {
	for (const file of sourceFiles()) {
		const relative = file.replace(layoutDir, 'src/lib/layout');

		it(`${relative} importiert nicht aus svelte`, () => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/from\s+['"]svelte/);
		});

		it(`${relative} importiert nicht aus $app`, () => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/from\s+['"]\$app/);
		});

		it(`${relative} referenziert nicht window oder document`, () => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/\b(window|document)\b/);
		});

		it(`${relative} referenziert keine Hexfarbe (Farben leben nur in src/app.css)`, () => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		});
	}
});

// F-08-AK: „Kein Hexwert in einer Komponente unter Map/." Geprüft wird der Quelltext der
// Komponenten selbst, weil ein hartkodierter Hexwert im gerenderten SVG optisch mit einem
// aufgelösten Custom-Property-Wert identisch aussehen kann und sich so nicht zuverlässig zur
// Laufzeit unterscheiden ließe.
describe('src/lib/components/Map verwendet keine Hexfarben', () => {
	const mapComponentsDir = join(layoutDir, '..', 'components', 'Map');
	let files: string[] = [];
	try {
		files = readdirSync(mapComponentsDir)
			.filter((name: string) => name.endsWith('.svelte'))
			.map((name: string) => join(mapComponentsDir, name));
	} catch {
		files = [];
	}

	it('enthält mindestens die vier Kartenkomponenten aus F-08', () => {
		const names = files.map((file) => file.split(/[/\\]/).pop());
		for (const expected of ['MapCanvas.svelte', 'Regions.svelte', 'Grid.svelte', 'Axes.svelte']) {
			expect(names).toContain(expected);
		}
	});

	for (const file of files) {
		const relative = file.replace(join(layoutDir, '..', '..'), 'src');

		it(`${relative} referenziert keine Hexfarbe`, () => {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		});
	}
});
