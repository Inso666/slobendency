// F-07 · Vorbedingungen und Zyklen — Architekturtest.
// Quelle: features/README.md, Leitplanke 1: „Die Domäne kennt kein UI und kein Framework." —
// gilt laut Tabelle in features/README.md ausdrücklich auch für `src/lib/graph/`.
//
// Prüft den Quelltext selbst (nicht das Laufzeitverhalten), weil ein fehlender Import sich
// sonst nicht beobachten ließe — die Datei würde beim Fehlen von `svelte`/`document` schon
// beim Einlesen scheitern. Vorgehen analog zu src/lib/model/architecture.test.ts.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const graphDir = dirname(fileURLToPath(import.meta.url));

function sourceFiles(): string[] {
	return readdirSync(graphDir)
		.filter((name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
		.map((name: string) => join(graphDir, name));
}

describe('src/lib/graph bleibt frameworkfrei', () => {
	for (const file of sourceFiles()) {
		const relative = file.replace(graphDir, 'src/lib/graph');

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
