import { CONFIG } from '../config';

/** Browser tab title. */
export const APP_DOCUMENT_TITLE = `${CONFIG.APP_NAME} | Event Management System`;

/**
 * Read a CSS custom property from :root (for Chart.js and other canvas APIs).
 */
export function getBrandColor(tokenName: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
}
