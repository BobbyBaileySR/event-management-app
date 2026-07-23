import { describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { ApiError } from '../../api/client';
import { renderWithQueryClient } from '../../testing/renderWithQueryClient';
import { createQueryClient } from '../queryClient';

function Consumer({ queryFn, label }: { queryFn: () => Promise<string>; label: string }) {
	const { data } = useQuery({ queryKey: ['dedup-test'], queryFn });
	return <div>{`${label}: ${data ?? 'loading'}`}</div>;
}

describe('createQueryClient — fail-safe global defaults (research R5)', () => {
	it('defaults to staleTime 0 and refetchOnWindowFocus false', () => {
		const client = createQueryClient();
		const defaults = client.getDefaultOptions().queries;
		expect(defaults?.staleTime).toBe(0);
		expect(defaults?.refetchOnWindowFocus).toBe(false);
	});

	it('never retries a 401 or 403, but does retry other failures (research R6)', () => {
		const client = createQueryClient();
		const retry = client.getDefaultOptions().queries?.retry as (failureCount: number, error: unknown) => boolean;
		expect(retry(0, new ApiError('missing_session', 401))).toBe(false);
		expect(retry(0, new ApiError('forbidden', 403))).toBe(false);
		expect(retry(0, new Error('network blip'))).toBe(true);
	});
});

describe('query dedup (FR-013)', () => {
	it('two components mounted with the same key issue exactly one request', async () => {
		const queryFn = vi.fn().mockResolvedValue('shared-value');

		renderWithQueryClient(
			<>
				<Consumer queryFn={queryFn} label="a" />
				<Consumer queryFn={queryFn} label="b" />
			</>,
		);

		await waitFor(() => {
			expect(screen.getByText('a: shared-value')).toBeInTheDocument();
			expect(screen.getByText('b: shared-value')).toBeInTheDocument();
		});

		expect(queryFn).toHaveBeenCalledTimes(1);
	});
});
