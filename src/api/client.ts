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
}

/** Split logical path from query — X-EMS-Route must be path-only; query belongs on the listener URL. */
export function splitApiPath(path: string): { route: string; query: string } {
	const normalized = path.replace(/^\/+/, '');
	const queryIndex = normalized.indexOf('?');
	if (queryIndex === -1) {
		return { route: normalized, query: '' };
	}
	return {
		route: normalized.slice(0, queryIndex),
		query: normalized.slice(queryIndex + 1),
	};
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
	const { token } = requestConfig;
	const headers = new Headers(options.headers ?? {});
	if (!headers.has('Content-Type') && options.body) {
		headers.set('Content-Type', 'application/json');
	}

	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	if (!CONFIG.API_BASE_URL) {
		throw new ApiError('API_BASE_URL is not configured', 500);
	}

	const { route, query } = splitApiPath(path);
	headers.set('X-EMS-Route', route);

	const requestUrl = query ? `${CONFIG.API_BASE_URL}?${query}` : CONFIG.API_BASE_URL;
	const response = await fetch(requestUrl, { ...options, headers });

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
