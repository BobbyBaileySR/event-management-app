import styles from './RefetchFailureBanner.module.css';

interface RefetchFailureBannerProps {
	message?: string;
	onRetry: () => void;
}

/**
 * Non-blocking indicator for a background-refetch failure while the last-loaded data is
 * still on screen (research R6) — "stale beats blank, but never silently".
 */
export function RefetchFailureBanner({
	message = "Couldn't refresh — showing the last loaded data.",
	onRetry,
}: RefetchFailureBannerProps) {
	return (
		<div className={styles.banner} role="alert">
			<span className={`material-symbols-outlined ${styles.icon}`} aria-hidden="true">
				warning
			</span>
			<span className={styles.message}>{message}</span>
			<button type="button" className="btn btn-outline" onClick={onRetry}>
				Retry
			</button>
		</div>
	);
}
