import type { ReactNode } from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
	title: string;
	meta?: string;
	/**
	 * Small persistent pill naming the working event, for views whose own title/meta don't
	 * already say which event they're scoped to (Registered Attendees, Check-in,
	 * Conversations). The working-event *picker* lives in the sidebar/rail/tab-bar, but that
	 * control collapses to an unlabeled icon on the tablet rail — this keeps the actual
	 * selection glanceable regardless of chrome tier, without needing to open anything.
	 */
	workingEvent?: string | null;
	trailing?: ReactNode;
}

export function TopBar({ title, meta, workingEvent, trailing }: TopBarProps) {
	return (
		<div className={`top-bar ${styles.topBar}`}>
			<div className={styles.titleGroup}>
				<h1>{title}</h1>
				{meta ? <p className={styles.meta}>{meta}</p> : null}
				{workingEvent ? (
					<p className={styles.workingEvent}>
						Working on: <strong>{workingEvent}</strong>
					</p>
				) : null}
			</div>
			{trailing ? <div className={styles.trailing}>{trailing}</div> : null}
		</div>
	);
}
