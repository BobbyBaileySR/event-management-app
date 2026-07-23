import { THEMES, type ThemeId } from '../theme/themeTokens';
import styles from './ThemeSwitcher.module.css';

interface ThemeSwitcherProps {
	theme: ThemeId;
	/** Celebration is hidden unless the signed-in user is allowlisted (research R-002). */
	celebrationAllowed: boolean;
	onSelect: (theme: ThemeId) => void;
	className?: string;
	/**
	 * 'list' (default): full-label vertical column — desktop sidebar / tablet drawer.
	 * 'row': horizontal wrapping pills with labels — phone tab bar.
	 * 'compact': icon-dot only (label kept for screen readers) — tablet icon rail, where
	 * there's no room for text.
	 */
	variant?: 'list' | 'row' | 'compact';
}

export function ThemeSwitcher({ theme, celebrationAllowed, onSelect, className, variant = 'list' }: ThemeSwitcherProps) {
	const options = THEMES.filter((option) => !option.gated || celebrationAllowed);
	const variantClass = variant === 'row' ? styles.row : variant === 'compact' ? styles.compact : '';

	return (
		<div className={`${styles.switcher} ${variantClass} ${className ?? ''}`.trim()} role="group" aria-label="Theme">
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					data-theme-option={option.id}
					className={`${styles.option} ${theme === option.id ? styles.active : ''}`.trim()}
					aria-pressed={theme === option.id}
					title={variant === 'compact' ? option.label : undefined}
					onClick={() => onSelect(option.id)}
				>
					<span className={styles.dot} aria-hidden="true" />
					<span className={variant === 'compact' ? 'sr-only' : undefined}>{option.label}</span>
				</button>
			))}
		</div>
	);
}
