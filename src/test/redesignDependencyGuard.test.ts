import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * T036 (spec 007 US2): the redesign must not introduce a new UI framework, and the only
 * new front-end assets it adds are the self-hosted Manrope + Material Symbols fonts
 * (research R-003) served via `font-src 'self'` — never a Google Fonts / icon CDN `<link>`.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FORBIDDEN_UI_FRAMEWORKS = ['tailwind', 'shadcn', 'tremor', 'mantine'];

function readPackageJson() {
	return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
}

describe('redesign dependency + asset guard (T036)', () => {
	it('package.json has no Tailwind/Shadcn/Tremor/Mantine dependency', () => {
		const pkg = readPackageJson();
		const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map((name) => name.toLowerCase());

		for (const forbidden of FORBIDDEN_UI_FRAMEWORKS) {
			expect(names.some((name) => name.includes(forbidden))).toBe(false);
		}
	});

	it('the only font packages are the self-hosted @fontsource ones (T006/T007)', () => {
		const pkg = readPackageJson();
		const fontPackages = Object.keys(pkg.dependencies).filter((name) => name.toLowerCase().includes('font'));

		expect(fontPackages.sort()).toEqual(['@fontsource-variable/manrope', '@fontsource/material-symbols-outlined']);
	});

	it("vite.config.ts CSP sets font-src 'self' with no Google Fonts / icon CDN host", () => {
		const viteConfig = readFileSync(join(repoRoot, 'vite.config.ts'), 'utf8');
		const fontSrcMatch = /font-src\s+([^"]+)/.exec(viteConfig);

		expect(fontSrcMatch?.[1].trim()).toBe("'self'");
		expect(viteConfig).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
	});

	it('index.html has no external font/icon CDN <link> tags', () => {
		const html = readFileSync(join(repoRoot, 'index.html'), 'utf8');

		expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
		expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:/);
	});
});
