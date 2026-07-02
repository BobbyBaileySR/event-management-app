import { CONFIG } from '../config.js';
import { ensureGoogleSignInButton, showLoginError, clearLoginError } from '../services/authService.js';
import { el } from '../utils/dom.js';

/** @type {boolean} */
let loginShellReady = false;

/** @type {((event: Event) => void) | null} */
let authSuccessHandler = null;

/** @type {((event: Event) => void) | null} */
let authErrorHandler = null;

/**
 * Build login card and Google button once per page load.
 * @param {HTMLElement} container
 */
export function ensureLoginShell(container) {
    if (loginShellReady) {
        return;
    }
    loginShellReady = true;

    const errorEl = el('div', { className: 'login-card__error hidden', id: 'login-error' });

    const googleContainer = el('div', { id: 'google-signin-container', className: 'google-signin-container' });
    googleContainer.appendChild(el('p', { className: 'login-card__subtitle', text: 'Loading sign-in…' }));

    const originHint = CONFIG.GOOGLE_CLIENT_ID
        ? ` Authorized JavaScript origin in Google Cloud Console: ${window.location.origin}`
        : '';

    const mockParts = [];
    if (CONFIG.USE_MOCK_AUTH) {
        mockParts.push('mock auth');
    }
    if (CONFIG.USE_MOCK_API) {
        mockParts.push('sample data');
    }
    const mockLabel = mockParts.length > 0 ? ` PoC shell (${mockParts.join(', ')}).` : '';

    const noticeText = `${mockLabel} Sign in with your @${CONFIG.ALLOWED_EMAIL_DOMAIN} account to continue.${originHint}`.trim();

    const card = el('div', { className: 'login-card' }, [
        el('h2', { text: CONFIG.APP_NAME }),
        el('p', { className: 'login-card__subtitle', text: 'Event Management System' }),
        googleContainer,
        errorEl,
        el('div', { className: 'login-card__notice', text: noticeText }),
    ]);

    container.replaceChildren(card);

    if (CONFIG.GOOGLE_CLIENT_ID) {
        void ensureGoogleSignInButton(googleContainer);
    } else {
        googleContainer.replaceChildren(
            el('p', {
                className: 'login-card__error',
                text: 'Set GOOGLE_CLIENT_ID in js/config.js to enable Google Sign-In.',
            }),
        );
    }

    authSuccessHandler = () => {
        clearLoginError();
    };

    authErrorHandler = (event) => {
        /** @type {CustomEvent} */
        const customEvent = event;
        showLoginError(customEvent.detail ?? 'Sign-in failed');
    };

    window.addEventListener('auth:success', authSuccessHandler);
    window.addEventListener('auth:error', authErrorHandler);
}

/**
 * @param {HTMLElement} container
 */
export function showLoginView(container) {
    ensureLoginShell(container);
}
