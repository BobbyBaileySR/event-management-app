import { describe, expect, it } from 'vitest';
import type { CatalogEventSummary, CatalogProgram } from '../types';
import { catalogEventToPortfolio, enrichPortfolioWithCapacity } from './catalogEventPresentation';

const NOW = new Date('2026-07-14T12:00:00.000Z');

const programs: CatalogProgram[] = [{ id: 'prog-emea', name: 'EMEA Regional Series', archived: false }];

function makeEvent(overrides: Partial<CatalogEventSummary> = {}): CatalogEventSummary {
	return {
		id: 'evt-london-q3',
		programId: 'prog-emea',
		name: 'London Q3 Summit',
		start: '2026-10-15T09:00:00.000Z',
		end: '2026-10-16T17:00:00.000Z',
		location: 'The Shard',
		capacity: 200,
		status: 'active',
		publishState: 'published',
		owner: 'events@adaptavist.com',
		archived: false,
		...overrides,
	};
}

describe('catalogEventToPortfolio', () => {
	it('maps an active, not-yet-ended event to active status', () => {
		const portfolio = catalogEventToPortfolio(makeEvent(), programs, 0, NOW);
		expect(portfolio.status).toBe('active');
	});

	it('derives completed once an active event is past its end date', () => {
		const portfolio = catalogEventToPortfolio(
			makeEvent({ end: '2026-01-01T00:00:00.000Z' }),
			programs,
			0,
			NOW,
		);
		expect(portfolio.status).toBe('completed');
	});

	it('treats cancelled as a terminal status even with a future end date', () => {
		const portfolio = catalogEventToPortfolio(
			makeEvent({ status: 'cancelled', end: '2099-01-01T00:00:00.000Z' }),
			programs,
			0,
			NOW,
		);
		expect(portfolio.status).toBe('cancelled');
	});

	it('treats cancelled as terminal even when the end date has already passed', () => {
		const portfolio = catalogEventToPortfolio(
			makeEvent({ status: 'cancelled', end: '2020-01-01T00:00:00.000Z' }),
			programs,
			0,
			NOW,
		);
		expect(portfolio.status).toBe('cancelled');
	});

	it('sets hubspotId to the event id', () => {
		const portfolio = catalogEventToPortfolio(makeEvent({ id: 'evt-99' }), programs, 0, NOW);
		expect(portfolio.hubspotId).toBe('evt-99');
		expect(portfolio.id).toBe('evt-99');
	});

	it('resolves programName from the matching program', () => {
		const portfolio = catalogEventToPortfolio(makeEvent(), programs, 0, NOW);
		expect(portfolio.programName).toBe('EMEA Regional Series');
	});

	it('leaves programName null for a standalone event with no programId', () => {
		const portfolio = catalogEventToPortfolio(makeEvent({ programId: null }), programs, 0, NOW);
		expect(portfolio.programName).toBeNull();
	});

	it('carries the publishState through unchanged', () => {
		const portfolio = catalogEventToPortfolio(makeEvent({ publishState: 'draft' }), programs, 0, NOW);
		expect(portfolio.publishState).toBe('draft');
	});

	it('defaults capacity to 0 when the catalog event has none', () => {
		const portfolio = catalogEventToPortfolio(makeEvent({ capacity: undefined }), programs, 0, NOW);
		expect(portfolio.capacity).toBe(0);
	});
});

describe('enrichPortfolioWithCapacity', () => {
	it('merges registeredCount ("Event Capacity") into attendeeCount and overrides capacity when the summary row is positive', () => {
		const [portfolio] = enrichPortfolioWithCapacity(
			[makeEvent()],
			programs,
			[
				{
					eventId: 'evt-london-q3',
					programId: 'prog-emea',
					registeredCount: 160,
					checkedInCount: 150,
					capacity: 180,
				},
			],
			NOW,
		);

		expect(portfolio!.attendeeCount).toBe(160);
		expect(portfolio!.capacity).toBe(180);
	});

	it('uses registeredCount, not checkedInCount, when a registrant has not checked in yet (regression: Programs & Events previously showed 0/capacity for a registered-only event)', () => {
		const [portfolio] = enrichPortfolioWithCapacity(
			[makeEvent()],
			programs,
			[
				{
					eventId: 'evt-london-q3',
					programId: 'prog-emea',
					registeredCount: 1,
					checkedInCount: 0,
					capacity: 100,
				},
			],
			NOW,
		);

		expect(portfolio!.attendeeCount).toBe(1);
	});

	it('falls back to the catalog capacity when the summary row has no positive capacity', () => {
		const [portfolio] = enrichPortfolioWithCapacity(
			[makeEvent({ capacity: 200 })],
			programs,
			[{ eventId: 'evt-london-q3', programId: 'prog-emea', registeredCount: 0, checkedInCount: 0, capacity: null }],
			NOW,
		);

		expect(portfolio!.capacity).toBe(200);
	});

	it('soft-fails to zero attendees + catalog capacity when the event has no matching summary row', () => {
		const [portfolio] = enrichPortfolioWithCapacity([makeEvent({ capacity: 200 })], programs, [], NOW);

		expect(portfolio!.attendeeCount).toBe(0);
		expect(portfolio!.capacity).toBe(200);
	});

	it('soft-fails the same way when the summary rows are undefined (summary fetch failed)', () => {
		const [portfolio] = enrichPortfolioWithCapacity([makeEvent({ capacity: 200 })], programs, undefined, NOW);

		expect(portfolio!.attendeeCount).toBe(0);
		expect(portfolio!.capacity).toBe(200);
	});
});
