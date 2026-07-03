import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './state/appState';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { LoginView } from './views/LoginView';
import { RoutePlaceholder } from './views/RoutePlaceholder';
import { APP_DOCUMENT_TITLE } from './utils/branding';

/**
 * R1 shell: session-gated app with hash routing and the event-scoped layout.
 * Views are placeholders until R3. See docs/react-migration-plan.md.
 */
export function App() {
	useEffect(() => {
		document.title = APP_DOCUMENT_TITLE;
	}, []);

	return (
		<SessionProvider>
			<ToastProvider>
				<AuthGate />
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
			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/events" element={<RoutePlaceholder />} />
					<Route path="/events/:eventId" element={<RoutePlaceholder />} />
					<Route path="/events/:eventId/:module" element={<RoutePlaceholder />} />
					<Route path="*" element={<Navigate to="/events" replace />} />
				</Route>
			</Routes>
		</HashRouter>
	);
}
