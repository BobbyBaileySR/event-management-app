import { useEffect, useMemo, useState } from 'react';
import { ConversionChart } from '../components/ConversionChart';
import { EmptyState } from '../components/EmptyState';
import { TopBar } from '../components/TopBar';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import type { AnalyticsConversion, AuditEntry, CampaignMetrics, Event } from '../types';
import { formatDateTime } from '../utils/format';
import styles from './AnalyticsView.module.css';

export function AnalyticsView() {
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [event, setEvent] = useState<Event | null>(null);
	const [conversion, setConversion] = useState<AnalyticsConversion>({ checkedIn: 0, registered: 0, cancelled: 0 });
	const [metrics, setMetrics] = useState<CampaignMetrics>({ sent: 0, opened: 0, clicked: 0, bounced: 0 });
	const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		Promise.all([
			data.fetchEvent(eventId),
			data.fetchAnalytics(eventId),
			data.fetchCampaignMetrics(eventId),
			data.fetchAuditLog(eventId),
		])
			.then(([eventResult, analyticsResult, metricsResult, auditResult]) => {
				if (cancelled) {
					return;
				}
				if (!eventResult.event) {
					setEvent(null);
					return;
				}
				setEvent(eventResult.event);
				setConversion(analyticsResult.conversion);
				setMetrics(metricsResult.metrics);
				setAuditEntries(auditResult.entries);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load analytics');
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
	}, [data, eventId]);

	const totalRegistrations = conversion.checkedIn + conversion.registered + conversion.cancelled;
	const rates = useMemo(() => {
		const { sent, opened, clicked, bounced } = metrics;
		return {
			openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
			clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
			bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
		};
	}, [metrics]);

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-analytics"
				message="Select an event from All Events to view analytics."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return <div className="loading">Loading analytics…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-analytics"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	const checkInRate = totalRegistrations > 0 ? Math.round((conversion.checkedIn / totalRegistrations) * 100) : 0;

	return (
		<section id="view-analytics" className={styles.view}>
			<TopBar
				title={`${event.name} — Analytics`}
				meta="Registration funnel and email performance (sample metrics)"
			/>

			<div className="hub-stats grid-3">
				<div className="card hub-stat">
					<p className="hub-stat__label">Registrations</p>
					<p className="hub-stat__value">{totalRegistrations}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Check-in rate</p>
					<p className="hub-stat__value">{totalRegistrations > 0 ? `${checkInRate}%` : '0%'}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Emails sent</p>
					<p className="hub-stat__value">{metrics.sent}</p>
				</div>
			</div>

			<div className="grid-2">
				<div className="card">
					<h3 className="card__header">Registration funnel</h3>
					{totalRegistrations > 0 ? (
						<ConversionChart conversion={conversion} />
					) : (
						<p className="empty-state__hint">No registration data for this event.</p>
					)}
				</div>

				<div className="card">
					<h3 className="card__header">Campaign metrics</h3>
					<ul className="stats-list">
						<li>
							<strong>Sent</strong>
							<span>{metrics.sent}</span>
						</li>
						<li>
							<strong>Opened</strong>
							<span>
								{metrics.opened} ({rates.openRate}%)
							</span>
						</li>
						<li>
							<strong>Clicked</strong>
							<span>
								{metrics.clicked} ({rates.clickRate}%)
							</span>
						</li>
						<li>
							<strong>Bounced</strong>
							<span>
								{metrics.bounced} ({rates.bounceRate}%)
							</span>
						</li>
					</ul>
				</div>
			</div>

			<div className="card">
				<h3 className="card__header">Recent sends</h3>
				<ul className="audit-list">
					{auditEntries.length === 0 ? (
						<li>No sends recorded for this event yet.</li>
					) : (
						auditEntries.map((entry) => (
							<li key={entry.id}>
								<strong>
									{entry.templateName} — {entry.recipientCount} recipients
								</strong>
								<div className="audit-list__meta">
									{entry.outcome} by {entry.actorEmail} · {formatDateTime(entry.timestamp)}
								</div>
							</li>
						))
					)}
				</ul>
			</div>
		</section>
	);
}
