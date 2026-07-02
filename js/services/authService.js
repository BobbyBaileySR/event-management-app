import { CONFIG } from '../config.js';
import { apiRequest } from '../api/client.js';
import { setSession, clearSession, isAuthenticated } from '../state/appState.js';

/**
 * Decode Google JWT payload without verification (mock auth only).
 * Live auth verifies the token on ScriptRunner via POST /auth/exchange.
 * @param {string} credential
 */
function decodeGoogleCredential(credential) {
    const parts = credential.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid Google credential format');
    }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
}

/**
 * @param {string} email
 */
function assertAllowedDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== CONFIG.ALLOWED_EMAIL_DOMAIN.toLowerCase()) {
        throw new Error(`Access restricted to @${CONFIG.ALLOWED_EMAIL_DOMAIN} accounts`);
    }
}

/**
 * @param {string} googleIdToken
 */
async function mockExchange(googleIdToken) {
    const payload = decodeGoogleCredential(googleIdToken);
    const email = payload.email;
    if (!email) {
        throw new Error('Google account email not available');
    }
    assertAllowedDomain(email);

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    return {
        token: `mock-session-${crypto.randomUUID()}`,
        email,
        role: 'viewer',
        expiresAt,
    };
}

/**
 * @param {string} googleIdToken
 */
export async function exchangeGoogleToken(googleIdToken) {
    if (CONFIG.USE_MOCK_AUTH) {
        const session = await mockExchange(googleIdToken);
        setSession(session);
        return session;
    }

    const result = await apiRequest(
        '/auth/exchange',
        {
            method: 'POST',
            body: JSON.stringify({ idToken: googleIdToken }),
        },
        { skipMock: true },
    );

    setSession(result);
    return result;
}

export async function logout() {
    if (!CONFIG.USE_MOCK_AUTH && isAuthenticated()) {
        try {
            await apiRequest('/auth/logout', { method: 'POST' }, { skipMock: true });
        } catch {
            // Always clear local session even if revoke fails
        }
    }
    clearSession();
}

export { isAuthenticated };

/**
 * @param {string} credential
 */
export async function handleGoogleCredential(credential) {
    return exchangeGoogleToken(credential);
}

/** @type {Promise<void> | null} */
let googleAuthReadyPromise = null;

/** @type {boolean} */
let googleSignInButtonRendered = false;

/**
 * Wire Google Identity Services callback on window for GIS integration.
 * Call once at app startup.
 */
export function registerGoogleCallback() {
    window.handleGoogleCredential = async (response) => {
        try {
            await handleGoogleCredential(response.credential);
            window.dispatchEvent(new CustomEvent('auth:success'));
        } catch (error) {
            window.dispatchEvent(
                new CustomEvent('auth:error', {
                    detail: error instanceof Error ? error.message : 'Sign-in failed',
                }),
            );
        }
    };
}

function waitForGoogleIdentity() {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve(window.google.accounts.id);
            return;
        }

        const timeoutMs = 15000;
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error('Google Sign-In failed to load. Check network access and Content-Security-Policy settings.'));
        }, timeoutMs);

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
 * Initialize GIS once per page load.
 * @returns {Promise<void>}
 */
function ensureGoogleAuthReady() {
    if (!CONFIG.GOOGLE_CLIENT_ID) {
        return Promise.resolve();
    }

    if (!googleAuthReadyPromise) {
        googleAuthReadyPromise = (async () => {
            const googleId = await waitForGoogleIdentity();
            googleId.initialize({
                client_id: CONFIG.GOOGLE_CLIENT_ID,
                callback: (response) => {
                    void window.handleGoogleCredential?.(response);
                },
                context: 'signin',
                ux_mode: 'popup',
                auto_select: false,
                use_fedcm_for_prompt: false,
            });
        })();
    }

    return googleAuthReadyPromise;
}

/**
 * Render Google Sign-In button once per page load (do not remount after logout).
 * @param {HTMLElement} container
 * @returns {Promise<boolean>}
 */
export async function ensureGoogleSignInButton(container) {
    if (!CONFIG.GOOGLE_CLIENT_ID) {
        return false;
    }

    if (googleSignInButtonRendered) {
        return true;
    }

    try {
        await ensureGoogleAuthReady();
        const googleId = window.google?.accounts?.id;
        if (!googleId) {
            throw new Error('Google Sign-In is not available');
        }

        container.replaceChildren();
        googleId.renderButton(container, {
            type: 'standard',
            size: 'large',
            theme: 'outline',
            text: 'signin_with',
            width: 320,
        });

        googleSignInButtonRendered = true;
        return true;
    } catch (error) {
        container.replaceChildren();
        const message = document.createElement('p');
        message.className = 'login-card__error';
        message.textContent = error instanceof Error ? error.message : 'Google Sign-In unavailable';
        container.appendChild(message);
        return false;
    }
}

/**
 * @param {string} message
 */
export function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    if (!errorEl) {
        return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

export function clearLoginError() {
    const errorEl = document.getElementById('login-error');
    if (!errorEl) {
        return;
    }
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
}
