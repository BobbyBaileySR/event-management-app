import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportTier } from './useViewportTier';

function setInnerWidth(width: number) {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('useViewportTier', () => {
	afterEach(() => {
		setInnerWidth(1024);
	});

	it('resolves desktop at >=1024px', () => {
		setInnerWidth(1280);
		const { result } = renderHook(() => useViewportTier());
		expect(result.current).toBe('desktop');
	});

	it('resolves tablet at 768-1023px', () => {
		setInnerWidth(900);
		const { result } = renderHook(() => useViewportTier());
		expect(result.current).toBe('tablet');
	});

	it('resolves phone below 768px', () => {
		setInnerWidth(400);
		const { result } = renderHook(() => useViewportTier());
		expect(result.current).toBe('phone');
	});

	it('re-resolves on window resize', () => {
		setInnerWidth(1280);
		const { result } = renderHook(() => useViewportTier());
		expect(result.current).toBe('desktop');

		act(() => {
			setInnerWidth(500);
			window.dispatchEvent(new Event('resize'));
		});

		expect(result.current).toBe('phone');
	});
});
