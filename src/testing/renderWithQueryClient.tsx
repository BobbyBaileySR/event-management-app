import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

/** Fresh, isolated QueryClient per test — retry off (deterministic failures), gcTime 0 (no cross-test cache leakage). Research R8. */
export function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});
}

export interface RenderWithQueryClientOptions extends Omit<RenderOptions, 'wrapper'> {
	queryClient?: QueryClient;
}

export interface RenderWithQueryClientResult extends RenderResult {
	queryClient: QueryClient;
}

/**
 * Wraps Testing Library's `render` in a `QueryClientProvider` backed by a fresh client per
 * call. Compose with other providers (`MemoryRouter`, `ToastProvider`, …) by nesting them in
 * `ui` itself — this util only owns the query-client boundary.
 */
export function renderWithQueryClient(
	ui: ReactElement,
	options: RenderWithQueryClientOptions = {},
): RenderWithQueryClientResult {
	const { queryClient = createTestQueryClient(), ...renderOptions } = options;

	function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	}

	return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}
