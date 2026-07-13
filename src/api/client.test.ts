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
		fetchMock.mockReset();
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

	it('sends the route as a query param alongside existing query, and no X-EMS-Route header', async () => {
		await apiRequest('/catalog?includeArchived=true');

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const parsed = new URL(url);
		expect(parsed.origin + parsed.pathname).toBe('https://event.scriptrunnerconnect.com/listener');
		expect(parsed.searchParams.get('route')).toBe('catalog');
		expect(parsed.searchParams.get('includeArchived')).toBe('true');

		const headers = init.headers as Headers;
		expect(headers.has('X-EMS-Route')).toBe(false);
	});

	it('sends the route param when the path has no query string', async () => {
		await apiRequest('auth/logout');

		const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(new URL(url).searchParams.get('route')).toBe('auth/logout');
	});
});
