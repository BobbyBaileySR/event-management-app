import { describe, expect, it } from 'vitest';
import { getRandomLoadingTip } from './loadingTips';

describe('loadingTips', () => {
	it('returns null when tips list is empty', () => {
		expect(getRandomLoadingTip([])).toBeNull();
	});

	it('returns one of the provided tips', () => {
		const tips = ['First tip', 'Second tip'];
		const tip = getRandomLoadingTip(tips);

		expect(tips).toContain(tip);
	});
});
