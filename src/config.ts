/**
 * Frontend configuration. Ported from js/config.js during the React migration.
 */
export interface EmsConfig {
	APP_NAME: string;
	APP_SHORT_NAME: string;
	GOOGLE_CLIENT_ID: string;
	API_BASE_URL: string;
	USE_MOCK_AUTH: boolean;
	USE_MOCK_API: boolean;
	ALLOWED_EMAIL_DOMAIN: string;
	EMAIL_SEND_CONFIRM_THRESHOLD: number;
	MOCK_API_DELAY_MS: number;
	/** Staff email that receives the soft blush in-app theme (client-side cosmetic only). */
	CELEBRATION_THEME_EMAIL: string;
	/** One-time toast after sign-in when the celebration theme applies; leave empty to skip. */
	CELEBRATION_TOAST_MESSAGE: string;
}

export const CONFIG: EmsConfig = {
	APP_NAME: 'Adaptavist EMS',
	APP_SHORT_NAME: 'Event Console',

	/** Set via Google Cloud Console OAuth client (Web application). */
	GOOGLE_CLIENT_ID: '391161511150-ejvh658fsqb4cato9a58iq1ad4l3olsh.apps.googleusercontent.com',

	/**
	 * API path on the same origin as the UI.
	 * Local dev: `/api/ems` proxied to ScriptRunner via vite.config.ts (needs dev-server.config.js).
	 * Production: same path via Cloudflare Worker, or a CORS-capable proxy URL.
	 */
	API_BASE_URL: '/api/ems',

	/** When true, uses local mock auth exchange (not for production). */
	USE_MOCK_AUTH: false,

	/** When true, uses local mock data for EMS read/write routes. */
	USE_MOCK_API: true,

	ALLOWED_EMAIL_DOMAIN: 'adaptavist.com',
	EMAIL_SEND_CONFIRM_THRESHOLD: 50,

	/** Simulated network delay for mock API (ms). */
	MOCK_API_DELAY_MS: 350,

	CELEBRATION_THEME_EMAIL: 'kjohnston@adaptavist.com',
	CELEBRATION_TOAST_MESSAGE: '',
};
