/**
 * Example configuration — copy field values into `export const CONFIG` in js/config.js.
 * This file exports CONFIG_EXAMPLE (not CONFIG) so the app never loads two configs by mistake.
 */
export const CONFIG_EXAMPLE = {
    APP_NAME: 'Adaptavist EMS',
    APP_SHORT_NAME: 'Event Console',
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    /** Same-origin API path; local dev uses dev-server.mjs proxy to ScriptRunner. */
    API_BASE_URL: '/api/ems',
    USE_MOCK_AUTH: true,
    USE_MOCK_API: true,
    ALLOWED_EMAIL_DOMAIN: 'adaptavist.com',
    EMAIL_SEND_CONFIRM_THRESHOLD: 50,
    MOCK_API_DELAY_MS: 350,
};
