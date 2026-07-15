import type { CatalogEventSummary, CatalogProgram } from '../types';
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

/** Fan out capacity reads and merge checked-in counts into portfolio rows (FE-REDESIGN-020). */
export async function enrichPortfolioWithCapacity(
	events: CatalogEventSummary[],
	programs: CatalogProgram[],
	fetchCapacity: (eventId: string) => Promise<{ checkedInCount: number; capacity: number | null }>,
	now: Date = new Date(),
): Promise<PortfolioEvent[]> {
	const capacities = await Promise.all(
		events.map(async (event) => {
			try {
				return await fetchCapacity(event.id);
			} catch {
				return { checkedInCount: 0, capacity: event.capacity ?? null };
			}
		}),
	);

	return events.map((event, index) => {
		const capacityRow = capacities[index]!;
		const portfolio = catalogEventToPortfolio(event, programs, capacityRow.checkedInCount, now);
		if (capacityRow.capacity !== null && capacityRow.capacity > 0) {
			portfolio.capacity = capacityRow.capacity;
		}
		return portfolio;
	});
}
