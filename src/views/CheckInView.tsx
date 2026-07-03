import { useEffect, useMemo, useState } from 'react';
import { filterAttendees, searchAttendees } from '../data/mockData';
import { EmptyState } from '../components/EmptyState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import type { Attendee, Event } from '../types';
import styles from './CheckInView.module.css';

const CHECK_IN_FILTER = 'Registered' as const;
const MAX_VISIBLE_ROWS = 8;

export function CheckInView() {
	const { showToast } = useToast();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [event, setEvent] = useState<Event | null>(null);
	const [attendees, setAttendees] = useState<Attendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
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

		Promise.all([data.fetchEvent(eventId), data.fetchAttendees(eventId)])
			.then(([eventResult, attendeesResult]) => {
				if (cancelled) {
					return;
				}
				if (!eventResult.event) {
					setEvent(null);
					setAttendees([]);
					return;
				}
				setEvent(eventResult.event);
				setAttendees(attendeesResult.attendees);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load check-in');
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

	const visibleAttendees = useMemo(() => {
		const pool = filterAttendees(CHECK_IN_FILTER, attendees);
		return searchAttendees(searchQuery, pool).slice(0, MAX_VISIBLE_ROWS);
	}, [attendees, searchQuery]);

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-check-in"
				message="Select an event from All Events to open check-in."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return <div className="loading">Loading check-in…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-check-in"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	return (
		<section id="view-check-in" className={styles.view}>
			<TopBar title={`${event.name} — Check-in`} meta="On-site and virtual arrival desk (PoC shell)" />

			<div className="grid-2">
				<div className="card">
					<div className="card__header">
						<h3>Find attendee</h3>
					</div>
					<input
						type="search"
						className="search-input"
						placeholder="Search by name, email, or company…"
						value={searchQuery}
						onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
						aria-label="Search attendees for check-in"
					/>
					<p className="shell-note">Showing Registered contacts ready for check-in.</p>
					<div className="table-scroll table-scroll--short">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Company</th>
									<th>Ticket</th>
									<th aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{visibleAttendees.length === 0 ? (
									<tr>
										<td colSpan={4}>No matching registrants.</td>
									</tr>
								) : (
									visibleAttendees.map((person) => (
										<tr key={person.id}>
											<td>{person.name}</td>
											<td>{person.company}</td>
											<td>{person.ticketType || 'General'}</td>
											<td>
												<button
													type="button"
													className="btn btn-outline btn-sm"
													onClick={() =>
														showToast(`${person.name} checked in (PoC — no HubSpot write yet).`, 'success')
													}
												>
													Check in
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="card card--accent">
					<div className="card__header">
						<h3>QR scan (coming soon)</h3>
					</div>
					<div className="qr-placeholder">
						<span className="qr-placeholder__icon" aria-hidden="true">
							▦
						</span>
						<p>Camera / QR scanner connects in a later phase.</p>
					</div>
					<button type="button" className="btn btn-primary" disabled>
						Mark selected as checked in
					</button>
					<p className="empty-state__hint">
						Write-back to HubSpot attendee status is Phase 5+. Use row action below for PoC demo.
					</p>
				</div>
			</div>
		</section>
	);
}
