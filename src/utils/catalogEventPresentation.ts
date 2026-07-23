import type { CapacitySummaryRow, CatalogEventSummary, CatalogProgram } from '../types';
import {
	deriveEventLifecycleStatus,
	type EventLifecycleStatus,
	type EventManualStatus,
} from './catalogMetadata';

/**
 * Display shape for Overview / Programs & Events / Event Details / WorkingEventPicker (T071).
 * Built from flat `fetchCatalog()` + optional capacity fan-out — not the legacy `Event` mock.
 */
export interface PortfolioEvent {
	id: string;
	name: string;
	/** Human-readable start date for tables/cards. */
	date: string;
	/** ISO start datetime for sorting/month windows. */
	dateIso: string;
	endDate?: string;
	location: string;
	/** Derived lifecycle status (T073) — lowercase for StatusBadge. */
	status: 'active' | 'cancelled' | 'completed';
	publishState: 'draft' | 'published';
	attendeeCount: number;
	capacity: number;
	owner: string;
	/** HubSpot record id — same as `id` once Catalog is HubSpot-backed (T069). */
	hubspotId: string;
	programId?: string | null;
	programName?: string | null;
}

function wireStatusToManual(status: CatalogEventSummary['status']): EventManualStatus {
	return status === 'cancelled' ? 'Cancelled' : 'Active';
}

function lifecycleToBadgeStatus(lifecycle: EventLifecycleStatus): PortfolioEvent['status'] {
	if (lifecycle === 'Cancelled') {
		return 'cancelled';
	}
	if (lifecycle === 'Completed') {
		return 'completed';
	}
	return 'active';
}

function formatPortfolioDate(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) {
		return iso;
	}
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
}

/** Map a catalog Event (+ optional capacity occupancy) into the portfolio UI shape. */
export function catalogEventToPortfolio(
	event: CatalogEventSummary,
	programs: CatalogProgram[],
	attendeeCount = 0,
	now: Date = new Date(),
): PortfolioEvent {
	const lifecycle = deriveEventLifecycleStatus(
		{ manualStatus: wireStatusToManual(event.status), endDate: event.end },
		now,
	);
	const program = event.programId ? programs.find((entry) => entry.id === event.programId) : undefined;

	return {
		id: event.id,
		name: event.name,
		date: formatPortfolioDate(event.start),
		dateIso: event.start,
		endDate: event.end,
		location: event.location ?? '',
		status: lifecycleToBadgeStatus(lifecycle),
		publishState: event.publishState,
		attendeeCount,
		capacity: event.capacity ?? 0,
		owner: event.owner ?? '',
		hubspotId: event.id,
		programId: event.programId,
		programName: program?.name ?? null,
	};
}

/**
 * Merge the bulk capacity summary (`GET events/capacity-summary`, Slice 012) into portfolio
 * rows, keyed by `eventId`. `PortfolioEvent.attendeeCount` is "Event Capacity" (total
 * registered, checked-in or not) — sourced from `registeredCount`, matching what Event
 * Details shows, not `checkedInCount` ("Live Capacity", the Check-in page's on-site count).
 * A missing row (summary fetch failed, or the event isn't in it yet) falls back to zero
 * registered with the catalog's own capacity — the same soft-fail shape the old per-event
 * fan-out used.
 */
export function enrichPortfolioWithCapacity(
	events: CatalogEventSummary[],
	programs: CatalogProgram[],
	summaryRows: CapacitySummaryRow[] | undefined,
	now: Date = new Date(),
): PortfolioEvent[] {
	const summaryByEventId = new Map((summaryRows ?? []).map((row) => [row.eventId, row]));

	return events.map((event) => {
		const summaryRow = summaryByEventId.get(event.id);
		const registeredCount = summaryRow?.registeredCount ?? 0;
		const portfolio = catalogEventToPortfolio(event, programs, registeredCount, now);
		if (summaryRow && summaryRow.capacity !== null && summaryRow.capacity > 0) {
			portfolio.capacity = summaryRow.capacity;
		}
		return portfolio;
	});
}
