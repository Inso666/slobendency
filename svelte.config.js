import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Reine Client-Anwendung ohne Server: statischer Adapter, siehe PRD 7.1.
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		// Content-Security-Policy ohne unsafe-inline für Skripte (NFR-24). Bei statisch
		// vorgerenderten Seiten ohne Server trägt SvelteKit den Hash des einzigen Inline-
		// Bootstrap-Skripts in ein <meta http-equiv> ein, statt ihn pauschal zu erlauben.
		csp: {
			mode: 'hash',
			directives: {
				'script-src': ['self']
			}
		}
	}
};

export default config;
