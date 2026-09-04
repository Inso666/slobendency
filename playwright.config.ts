import { defineConfig, devices } from '@playwright/test';

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
