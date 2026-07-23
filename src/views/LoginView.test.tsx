import { act } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoginView } from './LoginView';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

let capturedOnCredential: ((idToken: string) => void) | null = null;
const mockRenderGoogleSignInButton = vi.fn();
const mockExchangeGoogleToken = vi.fn();

vi.mock('../services/authService', () => ({
	exchangeGoogleToken: (idToken: string) => mockExchangeGoogleToken(idToken),
	renderGoogleSignInButton: (container: HTMLElement, onCredential: (idToken: string) => void) => {
		capturedOnCredential = onCredential;
		return mockRenderGoogleSignInButton(container, onCredential);
	},
}));

function SessionSpy() {
	const { session } = useSession();
	return <p data-testid="session-email">{session?.email ?? 'none'}</p>;
}

function renderLoginView() {
	return render(
		<SessionProvider>
			<LoginView />
			<SessionSpy />
		</SessionProvider>,
	);
}

beforeEach(() => {
	capturedOnCredential = null;
	mockRenderGoogleSignInButton.mockReset().mockResolvedValue(undefined);
	mockExchangeGoogleToken.mockReset();
});

describe('LoginView', () => {
	it('renders the app name, subtitle, and sign-in notice', () => {
		renderLoginView();

		expect(screen.getByRole('heading')).toBeInTheDocument();
		expect(screen.getByText('Event Management System')).toBeInTheDocument();
		expect(screen.getByText(/Sign in with your @adaptavist\.com account to continue/)).toBeInTheDocument();
	});

	it('shows an error message when the Google Sign-In script fails to initialize', async () => {
		mockRenderGoogleSignInButton.mockRejectedValue(new Error('Google Sign-In unavailable'));
		renderLoginView();

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('Google Sign-In unavailable');
		});
	});

	it('pushes a session into context when the credential exchange succeeds', async () => {
		const session: Session = {
			token: 't',
			email: 'staff@adaptavist.com',
			role: 'admin',
			expiresAt: '2099-01-01T00:00:00.000Z',
		};
		mockExchangeGoogleToken.mockResolvedValue(session);
		renderLoginView();

		await waitFor(() => expect(capturedOnCredential).not.toBeNull());
		await act(async () => {
			await capturedOnCredential!('fake-google-id-token');
		});

		await waitFor(() => {
			expect(screen.getByTestId('session-email')).toHaveTextContent('staff@adaptavist.com');
		});
	});

	it('renders a hostile exchange-failure message as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockExchangeGoogleToken.mockRejectedValue(new Error(hostile));
		renderLoginView();

		await waitFor(() => expect(capturedOnCredential).not.toBeNull());
		await act(async () => {
			await capturedOnCredential!('fake-google-id-token');
		});

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(hostile);
		});
		expect(document.querySelector('img')).toBeNull();
	});
});
