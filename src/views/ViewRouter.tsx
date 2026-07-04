import { useActiveRoute } from '../router/navigation';
import { CatalogAdminView } from './CatalogAdminView';
import { AgendaView } from './AgendaView';
import { AnalyticsView } from './AnalyticsView';
import { AttendeesView } from './AttendeesView';
import { CheckInView } from './CheckInView';
import { EmailView } from './EmailView';
import { EventHubView } from './EventHubView';
import { EventsView } from './EventsView';
import { RoutePlaceholder } from './RoutePlaceholder';
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
		case 'event-hub':
			return <EventHubView />;
		case 'attendees':
			return <AttendeesView />;
		case 'analytics':
			return <AnalyticsView />;
		case 'agenda':
			return <AgendaView />;
		case 'check-in':
			return <CheckInView />;
		case 'settings':
			return <SettingsView />;
		case 'email':
			return <EmailView />;
		default:
			return <RoutePlaceholder />;
	}
}
