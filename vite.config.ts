import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// jsdom wird gebraucht, weil src/lib/store/ (Anwendungsschicht) auf document und
		// localStorage zugreifen darf. src/lib/model, dsl und graph bleiben trotzdem
		// framework- und DOM-frei (siehe features/README.md, Leitplanke 1).
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			// dsl/ und graph/ nach NFR-41; model/ zusätzlich nach der Zielabdeckung aus
			// features/F-02-domaenenmodell.md, Abschnitt „Tests".
			include: ['src/lib/dsl/**', 'src/lib/graph/**', 'src/lib/model/**']
		}
	}
});
