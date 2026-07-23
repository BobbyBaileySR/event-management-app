import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../types';

const mockApiRequest = vi.fn();
vi.mock('../api/client', () => ({
	apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

const mockConfig = {
	APP_NAME: 'Adaptavist EMS',
	GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
	USE_MOCK_AUTH: false,
	ALLOWED_EMAIL_DOMAIN: 'adaptavist.com',
};
vi.mock('../config', () => ({ CONFIG: mockConfig }));

const { exchangeGoogleToken, logoutRequest, renderGoogleSignInButton } = await import('./authService');

function makeGoogleIdToken(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: 'RS256' }));
	const body = btoa(JSON.stringify(payload));
	return `${header}.${body}.signature`;
}

beforeEach(() => {
	mockApiRequest.mockReset();
	mockConfig.USE_MOCK_AUTH = false;
	mockConfig.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
	delete (window as unknown as { google?: unknown }).google;
});

afterEach(() => {
	vi.useRealTimers();
});

describe('exchangeGoogleToken', () => {
	it('posts the Google ID token to /auth/exchange and returns the session (live mode)', async () => {
		const session: Session = {
			token: 't',
			email: 'a@adaptavist.com',
			role: 'admin',
			expiresAt: '2099-01-01T00:00:00.000Z',
		};
		mockApiRequest.mockResolvedValue(session);

		const result = await exchangeGoogleToken('fake-id-token');

		expect(mockApiRequest).toHaveBeenCalledWith('/auth/exchange', {
			method: 'POST',
			body: JSON.stringify({ idToken: 'fake-id-token' }),
		});
		expect(result).toEqual(session);
	});

	it('throws when the exchange returns no session', async () => {
		mockApiRequest.mockResolvedValue(null);

		await expect(exchangeGoogleToken('fake-id-token')).rejects.toThrow('Auth exchange returned no session');
	});

	it('propagates the backend error when the exchange request fails', async () => {
		mockApiRequest.mockRejectedValue(new Error('exchange failed'));

		await expect(exchangeGoogleToken('fake-id-token')).rejects.toThrow('exchange failed');
	});

	it('decodes the credential locally and returns a mock viewer session when USE_MOCK_AUTH is true', async () => {
		mockConfig.USE_MOCK_AUTH = true;
		const idToken = makeGoogleIdToken({ email: 'someone@adaptavist.com' });

		const result = await exchangeGoogleToken(idToken);

		expect(mockApiRequest).not.toHaveBeenCalled();
		expect(result.email).toBe('someone@adaptavist.com');
		expect(result.role).toBe('viewer');
		expect(result.token).toMatch(/^mock-session-/);
	});

	it('rejects a mock-mode credential from an unauthorized domain', async () => {
		mockConfig.USE_MOCK_AUTH = true;
		const idToken = makeGoogleIdToken({ email: 'someone@example.com' });

		await expect(exchangeGoogleToken(idToken)).rejects.toThrow('Access restricted to @adaptavist.com accounts');
	});

	it('rejects a mock-mode credential with no email claim', async () => {
		mockConfig.USE_MOCK_AUTH = true;
		const idToken = makeGoogleIdToken({});

		await expect(exchangeGoogleToken(idToken)).rejects.toThrow('Google account email not available');
	});

	it('rejects a malformed credential', async () => {
		mockConfig.USE_MOCK_AUTH = true;

		await expect(exchangeGoogleToken('not-a-jwt')).rejects.toThrow('Invalid Google credential format');
	});
});

describe('logoutRequest', () => {
	it('posts to /auth/logout with the session token (live mode)', async () => {
		mockApiRequest.mockResolvedValue(undefined);
		const session: Session = {
			token: 'tok-123',
			email: 'a@adaptavist.com',
			role: 'admin',
			expiresAt: '2099-01-01T00:00:00.000Z',
		};

		await logoutRequest(session);

		expect(mockApiRequest).toHaveBeenCalledWith('/auth/logout', { method: 'POST' }, { token: 'tok-123' });
	});

	it('does not call the API when there is no session', async () => {
		await logoutRequest(null);

		expect(mockApiRequest).not.toHaveBeenCalled();
	});

	it('swallows a failed revoke so the caller can always clear the local session', async () => {
		mockApiRequest.mockRejectedValue(new Error('network error'));
		const session: Session = {
			token: 'tok-123',
			email: 'a@adaptavist.com',
			role: 'admin',
			expiresAt: '2099-01-01T00:00:00.000Z',
		};

		await expect(logoutRequest(session)).resolves.toBeUndefined();
	});

	it('does not call the API in mock mode', async () => {
		mockConfig.USE_MOCK_AUTH = true;
		const session: Session = {
			token: 'tok-123',
			email: 'a@adaptavist.com',
			role: 'admin',
			expiresAt: '2099-01-01T00:00:00.000Z',
		};

		await logoutRequest(session);

		expect(mockApiRequest).not.toHaveBeenCalled();
	});
});

describe('renderGoogleSignInButton', () => {
	it('throws when GOOGLE_CLIENT_ID is not configured', async () => {
		mockConfig.GOOGLE_CLIENT_ID = '';

		await expect(renderGoogleSignInButton(document.createElement('div'), vi.fn())).rejects.toThrow(
			'Set GOOGLE_CLIENT_ID in src/config.ts to enable Google Sign-In.',
		);
	});

	it('initializes GIS with the configured client id and renders the button into the container', async () => {
		const initialize = vi.fn();
		const renderButton = vi.fn();
		(window as unknown as { google: unknown }).google = { accounts: { id: { initialize, renderButton } } };
		const container = document.createElement('div');
		container.appendChild(document.createElement('p'));

		await renderGoogleSignInButton(container, vi.fn());

		expect(initialize).toHaveBeenCalledWith(
			expect.objectContaining({ client_id: mockConfig.GOOGLE_CLIENT_ID, ux_mode: 'popup', auto_select: false }),
		);
		expect(renderButton).toHaveBeenCalledWith(container, expect.objectContaining({ type: 'standard' }));
		expect(container.children).toHaveLength(0);
	});

	it('invokes onCredential with the Google ID token from the GIS callback', async () => {
		let capturedCallback!: (response: { credential: string }) => void;
		(window as unknown as { google: unknown }).google = {
			accounts: {
				id: {
					initialize: vi.fn((opts: { callback: (response: { credential: string }) => void }) => {
						capturedCallback = opts.callback;
					}),
					renderButton: vi.fn(),
				},
			},
		};
		const onCredential = vi.fn();

		await renderGoogleSignInButton(document.createElement('div'), onCredential);
		capturedCallback({ credential: 'the-id-token' });

		expect(onCredential).toHaveBeenCalledWith('the-id-token');
	});

	it('rejects if Google Identity Services never becomes available', async () => {
		vi.useFakeTimers();
		const promise = renderGoogleSignInButton(document.createElement('div'), vi.fn());
		const assertion = expect(promise).rejects.toThrow('Google Sign-In failed to load');

		await vi.advanceTimersByTimeAsync(15000);
		await assertion;
	});
});
