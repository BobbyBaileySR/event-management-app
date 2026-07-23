import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { RefetchFailureBanner } from '../components/RefetchFailureBanner';
import { StatusBadge } from '../components/StatusBadge';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useCapacitySummary } from '../data/hooks/useCapacity';
import { useCatalog } from '../data/hooks/useCatalog';
import { useAuditLog } from '../data/hooks/useAuditLog';
import { useScheduledDispatchSummary } from '../data/hooks/useDispatches';
import { eventPath } from '../router/navigation';
import type { AuditLogEntry } from '../types';
import { isAuditLogListResult } from '../types';
import { describeAuditAction } from '../utils/auditDisplay';
import { getOccupancyPercent } from '../utils/capacityTier';
import { enrichPortfolioWithCapacity, type PortfolioEvent } from '../utils/catalogEventPresentation';
import { formatDateTime } from '../utils/format';
import { getEventDateBadgeParts, getUpcomingEvents, isInSameMonth } from '../utils/overviewStats';
import styles from './OverviewView.module.css';

const RECENT_ACTIVITY_LIMIT = 5;

interface OverviewStats {
	eventsThisMonth: number;
	programsThisMonth: number;
	totalRegistered: number;
	registeredThisWeek: number;
	eventsWithScheduledEmails: number;
	emailsScheduledThisWeek: number;
}

