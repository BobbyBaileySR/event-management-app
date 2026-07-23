import { Navigate } from 'react-router-dom';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { AuditView } from './AuditView';
import { CatalogAdminView } from './CatalogAdminView';
import { AttendeesView } from './AttendeesView';
import { CheckInView } from './CheckInView';
import { ConversationsView } from './ConversationsView';
import { EventHubView } from './EventHubView';
import { EventsView } from './EventsView';
import { OverviewView } from './OverviewView';
import { RoutePlaceholder } from './RoutePlaceholder';
import { EmailDispatchView } from './EmailDispatchView';

/**
 * Routes authenticated views by logical route name. Ported views replace
 * RoutePlaceholder one sub-phase at a time (R3a–R3f). See docs/react-migration-plan.md §6.
 */
export function ViewRouter() {
	const { name } = useActiveRoute();

	switch (name) {
		case 'overview':
			return <OverviewView />;
		case 'events':
			return <EventsView />;
		case 'catalog':
			return <CatalogAdminView />;
		case 'audit':
			return <AuditView />;
		case 'event-hub':
			return <EventHubView />;
		case 'attendees':
			return <AttendeesRouteGate />;
		case 'check-in':
			return <CheckInRouteGate />;
		case 'conversations':
			return <ConversationsRouteGate />;
		case 'email':
			return <EmailRouteGate />;
		default:
			return <RoutePlaceholder />;
	}
}

/** Attendees requires a working event in the URL (`#/events/{eventId}/attendees`). */
function AttendeesRouteGate() {
	const { eventId } = useActiveRoute();
	if (!eventId) {
		return <Navigate to="/events" replace />;
	}
	return <AttendeesView />;
}

/** Check-in requires a working event in the URL (`#/events/{eventId}/check-in`). */
function CheckInRouteGate() {
	const { eventId } = useActiveRoute();
	if (!eventId) {
		return <Navigate to="/events" replace />;
	}
	return <CheckInView />;
}

/** Conversations requires a working event in the URL (`#/events/{eventId}/conversations`). */
function ConversationsRouteGate() {
	const { eventId } = useActiveRoute();
	if (!eventId) {
		return <Navigate to="/events" replace />;
	}
	return <ConversationsView />;
}

/** Email requires admin + a working event in the URL (`#/events/{eventId}/email`). */
function EmailRouteGate() {
	const { session } = useSession();
	const { eventId } = useActiveRoute();

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!eventId) {
		return <Navigate to="/events" replace />;
	}

	return <EmailDispatchView />;
}
