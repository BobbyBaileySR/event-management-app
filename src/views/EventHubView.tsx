import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapacityBar } from '../components/CapacityBar';
import { CatalogEventModal } from '../components/CatalogEventModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { eventPath, useActiveRoute } from '../router/navigation';
import type {
	CatalogEventSummary,
	CatalogProgram,
	CreateCatalogEventBody,
	PatchCatalogEventBody,
	SliceAttendee,
} from '../types';
import { catalogEventToPortfolio, type PortfolioEvent } from '../utils/catalogEventPresentation';
import styles from './EventHubView.module.css';

const ATTENDEE_PREVIEW_LIMIT = 5;

interface AttendeePreview {
	id: string;
	name: string;
	company: string;
	ticketType: string;
	status: 'Checked In' | 'Registered';
}

function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return '?';
	}
	const first = parts[0]?.charAt(0) ?? '';
	const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
	return `${first}${last}`.toUpperCase() || '?';
}

function toAttendeePreview(attendee: SliceAttendee): AttendeePreview {
	return {
		id: attendee.contactId,
		name: `${attendee.firstName} ${attendee.lastName}`.trim(),
		company: attendee.company,
		ticketType: attendee.attendeeType,
		status: attendee.checkedIn ? 'Checked In' : 'Registered',
	};
}

