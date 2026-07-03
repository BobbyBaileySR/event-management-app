import type { ReactNode } from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
	title: string;
	meta?: string;
	trailing?: ReactNode;
}

export function TopBar({ title, meta, trailing }: TopBarProps) {
	return (
		<div className={styles.topBar}>
			<div>
				<h1>{title}</h1>
				{meta ? <p className={styles.meta}>{meta}</p> : null}
			</div>
			{trailing ? <div className={styles.trailing}>{trailing}</div> : null}
		</div>
	);
}
