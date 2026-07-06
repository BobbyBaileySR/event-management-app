import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import type { AgendaSession, Event } from '../types';
import styles from './AgendaView.module.css';

export function AgendaView() {
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [event, setEvent] = useState<Event | null>(null);
	const [sessions, setSessions] = useState<AgendaSession[]>([]);
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

		Promise.all([data.fetchEvent(eventId), data.fetchAgenda(eventId)])
			.then(([eventResult, agendaResult]) => {
				if (cancelled) {
					return;
				}
				if (!eventResult.event) {
					setEvent(null);
					setSessions([]);
					return;
				}
				setEvent(eventResult.event);
				setSessions(agendaResult.sessions);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load agenda');
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
				viewId="view-agenda"
				message="Select an event from All Events to view the agenda."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return (
			<section id="view-agenda" className={styles.view}>
				<TopBar title="Agenda" meta="Loading sessions…" />
				<div className="card">
					<LoadingState message="Loading agenda…" variant="panel" skeleton="table" />
				</div>
			</section>
		);
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-agenda"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	return (
		<section id="view-agenda" className={styles.view}>
			<TopBar title={`${event.name} — Agenda`} meta="Session schedule for staff and on-site teams" />

			<div className="card">
				<div className="card__header">
					<h3>Session schedule</h3>
					<button type="button" className="btn btn-outline btn-sm" disabled={sessions.length === 0}>
						Export PDF
					</button>
				</div>

				<div className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Time</th>
								<th>Session</th>
								<th>Speaker</th>
								<th>Room</th>
								<th>Track</th>
							</tr>
						</thead>
						<tbody>
							{sessions.length === 0 ? (
								<tr>
									<td colSpan={5}>No sessions published yet. Agenda syncs from HubSpot in a later phase.</td>
								</tr>
							) : (
								sessions.map((session) => (
									<tr key={session.id}>
										<td>{session.time}</td>
										<td>
											<strong>{session.title}</strong>
										</td>
										<td>{session.speaker}</td>
										<td>{session.location}</td>
										<td>
											<span className="badge badge--draft">{session.track}</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<p className="empty-state__hint">
					Agenda editing and speaker assignments connect to HubSpot custom properties in a later phase.
				</p>
			</div>
		</section>
	);
}
