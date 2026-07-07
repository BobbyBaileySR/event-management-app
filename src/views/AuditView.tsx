import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import type { AuditLogEntry } from '../types';
import { formatAuditMetadata, formatAuditResource } from '../utils/auditDisplay';
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
				if (!cancelled) {
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
	}, [data, isAdmin, page]);

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
		return <div className="empty-state">{error}</div>;
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
					<div className={`table-scroll ${styles.tableScroll}`}>
						<table>
							<thead>
								<tr>
									<th>Time</th>
									<th className={styles.colAction}>Action</th>
									<th>Actor</th>
									<th>Outcome</th>
									<th>Resource</th>
									<th className={styles.colDetails}>Details</th>
								</tr>
							</thead>
							<tbody>
								{entries.length === 0 ? (
									<tr>
										<td colSpan={6}>No audit entries recorded yet.</td>
									</tr>
								) : (
									entries.map((entry) => {
										const metadataLine = formatAuditMetadata(entry.metadata);
										return (
											<tr key={entry.id}>
												<td>{formatDateTime(entry.timestamp)}</td>
												<td className={styles.colAction}>{entry.action}</td>
												<td>{entry.actor}</td>
												<td>{capitalizeStatus(entry.outcome)}</td>
												<td>
													{formatAuditResource(entry)}
													{entry.eventId ? ` · event ${entry.eventId}` : null}
												</td>
												<td className={styles.colDetails}>{metadataLine ?? '—'}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
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
