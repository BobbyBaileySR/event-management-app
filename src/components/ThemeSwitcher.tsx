import { THEMES, type ThemeId } from '../theme/themeTokens';
import styles from './ThemeSwitcher.module.css';

interface ThemeSwitcherProps {
	theme: ThemeId;
	/** Celebration is hidden unless the signed-in user is allowlisted (research R-002). */
	celebrationAllowed: boolean;
	onSelect: (theme: ThemeId) => void;
	className?: string;
}

export function ThemeSwitcher({ theme, celebrationAllowed, onSelect, className }: ThemeSwitcherProps) {
	const options = THEMES.filter((option) => !option.gated || celebrationAllowed);

	return (
		<div className={`${styles.switcher} ${className ?? ''}`.trim()} role="group" aria-label="Theme">
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					className={`${styles.swatch} ${theme === option.id ? styles.active : ''}`.trim()}
					aria-pressed={theme === option.id}
					onClick={() => onSelect(option.id)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
