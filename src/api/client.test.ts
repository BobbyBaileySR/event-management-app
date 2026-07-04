import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, splitApiPath } from './client';

vi.mock('../config', () => ({
	CONFIG: {
		USE_MOCK_API: false,
		API_BASE_URL: 'https://event.scriptrunnerconnect.com/listener',
	},
}));

describe('splitApiPath', () => {
	it('separates route from query string', () => {
		expect(splitApiPath('/catalog?includeArchived=true')).toEqual({
			route: 'catalog',
			query: 'includeArchived=true',
		});
	});

	it('returns route only when no query', () => {
		expect(splitApiPath('catalog')).toEqual({ route: 'catalog', query: '' });
	});
});

describe('apiRequest', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ programs: [] }),
		});
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sets X-EMS-Route to path only and forwards query on the listener URL', async () => {
		await apiRequest('/catalog?includeArchived=true');

		expect(fetchMock).toHaveBeenCalledWith(
			'https://event.scriptrunnerconnect.com/listener?includeArchived=true',
			expect.objectContaining({
				headers: expect.any(Headers),
			}),
		);

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const headers = init.headers as Headers;
		expect(headers.get('X-EMS-Route')).toBe('catalog');
	});
});
