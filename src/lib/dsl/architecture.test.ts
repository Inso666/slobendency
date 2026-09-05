// F-05 · DSL-Parser — Architekturtest.
// Quelle: features/README.md, Leitplanke 1: „Die Domäne kennt kein UI und kein Framework. In
// model/, graph/ und dsl/ gibt es keine Svelte-Importe, kein window, kein document, keine
// Farben (NFR-40)."
//
// Prüft den Quelltext selbst (nicht das Laufzeitverhalten), weil ein fehlender Import sich
// sonst nicht beobachten ließe — die Datei würde beim Fehlen von `svelte`/`document` schon
// beim Einlesen scheitern.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dslDir = dirname(fileURLToPath(import.meta.url));

function sourceFiles(): string[] {
	return readdirSync(dslDir)
		.filter((name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
		.map((name: string) => join(dslDir, name));
}

describe('src/lib/dsl bleibt frameworkfrei', () => {
	for (const file of sourceFiles()) {
		const relative = file.replace(dslDir, 'src/lib/dsl');

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
	}
});
