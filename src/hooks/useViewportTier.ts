import { useEffect, useState } from 'react';

export type ViewportTier = 'phone' | 'tablet' | 'desktop';

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

function resolveTier(width: number): ViewportTier {
	if (width >= DESKTOP_MIN) {
		return 'desktop';
	}
	if (width >= TABLET_MIN) {
		return 'tablet';
	}
	return 'phone';
}

/**
 * Drives the app shell's 3-tier responsive chrome — desktop sidebar / tablet icon-rail +
 * slide-out drawer / phone top tab bar (`Frontend/design_handoff 2/README.md` § Breakpoints,
 * the authoritative source). Deliberately JS-driven (`window.innerWidth` + a resize listener)
 * rather than CSS `@media`: this project's jsdom/vitest environment does not evaluate `@media`
 * conditions at all (verified empirically — computed style always reflects a rule's
 * unconditional base, never a media-gated override), so CSS-only tier switching can't be
 * tested and would render all three chrome variants simultaneously under jsdom. Driving the
 * tier from `window.innerWidth` lets tests set that value directly — already an established
 * pattern here (see `AppLayout.test.tsx`'s 375px overflow test) — for deterministic,
 * single-tier output.
 */
export function useViewportTier(): ViewportTier {
	const [tier, setTier] = useState<ViewportTier>(() =>
		resolveTier(typeof window === 'undefined' ? DESKTOP_MIN : window.innerWidth),
	);

	useEffect(() => {
		function handleResize() {
			setTier(resolveTier(window.innerWidth));
		}

		window.addEventListener('resize', handleResize);
		handleResize();

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return tier;
}
