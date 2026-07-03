import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '../types';

interface SessionContextValue {
	session: Session | null;
	isAuthenticated: boolean;
	setSession: (session: Session | null) => void;
	clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function sessionIsValid(session: Session | null): session is Session {
	if (!session) {
		return false;
	}
	return new Date(session.expiresAt) > new Date();
}

/**
 * In-memory session state (no localStorage — the token must not outlive the tab).
 * Ported from js/state/appState.js; selectedEventId is now derived from the URL
 * (react-router params), which removes the old double-render workaround.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
	const [session, setSessionState] = useState<Session | null>(null);

	const setSession = useCallback((next: Session | null) => setSessionState(next), []);
	const clearSession = useCallback(() => setSessionState(null), []);

	const value = useMemo<SessionContextValue>(
		() => ({
			session,
			isAuthenticated: sessionIsValid(session),
			setSession,
			clearSession,
		}),
		[session, setSession, clearSession],
	);

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
	const context = useContext(SessionContext);
	if (!context) {
		throw new Error('useSession must be used within a SessionProvider');
	}
	return context;
}
