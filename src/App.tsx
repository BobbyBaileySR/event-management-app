import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './state/appState';
import { ConfirmProvider } from './components/ConfirmModal';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { CelebrationThemeEffect } from './components/CelebrationThemeEffect';
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
			<ToastProvider>
				<ConfirmProvider>
					<AuthGate />
				</ConfirmProvider>
			</ToastProvider>
		</SessionProvider>
	);
}

function AuthGate() {
	const { isAuthenticated } = useSession();

	if (!isAuthenticated) {
		return <LoginView />;
	}

	return (
		<HashRouter>
			<CelebrationThemeEffect />
			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/events" element={<ViewRouter />} />
					<Route path="/events/attendees" element={<ViewRouter />} />
					<Route path="/events/check-in" element={<ViewRouter />} />
					<Route path="/catalog" element={<ViewRouter />} />
					<Route path="/events/:eventId" element={<ViewRouter />} />
					<Route path="/events/:eventId/:module" element={<ViewRouter />} />
					<Route path="*" element={<Navigate to="/events" replace />} />
				</Route>
			</Routes>
		</HashRouter>
	);
}
