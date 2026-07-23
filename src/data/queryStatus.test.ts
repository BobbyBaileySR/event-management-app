import { describe, expect, it } from 'vitest';
import { describeQueryStatus } from './queryStatus';

describe('describeQueryStatus', () => {
	it('returns loading when there is no data yet and no error', () => {
		expect(describeQueryStatus({ data: undefined, isError: false, error: null })).toEqual({ kind: 'loading' });
	});

	it('returns error (first-load failure) when there is no data and the query errored', () => {
		const result = describeQueryStatus({ data: undefined, isError: true, error: new Error('boom') });
		expect(result).toEqual({ kind: 'error', message: 'boom' });
	});

	it('falls back to a generic message when the error is not an Error instance', () => {
		const result = describeQueryStatus({ data: undefined, isError: true, error: 'raw string' }, 'Failed to load');
		expect(result).toEqual({ kind: 'error', message: 'Failed to load' });
	});

	it('returns ready with refetchFailed false when data is present and no error', () => {
		expect(describeQueryStatus({ data: { a: 1 }, isError: false, error: null })).toEqual({
			kind: 'ready',
			refetchFailed: false,
		});
	});

	it('returns ready with refetchFailed true when data is present but a background refetch errored (research R6)', () => {
		expect(describeQueryStatus({ data: { a: 1 }, isError: true, error: new Error('refetch failed') })).toEqual({
			kind: 'ready',
			refetchFailed: true,
		});
	});
});
