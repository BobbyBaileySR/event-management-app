import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapacityBar } from '../components/CapacityBar';
import { CatalogEventModal } from '../components/CatalogEventModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RefetchFailureBanner } from '../components/RefetchFailureBanner';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useAttendees } from '../data/hooks/useAttendees';
import { useEventCapacity } from '../data/hooks/useCapacity';
import { useCatalog } from '../data/hooks/useCatalog';
import { useDataService } from '../hooks/useDataService';
import { eventPath, useActiveRoute } from '../router/navigation';
import type { CreateCatalogEventBody, PatchCatalogEventBody, SliceAttendee } from '../types';
import { initialsFromName } from '../utils/attendeePresentation';
import { catalogEventToPortfolio } from '../utils/catalogEventPresentation';
import styles from './EventHubView.module.css';

const ATTENDEE_PREVIEW_LIMIT = 5;

interface AttendeePreview {
	id: string;
	name: string;
	company: string;
	ticketType: string;
	status: 'Checked In' | 'Registered';
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
	const [editOpen, setEditOpen] = useState(false);

	const catalogQuery = useCatalog({ includeArchived: true });
	const capacityQuery = useEventCapacity(eventId ?? '', { enabled: Boolean(eventId) });
	const attendeesQuery = useAttendees(
		eventId ?? '',
		{ page: 1, pageSize: ATTENDEE_PREVIEW_LIMIT },
		{ enabled: Boolean(eventId) },
	);

	function refreshEvent() {
		return Promise.all([catalogQuery.refetch(), capacityQuery.refetch(), attendeesQuery.refetch()]);
	}

	async function handleEventSave(body: CreateCatalogEventBody | PatchCatalogEventBody) {
		if (!catalogEvent) {
			return;
		}
		try {
			await data.updateEvent(catalogEvent.id, body as PatchCatalogEventBody);
			showToast('Event updated', 'success');
			setEditOpen(false);
			await refreshEvent();
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
			await refreshEvent();
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

	const blockingQueries = [catalogQuery, capacityQuery, attendeesQuery];
	const isLoading = blockingQueries.some((query) => query.data === undefined && !query.isError);
	const loadErrorQuery = blockingQueries.find((query) => query.data === undefined && query.isError);

	if (isLoading) {
		return (
			<section id="view-event-hub" className={styles.view}>
				<TopBar title="Event Details" meta="Loading event overview…" />
				<LoadingState message="Loading event…" />
			</section>
		);
	}

	if (loadErrorQuery) {
		const message = loadErrorQuery.error instanceof Error ? loadErrorQuery.error.message : 'Failed to load event';
		return (
			<ViewErrorState
				viewId="view-event-hub"
				title="Event Details"
				message={message}
				onRetry={() => void refreshEvent()}
			/>
		);
	}

	const programs = catalogQuery.data?.programs ?? [];
	const catalogEvent = catalogQuery.data?.events.find((candidate) => candidate.id === eventId) ?? null;

	if (!catalogEvent) {
		return (
			<EmptyState
				viewId="view-event-hub"
				message={`Event "${eventId}" was not found.`}
				action={{ label: 'Back to Programs & Events', to: '/events' }}
			/>
		);
	}

	const event = catalogEventToPortfolio(catalogEvent, programs);
	const checkedInCount = capacityQuery.data?.checkedInCount ?? 0;
	const capacityValue = capacityQuery.data?.capacity ?? catalogEvent.capacity ?? 0;
	const registeredTotal = attendeesQuery.data?.total ?? 0;
	const preview = (attendeesQuery.data?.attendees ?? []).map(toAttendeePreview);

	const showRefetchFailureBanner = blockingQueries.some((query) => query.isError);

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

			{showRefetchFailureBanner ? (
				<RefetchFailureBanner
					message="Couldn't refresh event data — showing the last loaded values."
					onRetry={() => void refreshEvent()}
				/>
			) : null}

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
