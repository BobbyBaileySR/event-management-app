import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkingEventMeta } from './useWorkingEventMeta';

const mockFetchCatalog = vi.fn();

vi.mock('./useDataService', () => ({
	useDataService: () => ({
		fetchCatalog: mockFetchCatalog,
	}),
}));

describe('useWorkingEventMeta', () => {
	beforeEach(() => {
		mockFetchCatalog.mockReset();
		mockFetchCatalog.mockResolvedValue({
			events: [
				{
					id: 'ev-1',
					programId: 'prog-1',
					name: 'Meeting Room',
					walkInFormUrl: 'https://share.hsforms.com/walk-in',
					start: '2026-10-01T09:00:00.000Z',
					status: 'active',
					publishState: 'published',
					archived: false,
				},
			],
			programs: [{ id: 'prog-1', name: 'Atlassian 2026', archived: false }],
		});
	});

	it('resolves event and program names from the catalog', async () => {
		const { result } = renderHook(() => useWorkingEventMeta('ev-1'));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toMatchObject({
			eventName: 'Meeting Room',
			programName: 'Atlassian 2026',
			walkInFormUrl: 'https://share.hsforms.com/walk-in',
			programId: 'prog-1',
		});
		expect(mockFetchCatalog).toHaveBeenCalledWith({ includeArchived: true });
	});

	it('clears meta when eventId is null', async () => {
		const { result, rerender } = renderHook(
			({ eventId }: { eventId: string | null }) => useWorkingEventMeta(eventId),
			{ initialProps: { eventId: 'ev-1' as string | null } },
		);

		await waitFor(() => expect(result.current.eventName).toBe('Meeting Room'));

		rerender({ eventId: null });
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toMatchObject({
			eventName: null,
			programName: null,
			walkInFormUrl: null,
			programId: null,
		});
	});

	it('soft-fails to nulls when catalog fetch errors', async () => {
		// Strict Mode remounts effects — reject every call, not only the first.
		mockFetchCatalog.mockRejectedValue(new Error('boom'));
		const { result } = renderHook(() => useWorkingEventMeta('ev-1'));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toMatchObject({
			eventName: null,
			programName: null,
			walkInFormUrl: null,
			programId: null,
		});
	});
});
