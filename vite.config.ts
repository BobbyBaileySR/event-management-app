/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
	// HubSpot CDN hosts (e.g. cdn2.hubspot.net) — add here when Slice 1 renders real asset URLs.
	"img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com https://accounts.google.com",
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
	const module = await import(pathToFileURL(configPath).href);
	return module.DEV_SERVER_CONFIG?.srcListenerUrl ?? null;
}

export default defineConfig(async ({ mode }) => {
	const proxyTarget = await loadDevProxyTarget();
	const isTest = mode === 'test' || process.env.VITEST === 'true';
	const html5QrcodeStub = fileURLToPath(new URL('./src/test/html5-qrcode.stub.ts', import.meta.url));

	return {
		plugins: [react(), injectProductionCsp()],
		resolve: isTest
			? {
					alias: {
						'html5-qrcode': html5QrcodeStub,
					},
				}
			: undefined,
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
