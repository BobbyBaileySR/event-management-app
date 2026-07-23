import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { RefetchFailureBanner } from '../components/RefetchFailureBanner';
import { SelectPicker } from '../components/pickers/SelectPicker';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useAuditLog } from '../data/hooks/useAuditLog';
import { describeQueryStatus } from '../data/queryStatus';
import { useSession } from '../state/appState';
import { isAuditLogListResult } from '../types';
import {
	KNOWN_AUDIT_ACTIONS,
	KNOWN_AUDIT_RESOURCE_TYPES,
	actorInitials,
	categorizeAuditAction,
	describeAuditAction,
	formatAuditMetadata,
	formatAuditResource,
} from '../utils/auditDisplay';
import { capitalizeStatus, formatDateTime } from '../utils/format';
import styles from './AuditView.module.css';

const DEFAULT_PAGE_SIZE = 50;

interface AuditFilters {
	action: string;
	actor: string;
	resourceType: string;
	resourceId: string;
}

const EMPTY_FILTERS: AuditFilters = { action: '', actor: '', resourceType: '', resourceId: '' };

function hasAnyFilter(filters: AuditFilters): boolean {
	return Boolean(filters.action || filters.actor || filters.resourceType || filters.resourceId);
}

export function AuditView() {
	const { session } = useSession();
	const isAdmin = session?.role === 'admin';
	const [page, setPage] = useState(1);
	const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);
	const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(EMPTY_FILTERS);

	const actionOptions = useMemo(
		() => [{ value: '', label: 'All actions' }, ...KNOWN_AUDIT_ACTIONS.map((action) => ({ value: action, label: action }))],
		[],
	);
	const resourceTypeOptions = useMemo(
		() => [
			{ value: '', label: 'All resource types' },
			...KNOWN_AUDIT_RESOURCE_TYPES.map((resourceType) => ({ value: resourceType, label: resourceType })),
		],
		[],
	);

	const auditQuery = useAuditLog(
		{
			page,
			pageSize: DEFAULT_PAGE_SIZE,
			action: appliedFilters.action || undefined,
			actor: appliedFilters.actor || undefined,
			resourceType: appliedFilters.resourceType || undefined,
			resourceId: appliedFilters.resourceId || undefined,
		},
		{ enabled: isAdmin },
	);

	if (!isAdmin) {
		return <Navigate to="/events" replace />;
	}

	function handleApply() {
		setPage(1);
		setAppliedFilters(draftFilters);
	}

	function handleClear() {
		setPage(1);
		setDraftFilters(EMPTY_FILTERS);
		setAppliedFilters(EMPTY_FILTERS);
	}

	const auditStatus = describeQueryStatus(auditQuery, 'Failed to load audit log');

	if (auditStatus.kind === 'loading') {
		return (
			<section id="view-audit" className={styles.view}>
				<TopBar title="Audit log" meta="Loading recent activity…" />
				<LoadingState message="Loading audit entries…" />
			</section>
		);
	}

	if (auditStatus.kind === 'error') {
		return (
			<ViewErrorState
				viewId="view-audit"
				title="Audit log"
				message={auditStatus.message}
				onRetry={() => void auditQuery.refetch()}
			/>
		);
	}

	const result = auditQuery.data;
	const entries = result && isAuditLogListResult(result) ? result.entries : [];
	const total = result && isAuditLogListResult(result) ? result.total : 0;
	const pageSize = result && isAuditLogListResult(result) ? result.pageSize : DEFAULT_PAGE_SIZE;

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const rangeEnd = Math.min(page * pageSize, total);
	const showPagination = total > pageSize;

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

			{auditStatus.refetchFailed ? (
				<RefetchFailureBanner
					message="Couldn't refresh the audit log — showing the last loaded entries."
					onRetry={() => void auditQuery.refetch()}
				/>
			) : null}

			<div className={`card ${styles.card}`}>
				<div className={`filter-row ${styles.filterBar}`}>
					<SelectPicker
						id="audit-filter-action"
						className={styles.filterField}
						label="Action"
						value={draftFilters.action}
						placeholder="All actions"
						options={actionOptions}
						onChange={(value) => setDraftFilters((current) => ({ ...current, action: value }))}
					/>
					<div className={`form-group ${styles.filterField}`}>
						<label htmlFor="audit-filter-actor">Actor</label>
						<input
							id="audit-filter-actor"
							type="text"
							value={draftFilters.actor}
							placeholder="name@adaptavist.com"
							onChange={(event) =>
								setDraftFilters((current) => ({ ...current, actor: event.target.value }))
							}
						/>
					</div>
					<SelectPicker
						id="audit-filter-resource-type"
						className={styles.filterField}
						label="Resource type"
						value={draftFilters.resourceType}
						placeholder="All resource types"
						options={resourceTypeOptions}
						onChange={(value) => setDraftFilters((current) => ({ ...current, resourceType: value }))}
					/>
					<div className={`form-group ${styles.filterField}`}>
						<label htmlFor="audit-filter-resource-id">Resource ID</label>
						<input
							id="audit-filter-resource-id"
							type="text"
							value={draftFilters.resourceId}
							placeholder="ev-mr-2026"
							onChange={(event) =>
								setDraftFilters((current) => ({ ...current, resourceId: event.target.value }))
							}
						/>
					</div>
					<div className={styles.filterActions}>
						<button type="button" className="btn btn-primary" onClick={handleApply}>
							Apply
						</button>
						<button
							type="button"
							className="btn btn-outline"
							disabled={!hasAnyFilter(draftFilters) && !hasAnyFilter(appliedFilters)}
							onClick={handleClear}
						>
							Clear
						</button>
					</div>
				</div>

				<div className={styles.tableWrap}>
					<div className={styles.feedScroll}>
						{entries.length === 0 ? (
							<p className={styles.empty}>
								{hasAnyFilter(appliedFilters)
									? 'No entries match the selected filters.'
									: 'No audit entries recorded yet.'}
							</p>
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
