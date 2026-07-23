import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './state/appState';
import { ConfirmProvider } from './components/ConfirmModal';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { queryClient, setUnauthorizedListener } from './data/queryClient';
import { useSessionLifecycle } from './data/sessionLifecycle';
import { LoginView } from './views/LoginView';
import { ViewRouter } from './views/ViewRouter';
import { APP_DOCUMENT_TITLE } from './utils/branding';

/**
 * R1 shell + R3 view ports: session-gated app with hash routing and the event-scoped layout.
 * See docs/react-migration-plan.md (R3a–R3f).
 */
export function App() {
	useEffect(() => {
		document.title = APP_DOCUMENT_TITLE;
	}, []);

	return (
		<SessionProvider>
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<ConfirmProvider>
						<UnauthorizedListenerBridge />
						<SessionLifecycleBridge />
						<AuthGate />
					</ConfirmProvider>
				</ToastProvider>
			</QueryClientProvider>
		</SessionProvider>
	);
}

/** Routes a 401 on any query (incl. a silent background refetch) to the existing sign-out flow (research R6). */
function UnauthorizedListenerBridge() {
	const { clearSession } = useSession();

	useEffect(() => {
		setUnauthorizedListener(clearSession);
		return () => setUnauthorizedListener(null);
	}, [clearSession]);

	return null;
}

/** Session boundary (research R4/R9) — see `src/data/sessionLifecycle.ts`. */
function SessionLifecycleBridge() {
	useSessionLifecycle();
	return null;
}

function AuthGate() {
	const { isAuthenticated } = useSession();

	if (!isAuthenticated) {
		return <LoginView />;
	}

	return (
		<HashRouter>
			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/overview" element={<ViewRouter />} />
					<Route path="/events" element={<ViewRouter />} />
					<Route path="/events/attendees" element={<ViewRouter />} />
					<Route path="/events/check-in" element={<ViewRouter />} />
					<Route path="/events/email" element={<ViewRouter />} />
					<Route path="/catalog" element={<ViewRouter />} />
					<Route path="/audit" element={<ViewRouter />} />
					<Route path="/events/:eventId" element={<ViewRouter />} />
					<Route path="/events/:eventId/:module" element={<ViewRouter />} />
					<Route path="*" element={<Navigate to="/events" replace />} />
				</Route>
			</Routes>
		</HashRouter>
	);
}
