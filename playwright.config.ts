import { defineConfig, devices } from '@playwright/test';
import { JSDOM } from 'jsdom';

// e2e/F-20-export-svg.spec.ts liest die heruntergeladene SVG-Datei mit `new DOMParser()`
// (F-20, Abschnitt "Tests"). Testdateien laufen in Node, nicht im Browser — Node liefert dieses
// Browser-Global nicht. Kein Eingriff in die vorgelegte Testdatei (CLAUDE.md, Abschnitt "Regeln
// für den Feature-Agenten"): reine Infrastruktur, die ein sonst fehlendes Node-Global über jsdom
// (bereits Projektabhängigkeit für Vitest) nachliefert, ohne Testverhalten zu ändern.
if (typeof (globalThis as { DOMParser?: unknown }).DOMParser === 'undefined') {
	(globalThis as { DOMParser?: unknown }).DOMParser = new JSDOM('').window.DOMParser;
}

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'e2e',
	timeout: 15_000,
	expect: {
		// Kurzer Timeout: In F-01 fehlt Produktionsinhalt absichtlich noch, Tests sollen
		// zügig und aus dem richtigen Grund rot sein statt am Standard-Timeout zu verhungern.
		timeout: 5_000
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: [['list']],
	use: {
		baseURL: BASE_URL,
		trace: 'retain-on-failure'
	},
	// Die Vorschau liefert den statischen adapter-static-Build aus (kein SSR zur Laufzeit,
	// NFR-20) und steht damit stellvertretend für „beliebiges Static Hosting" (AK-1).
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --strictPort',
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
