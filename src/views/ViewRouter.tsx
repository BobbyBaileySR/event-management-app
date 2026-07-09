import { Navigate } from 'react-router-dom';
import { sliceModulePath, useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import { EmptyState } from '../components/EmptyState';
import { AuditView } from './AuditView';
import { CatalogAdminView } from './CatalogAdminView';
import { AgendaView } from './AgendaView';
import { AnalyticsView } from './AnalyticsView';
import { AttendeesView } from './AttendeesView';
import { CheckInView } from './CheckInView';
import { EventHubView } from './EventHubView';
import { EventsView } from './EventsView';
import { RoutePlaceholder } from './RoutePlaceholder';
import { EmailDispatchView } from './EmailDispatchView';
import { SettingsView } from './SettingsView';

/**
 * Routes authenticated views by logical route name. Ported views replace
 * RoutePlaceholder one sub-phase at a time (R3a–R3f). See docs/react-migration-plan.md §6.
 */
export function ViewRouter() {
	const { name } = useActiveRoute();

	switch (name) {
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
		case 'analytics':
			return <AnalyticsView />;
		case 'agenda':
			return <AgendaView />;
		case 'check-in':
			return <CheckInRouteGate />;
		case 'email':
			return <EmailRouteGate />;
		case 'settings':
			return <SettingsView />;
		default:
			return <RoutePlaceholder />;
	}
}

/** Legacy `#/events/:eventId/attendees` → catalog-scoped Slice 1 route. */
function AttendeesRouteGate() {
	const { eventId } = useActiveRoute();
	if (eventId) {
		return <Navigate to={sliceModulePath('attendees')} replace />;
	}
	return <AttendeesView />;
}

/** Legacy `#/events/:eventId/check-in` → catalog-scoped Slice 1 route. */
function CheckInRouteGate() {
	const { eventId } = useActiveRoute();
	if (eventId) {
		return <Navigate to={sliceModulePath('check-in')} replace />;
	}
	return <CheckInView />;
}

/** Admin + catalog gate for Slice 2 email route — full UI ships in EmailDispatchView (US1). */
function EmailRouteGate() {
	const { session } = useSession();
	const { programId, evId } = useCatalogSelection();
	const { eventId } = useActiveRoute();

	if (eventId) {
		return <Navigate to={sliceModulePath('email')} replace />;
	}

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!programId || !evId) {
		return (
			<EmptyState
				viewId="view-email-dispatch"
				message="Select a Program and Event using the catalog pickers to manage email dispatches."
			/>
		);
	}

	return <EmailDispatchView />;
}