export function EventHubView() {
	const navigate = useNavigate();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const { showToast } = useToast();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<PortfolioEvent | null>(null);
	const [catalogEvent, setCatalogEvent] = useState<CatalogEventSummary | null>(null);
	const [programs, setPrograms] = useState<CatalogProgram[]>([]);
	const [checkedInCount, setCheckedInCount] = useState(0);
	const [capacityValue, setCapacityValue] = useState(0);
	const [registeredTotal, setRegisteredTotal] = useState(0);
	const [preview, setPreview] = useState<AttendeePreview[]>([]);
	const [reloadKey, setReloadKey] = useState(0);
	const [editOpen, setEditOpen] = useState(false);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		Promise.all([
			data.fetchCatalog({ includeArchived: true }),
			data.fetchEventCapacityStatus(eventId),
			data.fetchEventAttendees(eventId, { page: 1, pageSize: ATTENDEE_PREVIEW_LIMIT }),
		])
			.then(([catalogResult, capacityResult, attendeesResult]) => {
				if (cancelled) {
					return;
				}
				setPrograms(catalogResult.programs);
				const found = catalogResult.events.find((candidate) => candidate.id === eventId);
				if (!found) {
					setEvent(null);
					setCatalogEvent(null);
					return;
				}
				setCatalogEvent(found);
				setEvent(catalogEventToPortfolio(found, catalogResult.programs));
				setCheckedInCount(capacityResult.checkedInCount);
				setCapacityValue(capacityResult.capacity ?? found.capacity ?? 0);
				setRegisteredTotal(attendeesResult.total);
				setPreview(attendeesResult.attendees.map(toAttendeePreview));
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
	}, [data, eventId, reloadKey]);

	async function handleEventSave(body: CreateCatalogEventBody | PatchCatalogEventBody) {
		if (!catalogEvent) {
			return;
		}
		try {
			await data.updateEvent(catalogEvent.id, body as PatchCatalogEventBody);
			showToast('Event updated', 'success');
			setEditOpen(false);
			setReloadKey((current) => current + 1);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to save Event', 'error');
		}
	}

	async function toggleEventArchive() {
		if (!catalogEvent) {
			return;
		}
		try {
			await data.updateEvent(catalogEvent.id, { archived: !catalogEvent.archived });
			showToast(catalogEvent.archived ? 'Event unarchived' : 'Event archived', 'success');
			setEditOpen(false);
			setReloadKey((current) => current + 1);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to update Event', 'error');
		}
	}

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-event-hub"
				message="Select an event from Programs & Events to open Event Details."
				action={{ label: 'Go to Programs & Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return (
			<section id="view-event-hub" className={styles.view}>
				<TopBar title="Event Details" meta="Loading event overview…" />
				<LoadingState message="Loading event…" skeleton="cards" />
			</section>
		);
	}

	if (error) {
		return (
			<ViewErrorState
				viewId="view-event-hub"
				title="Event Details"
				message={error}
				onRetry={() => {
					setError(null);
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	if (!event || !catalogEvent) {
		return (
			<EmptyState
				viewId="view-event-hub"
				message={`Event "${eventId}" was not found.`}
				action={{ label: 'Back to Programs & Events', to: '/events' }}
			/>
		);
	}

	const pctFilled = capacityValue > 0 ? Math.round((registeredTotal / capacityValue) * 100) : 0;
	const detailFields: [string, string][] = [
		['Program', event.programName ?? 'No program'],
		['Location', event.location],
		['Date', event.date],
		['Owner', event.owner],
		['HubSpot record', event.hubspotId],
	];
	const eventMetaParts = [event.date, event.location].filter((part) => part.trim().length > 0);
	const parentProgram = catalogEvent.programId
		? (programs.find((program) => program.id === catalogEvent.programId) ?? null)
		: null;
	const activePrograms = programs.filter((program) => !program.archived);

	return (
		<section id="view-event-hub" className={styles.view}>
			<TopBar title="Event Details" meta="Full record for the selected event" />

			<div className="card card--accent">
				<div className={styles.badgeRow}>
					<StatusBadge status={event.status} />
					{event.programName ? <span className={styles.programBadge}>{event.programName}</span> : null}
					<span className={styles.workingBadge}>✓ Working event</span>
				</div>
				<div className={styles.headerRow}>
					<div className={styles.headerMain}>
						<h2 className={styles.eventName}>{event.name}</h2>
						{eventMetaParts.length > 0 ? (
							<div className={styles.eventMeta}>
								{eventMetaParts.map((part) => (
									<span key={part}>{part}</span>
								))}
							</div>
						) : null}
					</div>
					<div className={styles.headerActions}>
						<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditOpen(true)}>
							Edit event
						</button>
					</div>
				</div>
			</div>

			<div className="grid-4">
				<div className="card hub-stat">
					<p className="hub-stat__label">Registered</p>
					<p className="hub-stat__value">{registeredTotal.toLocaleString()}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Capacity</p>
					<p className="hub-stat__value">{capacityValue.toLocaleString()}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Checked in</p>
					<p className="hub-stat__value">{checkedInCount.toLocaleString()}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Filled</p>
					<p className="hub-stat__value">{pctFilled}%</p>
				</div>
			</div>

			<div className={styles.detailGrid}>
				<div className="card">
					<div className="card__header">
						<div className={styles.cardHeaderRow}>
							<h2>Attendees</h2>
							<button type="button" className={styles.linkButton} onClick={() => navigate(eventPath(eventId, 'attendees'))}>
								See all ›
							</button>
						</div>
					</div>
					{preview.length === 0 ? (
						<p className="shell-note">No attendees yet.</p>
					) : (
						<ul className={styles.attendeeList}>
							{preview.map((attendee) => (
								<li key={attendee.id} className={styles.attendeeRow}>
									<span className={styles.attendeeAvatar} aria-hidden="true">
										{initialsFromName(attendee.name)}
									</span>
									<span className={styles.attendeeInfo}>
										<span className={styles.attendeeName}>{attendee.name}</span>
										<span className={styles.attendeeMeta}>
											{attendee.company} · {attendee.ticketType}
										</span>
									</span>
									<StatusBadge status={attendee.status} />
								</li>
							))}
						</ul>
					)}
				</div>

				<div className={styles.detailColumn}>
					<div className="card">
						<div className="card__header">
							<h2>Capacity</h2>
						</div>
						<CapacityBar value={registeredTotal} capacity={capacityValue} />
					</div>
					<div className="card">
						<div className="card__header">
							<h2>Details</h2>
						</div>
						<dl className="detail-list">
							{detailFields.flatMap(([label, value]) => [
								<dt key={`${label}-dt`}>{label}</dt>,
								<dd key={`${label}-dd`}>{value}</dd>,
							])}
						</dl>
					</div>
				</div>
			</div>

			<CatalogEventModal
				open={editOpen}
				mode="edit"
				programs={activePrograms}
				event={catalogEvent}
				parentProgram={parentProgram}
				onCancel={() => setEditOpen(false)}
				onSave={handleEventSave}
				onArchive={toggleEventArchive}
			/>
		</section>
	);
}
