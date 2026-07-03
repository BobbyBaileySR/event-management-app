import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterAttendees, searchAttendees } from '../data/mockData';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { eventPath, useActiveRoute } from '../router/navigation';
import type { Attendee, AttendeeStatus, Event } from '../types';
import styles from './AttendeesView.module.css';

type SegmentFilter = AttendeeStatus | 'All';

const SEGMENT_FILTERS: SegmentFilter[] = ['All', 'Registered', 'Checked In', 'Cancelled'];

interface AttendeeDetailProps {
	person: Attendee;
	onSendEmail: () => void;
	onUpdateStatus: () => void;
}

function AttendeeDetail({ person, onSendEmail, onUpdateStatus }: AttendeeDetailProps) {
	return (
		<div className={`attendee-detail card ${styles.detailPanel}`} id="attendee-detail-panel">
			<h3>{person.name}</h3>
			<dl className="detail-list detail-list--inline">
				<dt>Email</dt>
				<dd>{person.email}</dd>
				<dt>Company</dt>
				<dd>{person.company}</dd>
				<dt>Status</dt>
				<dd>{person.status}</dd>
				<dt>Ticket</dt>
				<dd>{person.ticketType || 'General'}</dd>
				<dt>Registered</dt>
				<dd>{person.registeredAt || '—'}</dd>
				<dt>Source</dt>
				<dd>{person.source || '—'}</dd>
			</dl>
			<div className="form-row">
				<button type="button" className="btn btn-outline btn-sm" onClick={onUpdateStatus}>
					Update status
				</button>
				<button type="button" className="btn btn-outline btn-sm" onClick={onSendEmail}>
					Send email
				</button>
			</div>
		</div>
	);
}

export function AttendeesView() {
	const navigate = useNavigate();
	const { showToast } = useToast();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [event, setEvent] = useState<Event | null>(null);
	const [attendees, setAttendees] = useState<Attendee[]>([]);
	const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('All');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
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
		setSelectedAttendeeId(null);

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
					setError(err instanceof Error ? err.message : 'Failed to load attendees');
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

	const filteredAttendees = useMemo(
		() => searchAttendees(searchQuery, filterAttendees(segmentFilter, attendees)),
		[attendees, searchQuery, segmentFilter],
	);

	const selectedAttendee = useMemo(
		() => filteredAttendees.find((person) => person.id === selectedAttendeeId) ?? null,
		[filteredAttendees, selectedAttendeeId],
	);

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-attendees"
				message="Select an event from All Events to view attendees."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return <div className="loading">Loading attendees…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-attendees"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	return (
		<section id="view-attendees" className={styles.view}>
			<TopBar
				title={`${event.name} — Attendees`}
				meta={`${attendees.length} contacts linked · sample HubSpot data`}
			/>

			<div className="card">
				<div className="toolbar">
					<div className="form-row">
						{SEGMENT_FILTERS.map((filter) => (
							<button
								key={filter}
								type="button"
								className={`btn btn-outline${segmentFilter === filter ? ' active' : ''}`}
								onClick={() => {
									setSegmentFilter(filter);
									setSelectedAttendeeId(null);
								}}
							>
								{filter}
							</button>
						))}
					</div>
					<button
						type="button"
						className="btn btn-outline btn-sm"
						onClick={() => showToast('Export downloads in a later phase (PoC mock).', 'success')}
					>
						Export CSV
					</button>
				</div>

				<input
					type="search"
					className="search-input"
					placeholder="Search name, email, or company…"
					value={searchQuery}
					onChange={(changeEvent) => {
						setSearchQuery(changeEvent.target.value);
						setSelectedAttendeeId(null);
					}}
					aria-label="Search attendees"
				/>

				<div className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Email</th>
								<th>Company</th>
								<th>Ticket</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{filteredAttendees.length === 0 ? (
								<tr>
									<td colSpan={5}>No attendees match this filter.</td>
								</tr>
							) : (
								filteredAttendees.map((person) => (
									<tr
										key={person.id}
										data-attendee-id={person.id}
										className={selectedAttendeeId === person.id ? 'row-selected' : undefined}
										onClick={() => setSelectedAttendeeId(person.id)}
									>
										<td>{person.name}</td>
										<td>{person.email}</td>
										<td>{person.company}</td>
										<td>{person.ticketType || 'General'}</td>
										<td>
											<StatusBadge status={person.status} />
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{selectedAttendee ? (
				<AttendeeDetail
					person={selectedAttendee}
					onSendEmail={() => navigate(eventPath(event.id, 'email'))}
					onUpdateStatus={() => showToast('Status updates write to HubSpot in Phase 5+.', 'success')}
				/>
			) : null}
		</section>
	);
}
