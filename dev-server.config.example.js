/**
 * Local dev server config — copy to dev-server.config.js and set your ScriptRunner listener URL.
 * dev-server.config.js is gitignored (do not commit the listener URL).
 */
export const DEV_SERVER_CONFIG = {
    port: 8765,
    host: '127.0.0.1',
    /** Full URL from ScriptRunner Generic Sync HTTP listener (flat path, no /auth/exchange suffix). */
    srcListenerUrl: 'https://event.scriptrunnerconnect.com/your-workspace/your-flat-path',
};
