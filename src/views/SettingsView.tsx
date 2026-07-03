import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import type { Event } from '../types';

function capitalizeStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SettingsView() {
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const { showToast } = useToast();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<Event | null>(null);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		data
			.fetchEvent(eventId)
			.then(({ event: loaded }) => {
				if (!cancelled) {
					setEvent(loaded);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load settings');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId]);

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-settings"
				message="Select an event from All Events to view settings."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return <div className="loading">Loading settings…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-settings"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	const fields: [string, string][] = [
		['Event name', event.name],
		['Status', capitalizeStatus(event.status)],
		['Type', event.type],
		['Start date', event.date],
		['End date', event.endDate ?? event.date],
		['Location', event.location],
		['Capacity', String(event.capacity)],
		['Registration closes', event.registrationClose],
		['HubSpot record', event.hubspotId],
		['Event owner', event.owner],
	];

	const isDraft = event.status === 'draft';
	const isTerminal = event.status === 'cancelled' || event.status === 'completed';

	return (
		<section id="view-settings">
			<TopBar title={`${event.name} — Settings`} meta="Event configuration (read-only in PoC)" />

			<div className="grid-2">
				<div className="card">
					<div className="card__header">
						<h3>Event details</h3>
					</div>
					<dl className="detail-list">
						{fields.flatMap(([label, value]) => [
							<dt key={`${label}-dt`}>{label}</dt>,
							<dd key={`${label}-dd`}>{value}</dd>,
						])}
					</dl>
					<p className="shell-note">{event.description}</p>
					<button
						type="button"
						className="btn btn-outline"
						onClick={() => showToast('Opens HubSpot record in a later phase.', 'success')}
					>
						Edit in HubSpot
					</button>
				</div>

				<div className="card">
					<div className="card__header">
						<h3>Registration & access</h3>
					</div>
					<ul className="stats-list">
						<li>
							<strong>Public registration</strong>
							<span>{isDraft ? 'Off (draft)' : 'On'}</span>
						</li>
						<li>
							<strong>Waitlist</strong>
							<span>Disabled</span>
						</li>
						<li>
							<strong>Ticket types</strong>
							<span>General, VIP, Partner</span>
						</li>
					</ul>
					<p className="empty-state__hint">
						Editing registration rules from EMS is Phase 5+. HubSpot remains source of truth.
					</p>
					<div className="form-row">
						<button
							type="button"
							className="btn btn-outline btn-sm"
							disabled={isDraft}
							onClick={() => showToast('Registration URL copied (mock).', 'success')}
						>
							Copy registration link
						</button>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={() => showToast('Team management connects in a later phase.', 'success')}
						>
							Manage team
						</button>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="card__header">
					<h3>Danger zone</h3>
				</div>
				<p>Cancel event or archive HubSpot association — disabled in PoC.</p>
				<button
					type="button"
					className="btn btn-outline"
					disabled={isTerminal}
					onClick={() => showToast('Cancellation workflow is Phase 5+.', 'error')}
				>
					Cancel event
				</button>
			</div>
		</section>
	);
}
