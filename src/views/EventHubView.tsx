import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HUB_MODULE_CARDS } from '../config/eventModules';
import { CapacityBar } from '../components/CapacityBar';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { TopBar } from '../components/TopBar';
import { useDataService } from '../hooks/useDataService';
import { eventPath, useActiveRoute } from '../router/navigation';
import type { ActivityItem, AnalyticsConversion, Event } from '../types';
import { formatDateTime } from '../utils/format';
import styles from './EventHubView.module.css';

export function EventHubView() {
	const navigate = useNavigate();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<Event | null>(null);
	const [conversion, setConversion] = useState<AnalyticsConversion>({ checkedIn: 0, registered: 0, cancelled: 0 });
	const [activity, setActivity] = useState<ActivityItem[]>([]);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		Promise.all([data.fetchEvent(eventId), data.fetchAnalytics(eventId), data.fetchActivity(eventId)])
			.then(([eventResult, analyticsResult, activityResult]) => {
				if (cancelled) {
					return;
				}
				if (!eventResult.event) {
					setEvent(null);
					return;
				}
				setEvent(eventResult.event);
				setConversion(analyticsResult.conversion);
				setActivity(activityResult.activity);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load event');
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

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-event-hub"
				message="Select an event from All Events to open the Event Hub."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return (
			<section id="view-event-hub" className={styles.view}>
				<TopBar title="Event Hub" meta="Loading event overview…" />
				<LoadingState message="Loading event…" skeleton="cards" />
			</section>
		);
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-event-hub"
				message={`Event "${eventId}" was not found.`}
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	const totalAttendees = conversion.checkedIn + conversion.registered + conversion.cancelled;

	return (
		<section id="view-event-hub" className={styles.view}>
			<TopBar
				title={event.name}
				meta={[event.type, event.date, event.location].join(' · ')}
				trailing={<StatusBadge status={event.status} />}
			/>

			<div className="card">
				<CapacityBar value={totalAttendees} capacity={event.capacity} />
				<p className="shell-note">{event.description}</p>
			</div>

			<div className="hub-stats grid-3">
				<div className="card hub-stat">
					<p className="hub-stat__label">Total linked</p>
					<p className="hub-stat__value">{totalAttendees}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Registered</p>
					<p className="hub-stat__value">{conversion.registered}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Checked in</p>
					<p className="hub-stat__value">{conversion.checkedIn}</p>
				</div>
			</div>

			<div className="form-row">
				<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(eventPath(event.id, 'email'))}>
					Send reminder
				</button>
				<button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(eventPath(event.id, 'check-in'))}>
					Open check-in
				</button>
				<button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(eventPath(event.id, 'agenda'))}>
					View agenda
				</button>
			</div>

			<div className="grid-2">
				<div className="hub-modules">
					<h2 className="hub-modules__title">Event modules</h2>
					<div className="hub-modules__grid hub-modules__grid--2">
						{HUB_MODULE_CARDS.map((module) => (
							<button
								key={module.id}
								type="button"
								className="hub-module card"
								onClick={() => navigate(eventPath(event.id, module.id))}
							>
								<span className="hub-module__icon" aria-hidden="true">
									{module.icon}
								</span>
								<h3>{module.label}</h3>
								<p>{module.description ?? ''}</p>
							</button>
						))}
					</div>
				</div>

				<div className="card">
					<div className="card__header">
						<h3>Recent activity</h3>
					</div>
					<ul className="activity-list">
						{activity.length === 0 ? (
							<li>No recent activity.</li>
						) : (
							activity.map((item) => (
								<li key={item.id}>
									<strong>{item.summary}</strong>
									<div className="activity-list__meta">
										{item.actor} · {formatDateTime(item.timestamp)}
									</div>
								</li>
							))
						)}
					</ul>
				</div>
			</div>
		</section>
	);
}
