import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { eventPath } from '../router/navigation';
import type { AuditLogEntry } from '../types';
import { isAuditLogListResult } from '../types';
import { describeAuditAction } from '../utils/auditDisplay';
import { getOccupancyPercent } from '../utils/capacityTier';
import { enrichPortfolioWithCapacity, type PortfolioEvent } from '../utils/catalogEventPresentation';
import { formatDateTime } from '../utils/format';
import { getUpcomingEvents, isInSameMonth, isWithinNextDays } from '../utils/overviewStats';
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

async function loadStats(
	portfolio: PortfolioEvent[],
	data: ReturnType<typeof useDataService>,
	now: Date,
): Promise<OverviewStats> {
	const eventsThisMonth = portfolio.filter((event) => isInSameMonth(event.dateIso, now));
	const programsThisMonth = new Set(eventsThisMonth.map((event) => event.programId).filter(Boolean)).size;
	const totalRegistered = portfolio.reduce((sum, event) => sum + event.attendeeCount, 0);

	// Neither the catalog nor the capacity fan-out carries a registration timestamp (slice
	// attendees have no registeredAt), so "this week" can't be derived — surface 0 rather
	// than a guessed value.
	const registeredThisWeek = 0;

	// Cancelled/completed events won't gain new sends, so only fan out over active ones.
	const activeEvents = portfolio.filter((event) => event.status === 'active');
	const scheduledByEvent = await Promise.all(activeEvents.map((event) => data.fetchScheduledEmails(event.id)));

	let emailsScheduledThisWeek = 0;
	let eventsWithScheduledEmails = 0;
	scheduledByEvent.forEach(({ scheduled }) => {
		const upcoming = scheduled.filter((email) => isWithinNextDays(email.scheduledAt, 7, now));
		emailsScheduledThisWeek += upcoming.length;
		if (upcoming.length > 0) {
			eventsWithScheduledEmails += 1;
		}
	});

	return {
		eventsThisMonth: eventsThisMonth.length,
		programsThisMonth,
		totalRegistered,
		registeredThisWeek,
		eventsWithScheduledEmails,
		emailsScheduledThisWeek,
	};
}

export function OverviewView() {
	const navigate = useNavigate();
	const data = useDataService();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [portfolio, setPortfolio] = useState<PortfolioEvent[]>([]);
	const [stats, setStats] = useState<OverviewStats | null>(null);
	const [activity, setActivity] = useState<AuditLogEntry[]>([]);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		const now = new Date();

		Promise.all([data.fetchCatalog(), data.fetchAuditLog(undefined, { page: 1, pageSize: RECENT_ACTIVITY_LIMIT })])
			.then(async ([catalogResult, auditResult]) => {
				if (cancelled) {
					return;
				}
				if (isAuditLogListResult(auditResult)) {
					setActivity(auditResult.entries.slice(0, RECENT_ACTIVITY_LIMIT));
				}
				const enriched = await enrichPortfolioWithCapacity(
					catalogResult.events,
					catalogResult.programs,
					(eventId) => data.fetchEventCapacityStatus(eventId),
					now,
				);
				if (cancelled) {
					return;
				}
				setPortfolio(enriched);
				const computed = await loadStats(enriched, data, now);
				if (!cancelled) {
					setStats(computed);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load overview');
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
	}, [data, reloadKey]);

	const upcomingEvents = useMemo(() => getUpcomingEvents(portfolio, 4), [portfolio]);

	if (loading) {
		return (
			<section id="view-overview" className={styles.view}>
				<TopBar title="Overview" meta="Everything happening across your events" />
				<LoadingState message="Loading overview…" skeleton="cards" />
			</section>
		);
	}

	if (error) {
		return (
			<ViewErrorState
				viewId="view-overview"
				title="Overview"
				message={error}
				onRetry={() => {
					setError(null);
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	const tiles = stats
		? [
				{
					label: 'Events this month',
					value: stats.eventsThisMonth,
					delta: stats.programsThisMonth > 0 ? `Across ${stats.programsThisMonth} program${stats.programsThisMonth === 1 ? '' : 's'}` : 'No programs linked',
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

			<div className="grid-4">
				{tiles.map((tile) => (
					<div className="card hub-stat" key={tile.label}>
						<p className="hub-stat__label">{tile.label}</p>
						<p className="hub-stat__value">{tile.value}</p>
						<p className="hub-stat__delta">{tile.delta}</p>
					</div>
				))}
			</div>

			<div className="grid-2">
				<div className="card">
					<div className="card__header">
						<div className={styles.cardHeaderRow}>
							<h2>Upcoming events</h2>
							<button type="button" className={styles.linkButton} onClick={() => navigate('/events')}>
								View all ›
							</button>
						</div>
					</div>
					{upcomingEvents.length === 0 ? (
						<p className="shell-note">No upcoming events.</p>
					) : (
						<ul className={styles.eventList}>
							{upcomingEvents.map((event) => {
								const pct = getOccupancyPercent(event.attendeeCount, event.capacity);
								return (
									<li key={event.id} className={styles.eventRow}>
										<button
											type="button"
											className={styles.eventRowButton}
											aria-label={`Open ${event.name}`}
											onClick={() => navigate(eventPath(event.id))}
										>
											<span className={styles.eventDate} aria-hidden="true">
												{event.date}
											</span>
											<span className={styles.eventInfo}>
												<span className={styles.eventName}>{event.name}</span>
												<span className={styles.eventLocation}>{event.location}</span>
											</span>
											<span className={styles.eventCapacity}>
												<span className={styles.eventCapacityLabel}>
													{event.attendeeCount}/{event.capacity} · {pct}%
												</span>
												<span className={styles.miniBarTrack}>
													<span
														className={`${styles.miniBarFill} ${pct >= 90 ? styles.miniBarFillWarning : ''}`}
														style={{ width: `${Math.min(100, pct)}%` }}
													/>
												</span>
											</span>
											<StatusBadge status={event.status} />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className="card">
					<div className="card__header">
						<h2>Recent activity</h2>
					</div>
					<ul className="activity-list">
						{activity.length === 0 ? (
							<li>No recent activity.</li>
						) : (
							activity.map((entry) => (
								<li key={entry.id}>
									<span className={styles.activityRow}>
										<span className={styles.activityDot} aria-hidden="true" />
										<span>
											<strong>{entry.actor}</strong> {describeAuditAction(entry.action)}
											<span className="activity-list__meta">{formatDateTime(entry.timestamp)}</span>
										</span>
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
