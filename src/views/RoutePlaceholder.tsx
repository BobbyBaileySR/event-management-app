import { useActiveRoute } from '../router/navigation';
import { EVENT_MODULES } from '../config/eventModules';
import styles from './RoutePlaceholder.module.css';

const ROUTE_LABELS: Record<string, string> = {
	events: 'All Events',
	'event-hub': 'Event Hub',
	...Object.fromEntries(EVENT_MODULES.map((module) => [module.id, module.label])),
};

/**
 * Temporary R1 stand-in proving routing + params work. Each real view
 * (Events, Event Hub, Attendees, Email, Analytics, ...) replaces this in R3.
 */
export function RoutePlaceholder() {
	const { name, eventId } = useActiveRoute();
	const label = ROUTE_LABELS[name] ?? name;

	return (
		<section className={styles.view}>
			<h1 className={styles.title}>{label}</h1>
			<p className={styles.meta}>Route ready — view ported in R3.</p>
			{eventId ? <p className={styles.meta}>Event: {eventId}</p> : null}
		</section>
	);
}
