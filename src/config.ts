/**
 * Frontend configuration. Ported from js/config.js during the React migration.
 */
export type EmsEnv = 'uat' | 'live';

export interface EmsConfig {
	APP_NAME: string;
	APP_SHORT_NAME: string;
	/** Build-time environment: UAT (HubSpot Staging) or Live. Set via VITE_EMS_ENV in CI. */
	EMS_ENV: EmsEnv;
	GOOGLE_CLIENT_ID: string;
	API_BASE_URL: string;
	USE_MOCK_AUTH: boolean;
	USE_MOCK_API: boolean;
	ALLOWED_EMAIL_DOMAIN: string;
	EMAIL_SEND_CONFIRM_THRESHOLD: number;
	MOCK_API_DELAY_MS: number;
	/**
	 * Mock-mode stand-in for the ScriptRunner Connect Parameter of the same name.
	 * Live gating uses backend `user/prefs` → `celebrationAllowed`; this list is only
	 * consulted by `isCelebrationEmail()` when `USE_MOCK_API` is true.
	 */
	CELEBRATION_THEME_EMAIL: string[];
	/**
	 * Mock-mode stand-in for ScriptRunner `CELEBRATION_TOAST_EMAIL` — who sees the login toast.
	 * Independent of theme access. Live value comes from `user/prefs` → `celebrationToastMessage`.
	 */
	CELEBRATION_TOAST_EMAIL: string[];
	/**
	 * Mock-mode stand-in for ScriptRunner `CELEBRATION_TOAST_MESSAGE`. Empty → no toast.
	 * Live value is returned only for emails on the toast allowlist.
	 */
	CELEBRATION_TOAST_MESSAGE: string;
}

function resolveEmsEnv(): EmsEnv {
	return import.meta.env.VITE_EMS_ENV === 'uat' ? 'uat' : 'live';
}

export const CONFIG: EmsConfig = {
	APP_NAME: 'Adaptavist EMS',
	APP_SHORT_NAME: 'Event Console',
	EMS_ENV: resolveEmsEnv(),

	/** Set via Google Cloud Console OAuth client (Web application). */
	GOOGLE_CLIENT_ID: '391161511150-ejvh658fsqb4cato9a58iq1ad4l3olsh.apps.googleusercontent.com',

	/**
	 * ScriptRunner listener base URL.
	 * Local dev: falls back to `/api/ems`, proxied to ScriptRunner via vite.config.ts (needs dev-server.config.js).
	 * Deployed (GitHub Pages has no proxy): set `VITE_API_BASE_URL` to the absolute cross-origin
	 * listener URL in the deploy workflow. `client.ts` sends the logical route as the `route` query
	 * param specifically so this cross-origin call needs no custom-header CORS preflight allowance.
	 */
	API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/ems',

	/** When true, uses local mock auth exchange (not for production). */
	USE_MOCK_AUTH: false,

	/** When true, uses local mock data for EMS read/write routes. */
	USE_MOCK_API: false,

	ALLOWED_EMAIL_DOMAIN: 'adaptavist.com',
	EMAIL_SEND_CONFIRM_THRESHOLD: 50,

	/** Simulated network delay for mock API (ms). */
	MOCK_API_DELAY_MS: 350,

	CELEBRATION_THEME_EMAIL: ['kjohnston@adaptavist.com'],
	CELEBRATION_TOAST_EMAIL: ['kjohnston@adaptavist.com'],
	CELEBRATION_TOAST_MESSAGE: 'Just for you',
};
