import { CONFIG } from '../config.js';

/** Browser tab title — set from app bootstrap. */
export const APP_DOCUMENT_TITLE = `${CONFIG.APP_NAME} | Event Management System`;

/**
 * Read a CSS custom property from :root (for Chart.js and other canvas APIs).
 * @param {string} tokenName
 */
export function getBrandColor(tokenName) {
    return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
}
