/**
 * Central query-key factory (ADR-015) — the only module allowed to construct cache keys
 * (FR-010). Params are normalized (stable field order, defaults filled) before entering a
 * key so equivalent filter states produce the identical key — e.g. `{ page: 1 }` and `{}`
 * are the same dataset (FR-013 dedup guarantee) while distinct filters never bleed rows.
 */

import type { EventAttendeesQuery } from '../services/dataService';

/** Re-exports `fetchEventAttendees`'s query shape — one declaration, not a third hand-typed copy (architecture review candidate 6). */
export type AttendeesQueryParams = EventAttendeesQuery;

function normalizeAttendeesParams(params: AttendeesQueryParams) {
	return {
		page: params.page ?? 1,
		pageSize: params.pageSize ?? 50,
		checkedIn: params.checkedIn ?? null,
		q: params.q ?? '',
		dispatchId: params.dispatchId ?? null,
		dispatchFilter: params.dispatchFilter ?? null,
	};
}

export interface AuditQueryParams {
	page?: number;
	pageSize?: number;
	action?: string;
	actor?: string;
	resourceType?: string;
	resourceId?: string;
}

function normalizeAuditParams(params: AuditQueryParams) {
	return {
		page: params.page ?? 1,
		pageSize: params.pageSize ?? 50,
		action: params.action ?? null,
		actor: params.actor ?? null,
		resourceType: params.resourceType ?? null,
		resourceId: params.resourceId ?? null,
	};
}

export interface DispatchesQueryParams {
	view?: 'scheduled' | 'log';
	page?: number;
	pageSize?: number;
}

function normalizeDispatchesParams(params: DispatchesQueryParams) {
	return {
		view: params.view ?? 'log',
		page: params.page ?? 1,
		pageSize: params.pageSize ?? 50,
	};
}

/** data-model.md §1 — hierarchical so invalidation can work by prefix. */
export const queryKeys = {
	catalog: (options: { includeArchived?: boolean } = {}) =>
		options.includeArchived ? (['catalog', { includeArchived: true }] as const) : (['catalog'] as const),
	capacitySummary: () => ['capacity', 'summary'] as const,
	eventCapacity: (eventId: string) => ['capacity', eventId] as const,
	/** Whole `capacity` family prefix — invalidation.ts uses this when a mutation (e.g. catalog archive) affects every capacity dataset at once, not one event. */
	capacityAll: () => ['capacity'] as const,
	attendees: (eventId: string, params: AttendeesQueryParams = {}) =>
		['attendees', eventId, normalizeAttendeesParams(params)] as const,
	/** Prefix covering every param variant of an Event's attendee pages — for invalidation, not for a `useQuery` call. */
	attendeesForEvent: (eventId: string) => ['attendees', eventId] as const,
	auditLog: (params: AuditQueryParams = {}) => ['audit', normalizeAuditParams(params)] as const,
	dispatches: (eventId: string, params: DispatchesQueryParams = {}) =>
		['dispatches', eventId, normalizeDispatchesParams(params)] as const,
	/** Prefix covering every param variant of an Event's dispatch lists — for invalidation, not for a `useQuery` call. */
	dispatchesForEvent: (eventId: string) => ['dispatches', eventId] as const,
	dispatchesScheduledSummary: () => ['dispatches', 'scheduled-summary'] as const,
};
