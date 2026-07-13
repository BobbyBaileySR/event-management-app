import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { isCelebrationEmail } from './celebrationTheme';

describe('celebrationTheme', () => {
	it('matches configured email case-insensitively', () => {
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL)).toBe(true);
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL.toUpperCase())).toBe(true);
		expect(isCelebrationEmail('other@adaptavist.com')).toBe(false);
		expect(isCelebrationEmail(null)).toBe(false);
	});
});
