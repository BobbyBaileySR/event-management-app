import { describe, expect, it, beforeEach } from 'vitest';
import { CONFIG } from '../config';
import {
	applyCelebrationTheme,
	CELEBRATION_THEME_ATTRIBUTE,
	CELEBRATION_THEME_VALUE,
	isCelebrationEmail,
} from './celebrationTheme';

describe('celebrationTheme', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute(CELEBRATION_THEME_ATTRIBUTE);
	});

	it('matches configured email case-insensitively', () => {
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL)).toBe(true);
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL.toUpperCase())).toBe(true);
		expect(isCelebrationEmail('other@adaptavist.com')).toBe(false);
		expect(isCelebrationEmail(null)).toBe(false);
	});

	it('applies and removes data-theme on documentElement', () => {
		applyCelebrationTheme(true);
		expect(document.documentElement.getAttribute(CELEBRATION_THEME_ATTRIBUTE)).toBe(
			CELEBRATION_THEME_VALUE,
		);

		applyCelebrationTheme(false);
		expect(document.documentElement.hasAttribute(CELEBRATION_THEME_ATTRIBUTE)).toBe(false);
	});
});
