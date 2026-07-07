import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterEventsByStatus, getPortfolioStats, searchEvents } from '../utils/listFilters';
import { useDataService } from '../hooks/useDataService';
import type { Event, EventStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { eventPath } from '../router/navigation';
import styles from './EventsView.module.css';

type StatusFilter = 'all' | EventStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'active', label: 'Active' },
	{ id: 'draft', label: 'Draft' },
	{ id: 'completed', label: 'Past' },
	{ id: 'cancelled', label: 'Cancelled' },
];

export function EventsView() {
	const navigate = useNavigate();
	const data = useDataService();
	const [allEvents, setAllEvents] = useState<Event[]>([]);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		data
			.fetchEvents()
			.then(({ events }) => {
				if (!cancelled) {
					setAllEvents(events);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load events');
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
	}, [data]);

	const filteredEvents = useMemo(
		() => searchEvents(searchQuery, filterEventsByStatus(statusFilter, allEvents)),
		[allEvents, searchQuery, statusFilter],
	);
	const stats = useMemo(() => getPortfolioStats(allEvents), [allEvents]);

	if (loading) {
		return (
			<section id="view-events" className={styles.view}>
				<TopBar title="All Events" meta="Loading portfolio…" />
				<LoadingState message="Loading events…" skeleton="cards" />
			</section>
		);
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	return (
		<section id="view-events" className={styles.view}>
			<TopBar title="All Events" meta="Portfolio overview — sample HubSpot events (PoC mock data)" />

			<div className="hub-stats grid-3">
				<div className="card hub-stat">
					<p className="hub-stat__label">Total events</p>
					<p className="hub-stat__value">{stats.total}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Active</p>
					<p className="hub-stat__value">{stats.active}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Total registrations</p>
					<p className="hub-stat__value">{stats.registrations}</p>
				</div>
			</div>

			<div className="card">
				<div className="toolbar">
					<div className="filter-row">
						{STATUS_FILTERS.map(({ id, label }) => (
							<button
								key={id}
								type="button"
								className={`btn btn-outline btn-sm${statusFilter === id ? ' active' : ''}`}
								onClick={() => setStatusFilter(id)}
							>
								{label}
							</button>
						))}
					</div>
					<input
						type="search"
						className="search-input"
						placeholder="Search events…"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						aria-label="Search events"
					/>
				</div>

				<div className="table-scroll">
					<table>
					<thead>
						<tr>
							<th>Event</th>
							<th>Date</th>
							<th>Location</th>
							<th>Registrations</th>
							<th>Status</th>
							<th aria-label="Actions" />
						</tr>
					</thead>
					<tbody>
						{filteredEvents.length === 0 ? (
							<tr>
								<td colSpan={6}>No events match your filters.</td>
							</tr>
						) : (
							filteredEvents.map((event) => (
								<tr key={event.id}>
									<td>
										<strong>{event.name}</strong>
									</td>
									<td>{event.date}</td>
									<td>{event.location}</td>
									<td>
										{event.attendeeCount} / {event.capacity}
									</td>
									<td>
										<StatusBadge status={event.status} />
									</td>
									<td>
										<button
											type="button"
											className="btn btn-outline btn-sm"
											onClick={() => navigate(eventPath(event.id))}
										>
											Open
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				</div>
			</div>
		</section>
	);
}
