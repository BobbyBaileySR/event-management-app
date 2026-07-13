/**
 * Static theme catalog (data-model.md § Theme). Not persisted as an entity — only the
 * user's chosen theme id is persisted (ThemePreference, see dataService get/setThemePreference).
 */
export type ThemeId = 'aurora' | 'celebration' | 'darkAurora';

export interface ThemeDescriptor {
	id: ThemeId;
	label: string;
	/** True for themes gated behind an allowlist (research R-002: Celebration only). */
	gated: boolean;
}

export const DEFAULT_THEME_ID: ThemeId = 'aurora';

export const THEMES: ThemeDescriptor[] = [
	{ id: 'aurora', label: 'Aurora', gated: false },
	{ id: 'celebration', label: 'Celebration', gated: true },
	{ id: 'darkAurora', label: 'Dark Aurora', gated: false },
];

export function isThemeId(value: string): value is ThemeId {
	return THEMES.some((theme) => theme.id === value);
}
