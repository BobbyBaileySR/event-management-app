import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlaceholderView } from './views/PlaceholderView';

/**
 * R0 shell: proves the Vite + React + TypeScript + hash-routing pipeline renders and builds.
 * Real routes (events, event hub, attendees, email, analytics) are ported in R1–R3
 * per docs/react-migration-plan.md.
 */
export function App() {
	return (
		<HashRouter>
			<Routes>
				<Route path="/events" element={<PlaceholderView />} />
				<Route path="*" element={<Navigate to="/events" replace />} />
			</Routes>
		</HashRouter>
	);
}
