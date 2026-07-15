import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import type { AuditLogEntry } from '../types';
import { isAuditLogListResult } from '../types';
import {
	actorInitials,
	categorizeAuditAction,
	describeAuditAction,
	formatAuditMetadata,
	formatAuditResource,
} from '../utils/auditDisplay';
import { capitalizeStatus, formatDateTime } from '../utils/format';
import styles from './AuditView.module.css';

const DEFAULT_PAGE_SIZE = 50;

export function AuditView() {
	const { session } = useSession();
	const data = useDataService();
	const [entries, setEntries] = useState<AuditLogEntry[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const isAdmin = session?.role === 'admin';

	useEffect(() => {
		if (!isAdmin) {
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		void data
			.fetchAuditLog(undefined, { page, pageSize: DEFAULT_PAGE_SIZE })
			.then((result) => {
				if (!cancelled && isAuditLogListResult(result)) {
					setEntries(result.entries);
					setPage(result.page);
					setPageSize(result.pageSize);
					setTotal(result.total);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load audit log');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, isAdmin, page, reloadKey]);

	if (!isAdmin) {
		return <Navigate to="/events" replace />;
	}

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const rangeEnd = Math.min(page * pageSize, total);
	const showPagination = total > pageSize;

	if (loading) {
		return (
			<section id="view-audit" className={styles.view}>
				<TopBar title="Audit log" meta="Loading recent activity…" />
				<div className={`card ${styles.card}`}>
					<LoadingState message="Loading audit entries…" variant="panel" skeleton="table" skeletonRows={8} />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<ViewErrorState
				viewId="view-audit"
				title="Audit log"
				message={error}
				onRetry={() => {
					setError(null);
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	const meta =
		total > 0
			? `${total} entries · showing ${rangeStart}–${rangeEnd} · admin only`
			: 'No audit entries yet · admin only';

	return (
		<section id="view-audit" className={styles.view}>
			<TopBar
				title="Audit log"
				meta={meta}
			/>

			<div className={`card ${styles.card}`}>
				<div className={styles.tableWrap}>
					<div className={styles.feedScroll}>
						{entries.length === 0 ? (
							<p className={styles.empty}>No audit entries recorded yet.</p>
						) : (
							<ul className={styles.feed}>
								{entries.map((entry) => {
									const metadataLine = formatAuditMetadata(entry.metadata);
									const resourceLine = `${formatAuditResource(entry)}${entry.eventId ? ` · event ${entry.eventId}` : ''}`;
									const isFailure = entry.outcome.toLowerCase() !== 'success';
									return (
										<li key={entry.id} className={styles.feedRow}>
											<span className={styles.avatar} aria-hidden="true">
												{actorInitials(entry.actor)}
											</span>
											<div className={styles.feedContent}>
												<p className={styles.actionLine}>
													<strong>{entry.actor}</strong> <span>{describeAuditAction(entry.action)}</span>
												</p>
												<p className={styles.metaLine}>
													{formatDateTime(entry.timestamp)} ·{' '}
													<span
														className={`badge ${isFailure ? 'badge--cancelled' : 'badge--checked-in'}`}
													>
														{capitalizeStatus(entry.outcome)}
													</span>{' '}
													· {resourceLine}
												</p>
												<p className={styles.detailsLine}>
													<span className={styles.actionCode}>{entry.action}</span>
													{metadataLine ? <> · {metadataLine}</> : null}
												</p>
											</div>
											<span className={`badge badge--draft ${styles.categoryBadge}`}>
												{categorizeAuditAction(entry.action)}
											</span>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>

				{showPagination ? (
					<div className={styles.pagination}>
						<p>
							Page {page} of {totalPages}
						</p>
						<div className={styles.paginationControls}>
							<button
								type="button"
								className="btn btn-outline"
								disabled={page <= 1}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								Previous
							</button>
							<button
								type="button"
								className="btn btn-outline"
								disabled={page >= totalPages}
								onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
							>
								Next
							</button>
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}
