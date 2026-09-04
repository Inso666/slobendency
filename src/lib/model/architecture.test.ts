// F-02 · Domänenmodell und Invarianten — Architekturtest.
// Quelle: features/F-02-domaenenmodell.md, Akzeptanzkriterien: „Keine Datei in
// src/lib/model/ importiert aus svelte, $app oder dem DOM."; features/README.md,
// Leitplanke 1: „Die Domäne kennt kein UI und kein Framework."
//
// Prüft den Quelltext selbst (nicht das Laufzeitverhalten), weil ein fehlender Import sich
// sonst nicht beobachten ließe — die Datei würde beim Fehlen von `svelte`/`document` schon
// beim Einlesen scheitern.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const modelDir = dirname(fileURLToPath(import.meta.url));

function sourceFiles(): string[] {
	return readdirSync(modelDir)
		.filter((name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
		.map((name: string) => join(modelDir, name));
}

describe('src/lib/model bleibt frameworkfrei', () => {
	for (const file of sourceFiles()) {
		const relative = file.replace(modelDir, 'src/lib/model');

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
