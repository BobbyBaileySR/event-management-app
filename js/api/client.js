import { CONFIG } from '../config.js';
import { getState } from '../state/appState.js';

export class ApiError extends Error {
    /**
     * @param {string} message
     * @param {number} status
     */
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * @param {number} ms
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {{ skipMock?: boolean }} [requestConfig]
 */
export async function apiRequest(path, options = {}, requestConfig = {}) {
    const { skipMock = false } = requestConfig;
    const headers = new Headers(options.headers ?? {});
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    const session = getState().session;
    if (session?.token) {
        headers.set('Authorization', `Bearer ${session.token}`);
    }

    if (CONFIG.USE_MOCK_API && !skipMock) {
        await delay(CONFIG.MOCK_API_DELAY_MS);
        throw new ApiError('Mock API handled by service layer', 0);
    }

    if (!CONFIG.API_BASE_URL) {
        throw new ApiError('API_BASE_URL is not configured', 500);
    }

    const logicalRoute = path.replace(/^\/+/, '');
    headers.set('X-EMS-Route', logicalRoute);

    const response = await fetch(CONFIG.API_BASE_URL, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const body = await response.json();
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

    return response.json();
}
