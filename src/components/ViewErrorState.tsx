import { TopBar } from './TopBar';
import styles from './ViewErrorState.module.css';

interface ViewErrorStateProps {
	viewId: string;
	title: string;
	message: string;
	meta?: string;
	workingEvent?: string | null;
	onRetry?: () => void;
}

/** Full-screen fetch failure with page chrome, alert semantics, and optional retry. */
export function ViewErrorState({ viewId, title, message, meta, workingEvent, onRetry }: ViewErrorStateProps) {
	return (
		<section id={viewId} className={styles.view}>
			<TopBar title={title} meta={meta ?? 'Unable to load this screen'} workingEvent={workingEvent} />
			<div className={`card ${styles.card}`}>
				<p role="alert" className={styles.message}>
					{message}
				</p>
				{onRetry ? (
					<button type="button" className="btn btn-outline" onClick={onRetry}>
						Try again
					</button>
				) : null}
			</div>
		</section>
	);
}
