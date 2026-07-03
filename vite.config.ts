/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Production Content-Security-Policy. Injected into index.html at BUILD time only —
 * the Vite dev server needs inline/eval for HMR, so we keep the tight policy off dev
 * (local-only) and enforce it on the deployed bundle. Keep in sync with blueprint §3.6.
 */
const PRODUCTION_CSP = [
	"default-src 'self'",
	"script-src 'self' https://accounts.google.com",
	"style-src 'self' 'unsafe-inline' https://accounts.google.com",
	"connect-src 'self' https://accounts.google.com https://www.googleapis.com https://*.gstatic.com https://event.scriptrunnerconnect.com",
	"img-src 'self' data: https:",
	'frame-src https://accounts.google.com',
].join('; ');

function injectProductionCsp(): Plugin {
	return {
		name: 'ems-inject-production-csp',
		apply: 'build',
		transformIndexHtml(html) {
			// Must precede the bundled <script>/<link> tags so the browser applies it before fetching them.
			const meta = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}">`;
			return html.replace('<head>', `<head>\n    ${meta}`);
		},
	};
}

/**
 * Optional local proxy for live Phase 0 auth: forwards /api/ems -> ScriptRunner listener,
 * so browser calls stay same-origin (ScriptRunner does not handle CORS preflight).
 * Mirrors the old dev-server.mjs. Only active if dev-server.config.js exists.
 */
async function loadDevProxyTarget(): Promise<string | null> {
	const configPath = fileURLToPath(new URL('./dev-server.config.js', import.meta.url));
	if (!existsSync(configPath)) {
		return null;
	}
	const module = await import(configPath);
	return module.DEV_SERVER_CONFIG?.srcListenerUrl ?? null;
}

export default defineConfig(async () => {
	const proxyTarget = await loadDevProxyTarget();

	return {
		plugins: [react(), injectProductionCsp()],
		// Relative base so built assets resolve on GitHub Pages project subpaths and custom domains alike.
		base: './',
		server: {
			port: 8765,
			host: '127.0.0.1',
			proxy: proxyTarget
				? {
						'/api/ems': {
							target: proxyTarget,
							changeOrigin: true,
							rewrite: (path: string) => path.replace(/^\/api\/ems/, ''),
						},
					}
				: undefined,
		},
		build: {
			outDir: 'dist',
			sourcemap: true,
		},
		test: {
			environment: 'jsdom',
			globals: true,
			css: true,
			setupFiles: './src/test/setup.ts',
		},
	};
});
