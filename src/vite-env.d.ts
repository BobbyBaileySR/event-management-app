/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_EMS_ENV?: 'uat' | 'live';
	/**
	 * Absolute ScriptRunner Connect listener base URL for deployed builds (GitHub Pages
	 * has no dev proxy). Unset in local dev, where the vite proxy serves the relative
	 * `/api/ems` fallback. Set per-environment in the deploy workflow.
	 */
	readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
