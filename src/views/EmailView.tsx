import { Navigate } from 'react-router-dom';

/** Legacy redirect — email is event-scoped at `#/events/{eventId}/email`. */
export function EmailView() {
	return <Navigate to="/events" replace />;
}
