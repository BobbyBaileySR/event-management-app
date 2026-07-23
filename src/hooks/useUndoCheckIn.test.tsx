import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUndoCheckIn } from './useUndoCheckIn';

/**
 * The shared "undo check-in" orchestration both CheckInView and AttendeesView call
 * (architecture review candidate 7). The failure path here has no other coverage — neither
 * view's own tests exercised a rejected `undoCheckIn` before this hook existed.
 */

const mockUndoCheckIn = vi.fn();
const mockShowToast = vi.fn();

vi.mock('./useDataService', () => ({
	useDataService: () => ({ undoCheckIn: mockUndoCheckIn }),
}));

vi.mock('../components/Toast', () => ({
	useToast: () => ({ showToast: mockShowToast }),
}));

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const person = { contactId: 'c-1', firstName: 'Ada', lastName: 'Lovelace' };

beforeEach(() => {
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
	mockUndoCheckIn.mockReset();
	mockShowToast.mockReset();
});

describe('useUndoCheckIn', () => {
	it('calls undoCheckIn, shows a success toast naming the attendee, and resolves true', async () => {
		mockUndoCheckIn.mockResolvedValue(undefined);
		const { result } = renderHook(() => useUndoCheckIn('ev-1'), { wrapper });

		let outcome: boolean | undefined;
		await act(async () => {
			outcome = await result.current.runUndoCheckIn(person);
		});

		expect(outcome).toBe(true);
		expect(mockUndoCheckIn).toHaveBeenCalledWith('ev-1', 'c-1');
		expect(mockShowToast).toHaveBeenCalledWith('Ada Lovelace: check-in undone.', 'success');
		expect(result.current.undoingId).toBeNull();
	});

	it('tracks undoingId while the call is in flight', async () => {
		let resolveUndo: () => void = () => {};
		mockUndoCheckIn.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveUndo = resolve;
			}),
		);
		const { result } = renderHook(() => useUndoCheckIn('ev-1'), { wrapper });

		let pending: Promise<boolean>;
		act(() => {
			pending = result.current.runUndoCheckIn(person);
		});

		await waitFor(() => expect(result.current.undoingId).toBe('c-1'));

		await act(async () => {
			resolveUndo();
			await pending;
		});

		expect(result.current.undoingId).toBeNull();
	});

	it('shows a friendly error toast and resolves false when the call fails', async () => {
		mockUndoCheckIn.mockRejectedValue(new Error('unexpected_failure'));
		const { result } = renderHook(() => useUndoCheckIn('ev-1'), { wrapper });

		let outcome: boolean | undefined;
		await act(async () => {
			outcome = await result.current.runUndoCheckIn(person);
		});

		expect(outcome).toBe(false);
		expect(mockShowToast).toHaveBeenCalledWith('Failed to undo check-in', 'error');
		expect(result.current.undoingId).toBeNull();
	});

	it('maps a known domain error code to its friendly message', async () => {
		mockUndoCheckIn.mockRejectedValue(new Error('contact_not_registered'));
		const { result } = renderHook(() => useUndoCheckIn('ev-1'), { wrapper });

		await act(async () => {
			await result.current.runUndoCheckIn(person);
		});

		expect(mockShowToast).toHaveBeenCalledWith('This attendee is no longer registered.', 'error');
	});

	it('resolves false without calling the data service when there is no eventId', async () => {
		const { result } = renderHook(() => useUndoCheckIn(null), { wrapper });

		let outcome: boolean | undefined;
		await act(async () => {
			outcome = await result.current.runUndoCheckIn(person);
		});

		expect(outcome).toBe(false);
		expect(mockUndoCheckIn).not.toHaveBeenCalled();
		expect(mockShowToast).not.toHaveBeenCalled();
	});
});
