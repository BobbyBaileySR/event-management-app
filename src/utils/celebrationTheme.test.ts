import { afterEach, describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import {
	isCelebrationEmail,
	isCelebrationToastEmail,
	resolveMockCelebrationToastMessage,
} from './celebrationTheme';

describe('celebrationTheme', () => {
	const originalThemeList = [...CONFIG.CELEBRATION_THEME_EMAIL];
	const originalToastList = [...CONFIG.CELEBRATION_TOAST_EMAIL];
	const originalToastMessage = CONFIG.CELEBRATION_TOAST_MESSAGE;

	afterEach(() => {
		CONFIG.CELEBRATION_THEME_EMAIL = [...originalThemeList];
		CONFIG.CELEBRATION_TOAST_EMAIL = [...originalToastList];
		CONFIG.CELEBRATION_TOAST_MESSAGE = originalToastMessage;
	});

	it('matches a configured theme email case-insensitively', () => {
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL[0])).toBe(true);
		expect(isCelebrationEmail(CONFIG.CELEBRATION_THEME_EMAIL[0]!.toUpperCase())).toBe(true);
		expect(isCelebrationEmail('other@adaptavist.com')).toBe(false);
		expect(isCelebrationEmail(null)).toBe(false);
	});

	it('matches any email in a multi-entry theme allowlist, not just the first', () => {
		CONFIG.CELEBRATION_THEME_EMAIL = ['first@adaptavist.com', 'second@adaptavist.com'];

		expect(isCelebrationEmail('first@adaptavist.com')).toBe(true);
		expect(isCelebrationEmail('SECOND@adaptavist.com')).toBe(true);
		expect(isCelebrationEmail('third@adaptavist.com')).toBe(false);
	});

	it('denies everyone when the theme allowlist is empty', () => {
		CONFIG.CELEBRATION_THEME_EMAIL = [];

		expect(isCelebrationEmail('anyone@adaptavist.com')).toBe(false);
	});

	it('treats toast allowlist as independent of theme allowlist', () => {
		CONFIG.CELEBRATION_THEME_EMAIL = ['theme@adaptavist.com'];
		CONFIG.CELEBRATION_TOAST_EMAIL = ['toast@adaptavist.com'];
		CONFIG.CELEBRATION_TOAST_MESSAGE = 'Hello';

		expect(isCelebrationEmail('toast@adaptavist.com')).toBe(false);
		expect(isCelebrationToastEmail('toast@adaptavist.com')).toBe(true);
		expect(resolveMockCelebrationToastMessage('toast@adaptavist.com')).toBe('Hello');
		expect(resolveMockCelebrationToastMessage('theme@adaptavist.com')).toBeNull();
	});

	it('returns null toast message when the Param message is blank', () => {
		CONFIG.CELEBRATION_TOAST_EMAIL = ['toast@adaptavist.com'];
		CONFIG.CELEBRATION_TOAST_MESSAGE = '  ';

		expect(resolveMockCelebrationToastMessage('toast@adaptavist.com')).toBeNull();
	});
});
