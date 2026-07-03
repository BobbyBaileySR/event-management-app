import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { CONFIG } from '../config';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';
import { CELEBRATION_THEME_ATTRIBUTE, CELEBRATION_THEME_VALUE } from '../utils/celebrationTheme';
import { CelebrationThemeEffect } from './CelebrationThemeEffect';
import { ToastProvider } from './Toast';

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();

	useEffect(() => {
		setSession(session);
	}, [session, setSession]);

	return <CelebrationThemeEffect />;
}

function renderCelebration(session: Session) {
	return render(
		<SessionProvider>
			<ToastProvider>
				<SessionHarness session={session} />
			</ToastProvider>
		</SessionProvider>,
	);
}

describe('CelebrationThemeEffect', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute(CELEBRATION_THEME_ATTRIBUTE);
	});

	it('sets celebration theme for the configured email', () => {
		renderCelebration({
			token: 't',
			email: CONFIG.CELEBRATION_THEME_EMAIL,
			role: 'admin',
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		});

		expect(document.documentElement.getAttribute(CELEBRATION_THEME_ATTRIBUTE)).toBe(
			CELEBRATION_THEME_VALUE,
		);
	});

	it('does not set celebration theme for other users', () => {
		renderCelebration({
			token: 't',
			email: 'other@adaptavist.com',
			role: 'admin',
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		});

		expect(document.documentElement.hasAttribute(CELEBRATION_THEME_ATTRIBUTE)).toBe(false);
	});

	it('shows toast when CELEBRATION_TOAST_MESSAGE is set', () => {
		const message = CONFIG.CELEBRATION_TOAST_MESSAGE.trim();
		if (!message) {
			return;
		}

		renderCelebration({
			token: 't',
			email: CONFIG.CELEBRATION_THEME_EMAIL,
			role: 'admin',
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		});

		expect(screen.getByRole('status')).toHaveTextContent(message);
	});
});
