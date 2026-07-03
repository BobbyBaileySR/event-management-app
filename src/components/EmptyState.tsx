import { useNavigate } from 'react-router-dom';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
	viewId: string;
	message: string;
	action?: {
		label: string;
		to: string;
	};
}

export function EmptyState({ viewId, message, action }: EmptyStateProps) {
	const navigate = useNavigate();

	return (
		<section id={viewId} className={styles.section}>
			<div className={`card ${styles.card}`}>
				<p>{message}</p>
				{action ? (
					<button type="button" className="btn btn-outline" onClick={() => navigate(action.to)}>
						{action.label}
					</button>
				) : null}
			</div>
		</section>
	);
}