export function OverviewView() {
	const navigate = useNavigate();

	const catalogQuery = useCatalog();
	const capacitySummaryQuery = useCapacitySummary();
	const auditQuery = useAuditLog({ page: 1, pageSize: RECENT_ACTIVITY_LIMIT });
	const dispatchSummaryQuery = useScheduledDispatchSummary();

	const portfolio: PortfolioEvent[] = useMemo(
		() =>
			enrichPortfolioWithCapacity(
				catalogQuery.data?.events ?? [],
				catalogQuery.data?.programs ?? [],
				capacitySummaryQuery.data?.events,
			),
		[catalogQuery.data, capacitySummaryQuery.data],
	);

	const upcomingEvents = useMemo(() => getUpcomingEvents(portfolio, 4), [portfolio]);

	const activity: AuditLogEntry[] = useMemo(() => {
		const result = auditQuery.data;
		if (!result || !isAuditLogListResult(result)) {
			return [];
		}
		return result.entries.slice(0, RECENT_ACTIVITY_LIMIT);
	}, [auditQuery.data]);

	// Neither the catalog nor the capacity summary carries a registration timestamp (slice
	// attendees have no registeredAt), so "this week" can't be derived — surface 0 rather
	// than a guessed value.
	const stats: OverviewStats | null = useMemo(() => {
		if (!dispatchSummaryQuery.data) {
			return null;
		}
		const now = new Date();
		const eventsThisMonth = portfolio.filter((event) => isInSameMonth(event.dateIso, now));
		const programsThisMonth = new Set(eventsThisMonth.map((event) => event.programId).filter(Boolean)).size;
		const totalRegistered = portfolio.reduce((sum, event) => sum + event.attendeeCount, 0);
		return {
			eventsThisMonth: eventsThisMonth.length,
			programsThisMonth,
			totalRegistered,
			registeredThisWeek: 0,
			eventsWithScheduledEmails: dispatchSummaryQuery.data.eventsWithScheduledEmails,
			emailsScheduledThisWeek: dispatchSummaryQuery.data.emailsScheduledThisWeek,
		};
	}, [portfolio, dispatchSummaryQuery.data]);

	// Catalog, recent-activity and the scheduled-email aggregate gate first paint (matches the
	// prior combined-effect ladder); capacity summary is enrichment only — its failure never
	// blanks the page (per-row fallback in enrichPortfolioWithCapacity), same as EventsView.
	const blockingQueries = [catalogQuery, auditQuery, dispatchSummaryQuery];
	const isLoading = blockingQueries.some((query) => query.data === undefined && !query.isError);
	const loadErrorQuery = blockingQueries.find((query) => query.data === undefined && query.isError);

	function refreshAll() {
		return Promise.all([
			catalogQuery.refetch(),
			capacitySummaryQuery.refetch(),
			auditQuery.refetch(),
			dispatchSummaryQuery.refetch(),
		]);
	}

	if (isLoading) {
		return (
			<section id="view-overview" className={styles.view}>
				<TopBar title="Overview" meta="Everything happening across your events" />
				<LoadingState message="Loading overview…" />
			</section>
		);
	}

	if (loadErrorQuery) {
		const message = loadErrorQuery.error instanceof Error ? loadErrorQuery.error.message : 'Failed to load overview';
		return (
			<ViewErrorState viewId="view-overview" title="Overview" message={message} onRetry={() => void refreshAll()} />
		);
	}

	const showRefetchFailureBanner = blockingQueries.some((query) => query.isError) || capacitySummaryQuery.isError;

	const tiles = stats
		? [
				{
					label: 'Events this month',
					value: stats.eventsThisMonth,
					delta:
						stats.programsThisMonth > 0
							? `Across ${stats.programsThisMonth} program${stats.programsThisMonth === 1 ? '' : 's'}`
							: 'No programs linked',
				},
				{
					label: 'Total registered',
					value: stats.totalRegistered.toLocaleString(),
					delta: `+${stats.registeredThisWeek} this week`,
				},
				{
					label: 'Registered this week',
					value: stats.registeredThisWeek,
					delta: 'Across all events',
				},
				{
					label: 'Emails scheduled this week',
					value: stats.emailsScheduledThisWeek,
					delta: `Across ${stats.eventsWithScheduledEmails} event${stats.eventsWithScheduledEmails === 1 ? '' : 's'}`,
				},
			]
		: [];

	return (
		<section id="view-overview" className={styles.view}>
			<TopBar title="Overview" meta="Everything happening across your events" />

			{showRefetchFailureBanner ? (
				<RefetchFailureBanner
					message="Couldn't refresh overview data — showing the last loaded values."
					onRetry={() => void refreshAll()}
				/>
			) : null}

			<div className={styles.statsGrid}>
				{tiles.map((tile) => (
					<div className={styles.statTile} key={tile.label}>
						<span className={styles.statAccent} aria-hidden="true" />
						<p className={styles.statValue}>{tile.value}</p>
						<p className={styles.statLabel}>{tile.label}</p>
						<p className={styles.statDelta}>{tile.delta}</p>
					</div>
				))}
			</div>

			<div className={styles.split}>
				<div className={styles.upcomingCard}>
					<div className={styles.cardHeaderRow}>
						<h2 className={styles.cardTitle}>Upcoming events</h2>
						<button type="button" className={styles.linkButton} onClick={() => navigate('/events')}>
							View all ›
						</button>
					</div>
					{upcomingEvents.length === 0 ? (
						<p className={styles.emptyNote}>No upcoming events.</p>
					) : (
						<ul className={styles.eventList}>
							{upcomingEvents.map((event) => {
								const pct = getOccupancyPercent(event.attendeeCount, event.capacity);
								const { month, day } = getEventDateBadgeParts(event.dateIso);
								return (
									<li key={event.id} className={styles.eventRow}>
										<button
											type="button"
											className={styles.eventRowButton}
											aria-label={`Open ${event.name}`}
											onClick={() => navigate(eventPath(event.id))}
										>
											<span className={styles.dateBadge} aria-hidden="true">
												<span className={styles.dateBadgeMonth}>{month}</span>
												<span className={styles.dateBadgeDay}>{day}</span>
											</span>
											<span className={styles.eventInfo}>
												<span className={styles.eventName}>{event.name}</span>
												<span className={styles.eventLocation}>{event.location}</span>
											</span>
											<span className={styles.eventCapacity}>
												<span className={styles.eventCapacityLabel}>
													<span>
														{event.attendeeCount}/{event.capacity}
													</span>
													<span className={styles.eventCapacityPct}>{pct}%</span>
												</span>
												<span className={styles.miniBarTrack}>
													<span
														className={`${styles.miniBarFill} ${pct >= 90 ? styles.miniBarFillWarning : ''}`}
														style={{ width: `${Math.min(100, pct)}%` }}
													/>
												</span>
											</span>
											<span className={styles.eventStatus}>
												<StatusBadge status={event.status} />
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className={styles.activityCard}>
					<h2 className={styles.cardTitle}>Recent activity</h2>
					<ul className={styles.activityList}>
						{activity.length === 0 ? (
							<li className={styles.emptyNote}>No recent activity.</li>
						) : (
							activity.map((entry) => (
								<li key={entry.id} className={styles.activityRow}>
									<span className={styles.activityDot} aria-hidden="true" />
									<span className={styles.activityBody}>
										<p className={styles.activityText}>
											<strong>{entry.actor}</strong> {describeAuditAction(entry.action)}
										</p>
										<p className={styles.activityMeta}>{formatDateTime(entry.timestamp)}</p>
									</span>
								</li>
							))
						)}
					</ul>
				</div>
			</div>
		</section>
	);
}
