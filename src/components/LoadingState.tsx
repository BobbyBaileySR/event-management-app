import { useMemo } from 'react';
import { getRandomLoadingTip } from '../constants/loadingTips';
import styles from './LoadingState.module.css';

type LoadingVariant = 'page' | 'panel' | 'inline';
type LoadingSkeleton = 'none' | 'table' | 'cards' | 'lines';

interface LoadingStateProps {
	message: string;
	variant?: LoadingVariant;
	skeleton?: LoadingSkeleton;
	skeletonRows?: number;
	/** Random tip above the spinner. Defaults to true for page/panel; false for inline (e.g. catalog pickers). */
	didYouKnow?: boolean;
}

function showDidYouKnowTip(variant: LoadingVariant, didYouKnow: boolean | undefined): boolean {
	if (didYouKnow !== undefined) {
		return didYouKnow;
	}

	return variant !== 'inline';
}

function SkeletonCell({ width = '100%' }: { width?: string }) {
	return (
		<div
			className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`}
			style={{ width }}
			aria-hidden="true"
		/>
	);
}

function TableSkeleton({ rows }: { rows: number }) {
	return (
		<div className={styles.skeleton} aria-hidden="true">
			{Array.from({ length: rows }, (_, index) => (
				<div key={index} className={styles.skeletonRow}>
					<SkeletonCell />
					<SkeletonCell width="80%" />
					<SkeletonCell width="70%" />
					<SkeletonCell width="60%" />
				</div>
			))}
		</div>
	);
}

function CardsSkeleton() {
	return (
		<div className={styles.skeleton} aria-hidden="true">
			<div className={styles.skeletonCards}>
				{Array.from({ length: 3 }, (_, index) => (
					<div key={index} className={`${styles.skeletonCard} ${styles.skeletonShimmer}`} />
				))}
			</div>
			<TableSkeleton rows={5} />
		</div>
	);
}

function LinesSkeleton({ rows }: { rows: number }) {
	return (
		<div className={styles.skeleton} aria-hidden="true">
			{Array.from({ length: rows }, (_, index) => (
				<SkeletonCell key={index} width={index % 2 === 0 ? '100%' : '72%'} />
			))}
		</div>
	);
}

export function LoadingState({
	message,
	variant = 'page',
	skeleton = 'none',
	skeletonRows = 6,
	didYouKnow: didYouKnowProp,
}: LoadingStateProps) {
	const showTip = showDidYouKnowTip(variant, didYouKnowProp);
	const didYouKnow = useMemo(() => (showTip ? getRandomLoadingTip() : null), [showTip]);

	const skeletonContent =
		skeleton === 'table' ? (
			<TableSkeleton rows={skeletonRows} />
		) : skeleton === 'cards' ? (
			<CardsSkeleton />
		) : skeleton === 'lines' ? (
			<LinesSkeleton rows={skeletonRows} />
		) : null;

	return (
		<div
			className={`${styles.root} ${styles[variant]}`}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			{didYouKnow ? (
				<div className={styles.didYouKnowBox}>
					<p className={styles.didYouKnowLabel}>Did you know?</p>
					<p className={styles.didYouKnow}>{didYouKnow}</p>
				</div>
			) : null}
			<div className={styles.spinner} aria-hidden="true" />
			<p className={styles.message}>{message}</p>
			{skeletonContent}
		</div>
	);
}
