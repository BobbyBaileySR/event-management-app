import { describe, expect, it } from 'vitest';
import { isAllowedHubSpotFormUrl } from './hubspotFormUrl';

describe('isAllowedHubSpotFormUrl', () => {
	it('accepts HTTPS HubSpot share and app URLs', () => {
		expect(
			isAllowedHubSpotFormUrl(
				'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890',
			),
		).toBe(true);
		expect(isAllowedHubSpotFormUrl('https://app.hubspot.com/forms/123456')).toBe(true);
		expect(isAllowedHubSpotFormUrl('https://js.hsforms.com/ui/forms/embed/view.js')).toBe(true);
	});

	it('rejects non-HTTPS, non-allowlisted, and dangerous URLs', () => {
		expect(isAllowedHubSpotFormUrl('http://share.hsforms.com/form')).toBe(false);
		expect(isAllowedHubSpotFormUrl('https://evil.example.com/form')).toBe(false);
		expect(isAllowedHubSpotFormUrl('javascript:alert(1)')).toBe(false);
		expect(isAllowedHubSpotFormUrl('https://user:pass@app.hubspot.com/form')).toBe(false);
		expect(isAllowedHubSpotFormUrl('https://app.hubspot.com:8443/form')).toBe(false);
	});

	it('rejects empty and whitespace-only input', () => {
		expect(isAllowedHubSpotFormUrl('')).toBe(false);
		expect(isAllowedHubSpotFormUrl('   ')).toBe(false);
	});
});
