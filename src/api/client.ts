import { CONFIG } from '../config';

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export interface ApiRequestConfig {
	/** Bearer session token, when the caller has an authenticated session. */
	token?: string | null;
	/** Bypass the mock short-circuit (used by auth routes that must reach the backend). */
	skipMock?: boolean;
}

/**
 * Single fetch entry point to the ScriptRunner listener. Logical routes travel in the
 * X-EMS-Route header (the listener URL path is flat). Ported from js/api/client.js;
 * the session token is now passed in explicitly rather than read from global state.
 */
export async function apiRequest<T = unknown>(
	path: string,
	options: RequestInit = {},
	requestConfig: ApiRequestConfig = {},
): Promise<T | null> {
	const { token, skipMock = false } = requestConfig;
	const headers = new Headers(options.headers ?? {});
	if (!headers.has('Content-Type') && options.body) {
		headers.set('Content-Type', 'application/json');
	}

	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	if (CONFIG.USE_MOCK_API && !skipMock) {
		throw new ApiError('Mock API handled by service layer', 0);
	}

	if (!CONFIG.API_BASE_URL) {
		throw new ApiError('API_BASE_URL is not configured', 500);
	}

	headers.set('X-EMS-Route', path.replace(/^\/+/, ''));

	const response = await fetch(CONFIG.API_BASE_URL, { ...options, headers });

	if (!response.ok) {
		let message = `Request failed (${response.status})`;
		try {
			const body = (await response.json()) as { message?: string };
			if (body?.message) {
				message = body.message;
			}
		} catch {
			// ignore parse errors
		}
		throw new ApiError(message, response.status);
	}

	if (response.status === 204) {
		return null;
	}

	return (await response.json()) as T;
}
