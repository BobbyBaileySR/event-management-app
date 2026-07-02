import styles from './PlaceholderView.module.css';

/**
 * Temporary R0 landing view — confirms React render, hash routing, brand tokens,
 * and CSS Modules all work end to end. Replaced by the ported Events view in R3.
 */
export function PlaceholderView() {
	return (
		<main className={styles.screen}>
			<span className={styles.badge}>React + TypeScript + Vite</span>
			<h1 className={styles.title}>Adaptavist EMS</h1>
			<p>Migration scaffold (R0) is live. Views are ported next.</p>
		</main>
	);
}
