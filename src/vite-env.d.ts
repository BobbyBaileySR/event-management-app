/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_EMS_ENV?: 'uat' | 'live';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
