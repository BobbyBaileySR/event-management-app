/**
 * Frontend configuration.
 * Copy and adjust values before connecting to ScriptRunner Connect.
 */
export const CONFIG = {
    APP_NAME: 'Adaptavist EMS',
    APP_SHORT_NAME: 'Event Console',

    /** Set via Google Cloud Console OAuth client (Web application). */
    GOOGLE_CLIENT_ID: '391161511150-ejvh658fsqb4cato9a58iq1ad4l3olsh.apps.googleusercontent.com',

    /**
     * API path on the same origin as the UI.
     * Local dev: use `/api/ems` with `npm run dev` (see dev-server.config.js).
     * Production: same path via Cloudflare Worker, or a CORS-capable proxy URL.
     */
    API_BASE_URL: '/api/ems',

    /**
     * When true, uses local mock auth exchange (not for production).
     * Set to false when Phase 0 ScriptRunner auth endpoints are deployed.
     */
    USE_MOCK_AUTH: false,

    /**
     * When true, uses local mock data for EMS read/write routes.
     * Can stay true until Phase 2+ backend APIs exist.
     */
    USE_MOCK_API: true,

    ALLOWED_EMAIL_DOMAIN: 'adaptavist.com',
    EMAIL_SEND_CONFIRM_THRESHOLD: 50,

    /** Simulated network delay for mock API (ms). */
    MOCK_API_DELAY_MS: 350,
};
