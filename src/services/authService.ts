import { CONFIG } from '../config';
import { apiRequest } from '../api/client';
import type { Session } from '../types';

/**
 * Auth service ported from js/services/authService.js.
 * - Live: POST /auth/exchange verifies the Google ID token server-side (ScriptRunner).
 * - Mock: decodes the token client-side for local PoC only (never production security).
 * React components call these and push the result into session context.
 */

function decodeGoogleCredential(credential: string): { email?: string } {
	const parts = credential.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid Google credential format');
	}
	return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string };
}

function assertAllowedDomain(email: string): void {
	const domain = email.split('@')[1]?.toLowerCase();
	if (domain !== CONFIG.ALLOWED_EMAIL_DOMAIN.toLowerCase()) {
		throw new Error(`Access restricted to @${CONFIG.ALLOWED_EMAIL_DOMAIN} accounts`);
	}
}

async function mockExchange(googleIdToken: string): Promise<Session> {
	const { email } = decodeGoogleCredential(googleIdToken);
	if (!email) {
		throw new Error('Google account email not available');
	}
	assertAllowedDomain(email);

	return {
		token: `mock-session-${crypto.randomUUID()}`,
		email,
		role: 'viewer',
		expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
	};
}

export async function exchangeGoogleToken(googleIdToken: string): Promise<Session> {
	if (CONFIG.USE_MOCK_AUTH) {
		return mockExchange(googleIdToken);
	}

	const result = await apiRequest<Session>(
		'/auth/exchange',
		{ method: 'POST', body: JSON.stringify({ idToken: googleIdToken }) },
		{ skipMock: true },
	);
	if (!result) {
		throw new Error('Auth exchange returned no session');
	}
	return result;
}

export async function logoutRequest(session: Session | null): Promise<void> {
	if (!CONFIG.USE_MOCK_AUTH && session?.token) {
		try {
			await apiRequest('/auth/logout', { method: 'POST' }, { skipMock: true, token: session.token });
		} catch {
			// Always clear the local session even if server revoke fails.
		}
	}
}

function waitForGoogleIdentity(): Promise<GoogleAccountsId> {
	return new Promise((resolve, reject) => {
		if (window.google?.accounts?.id) {
			resolve(window.google.accounts.id);
			return;
		}

		const timeout = setTimeout(() => {
			clearInterval(interval);
			reject(new Error('Google Sign-In failed to load. Check network access and Content-Security-Policy.'));
		}, 15000);

		const interval = setInterval(() => {
			if (window.google?.accounts?.id) {
				clearInterval(interval);
				clearTimeout(timeout);
				resolve(window.google.accounts.id);
			}
		}, 100);
	});
}

/**
 * Initialize GIS and render the sign-in button into `container`.
 * `onCredential` fires with the Google ID token when the user signs in.
 */
export async function renderGoogleSignInButton(
	container: HTMLElement,
	onCredential: (idToken: string) => void,
): Promise<void> {
	if (!CONFIG.GOOGLE_CLIENT_ID) {
		throw new Error('Set GOOGLE_CLIENT_ID in src/config.ts to enable Google Sign-In.');
	}

	const googleId = await waitForGoogleIdentity();
	googleId.initialize({
		client_id: CONFIG.GOOGLE_CLIENT_ID,
		callback: (response) => onCredential(response.credential),
		context: 'signin',
		ux_mode: 'popup',
		auto_select: false,
		use_fedcm_for_prompt: false,
	});

	container.replaceChildren();
	googleId.renderButton(container, { type: 'standard', size: 'large', theme: 'outline', text: 'signin_with', width: 320 });
}
