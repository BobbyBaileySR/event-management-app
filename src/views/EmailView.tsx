import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { useConfirm } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { countSegment, filterAttendees } from '../utils/listFilters';
import { useDataService } from '../hooks/useDataService';
import { eventPath, useActiveRoute } from '../router/navigation';
import type { Attendee, EmailTemplate, Event, ScheduledEmail } from '../types';
import { formatDateTime } from '../utils/format';

type SendMode = 'now' | 'later';
type SegmentFilter = 'All' | 'Registered' | 'Checked In';

export function EmailView() {
	const navigate = useNavigate();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const { showToast } = useToast();
	const { confirm } = useConfirm();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<Event | null>(null);
	const [attendees, setAttendees] = useState<Attendee[]>([]);
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
	const [templateId, setTemplateId] = useState('');
	const [segment, setSegment] = useState<SegmentFilter>('All');
	const [sendMode, setSendMode] = useState<SendMode>('now');
	const [scheduleValue, setScheduleValue] = useState('');
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		Promise.all([
			data.fetchEvent(eventId),
			data.fetchAttendees(eventId),
			data.fetchTemplates(eventId),
			data.fetchScheduledEmails(eventId),
		])
			.then(([eventResult, attendeesResult, templatesResult, scheduledResult]) => {
				if (cancelled) {
					return;
				}
				if (!eventResult.event) {
					setEvent(null);
					return;
				}
				setEvent(eventResult.event);
				setAttendees(attendeesResult.attendees);
				setTemplates(templatesResult.templates);
				setScheduled(scheduledResult.scheduled);
				setTemplateId(templatesResult.templates[0]?.id ?? '');
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load email module');
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

	const selectedTemplate = useMemo(
		() => templates.find((template) => template.id === templateId),
		[templates, templateId],
	);

	async function handleSend() {
		if (!eventId || !templateId) {
			return;
		}

		const segmentAttendees = filterAttendees(segment, attendees);
		const contactIds = segmentAttendees.map((person) => person.id);

		if (contactIds.length === 0) {
			showToast('No recipients in the selected segment.', 'error');
			return;
		}

		const scheduledAt =
			sendMode === 'later' && scheduleValue ? new Date(scheduleValue).toISOString() : undefined;

		if (sendMode === 'later' && !scheduledAt) {
			showToast('Choose a schedule date and time.', 'error');
			return;
		}

		const payload = {
			eventId,
			templateId,
			contactIds,
			scheduledAt,
			idempotencyKey: crypto.randomUUID(),
		};

		setSending(true);
		try {
			const preview = await data.previewEmail(payload);

			if (preview.recipientCount >= CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD) {
				const templateLabel = selectedTemplate
					? `${selectedTemplate.name} — ${selectedTemplate.category}`
					: templateId;
				const confirmed = await confirm({
					title: 'Confirm large send',
					message: `You are about to ${scheduledAt ? 'schedule' : 'send'} "${templateLabel}" to ${preview.recipientCount} recipients. Proceed?`,
					confirmLabel: scheduledAt ? 'Schedule send' : 'Send now',
				});
				if (!confirmed) {
					return;
				}
			}

			const result = await data.sendEmail(payload);
			const verb = result.status === 'scheduled' ? 'scheduled' : 'queued';
			showToast(`Success: ${result.recipientCount} emails ${verb} (PoC — no live HubSpot send).`);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Send failed', 'error');
		} finally {
			setSending(false);
		}
	}

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-email"
				message="Select an event from All Events to send email."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return (
			<section id="view-email">
				<TopBar title="Email" meta="Loading email module…" />
				<LoadingState message="Loading email module…" skeleton="lines" skeletonRows={6} />
			</section>
		);
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	if (!event) {
		return (
			<EmptyState
				viewId="view-email"
				message="This event was not found."
				action={{ label: 'Back to All Events', to: '/events' }}
			/>
		);
	}

	return (
		<section id="view-email">
			<TopBar
				title={`${event.name} — Email`}
				meta="HubSpot marketing templates · PoC send flow (no live dispatch yet)"
			/>

			<div className="grid-2">
				<div className="card">
					<div className="card__header">
						<h3>Audience overview</h3>
					</div>
					<ul className="stats-list">
						<li>
							<strong>All contacts</strong>
							<span>{countSegment('All', attendees)}</span>
						</li>
						<li>
							<strong>Registered</strong>
							<span>{countSegment('Registered', attendees)}</span>
						</li>
						<li>
							<strong>Checked in</strong>
							<span>{countSegment('Checked In', attendees)}</span>
						</li>
					</ul>
					<button type="button" className="btn btn-link" onClick={() => navigate(eventPath(event.id, 'attendees'))}>
						Open Attendees →
					</button>
				</div>

				<div className="card card--accent">
					<div className="card__header">
						<h3>Compose send</h3>
					</div>
					<div className="form-group">
						<label htmlFor="template-select">Template</label>
						<select
							id="template-select"
							value={templateId}
							onChange={(event) => setTemplateId(event.target.value)}
						>
							{templates.map((template) => (
								<option key={template.id} value={template.id}>
									{template.name} — {template.category}
								</option>
							))}
						</select>
						<button
							type="button"
							className="btn btn-link"
							onClick={() => showToast('Template preview opens HubSpot content in a later phase.', 'success')}
						>
							Preview template
						</button>
					</div>
					<div className="form-group">
						<label htmlFor="audience-select">Segment</label>
						<select
							id="audience-select"
							value={segment}
							onChange={(event) => setSegment(event.target.value as SegmentFilter)}
						>
							{(['All', 'Registered', 'Checked In'] as const).map((option) => (
								<option key={option} value={option}>
									{option === 'All' ? 'All contacts' : option} ({countSegment(option, attendees)})
								</option>
							))}
						</select>
					</div>
					<div className="form-group">
						<label htmlFor="send-mode-select">Timing</label>
						<select
							id="send-mode-select"
							value={sendMode}
							onChange={(event) => setSendMode(event.target.value as SendMode)}
						>
							<option value="now">Send immediately</option>
							<option value="later">Schedule for later</option>
						</select>
					</div>
					<div className={`form-group ${sendMode !== 'later' ? 'hidden' : ''}`}>
						<label htmlFor="schedule-input">Schedule (UTC)</label>
						<input
							type="datetime-local"
							id="schedule-input"
							value={scheduleValue}
							disabled={sendMode !== 'later'}
							onChange={(event) => setScheduleValue(event.target.value)}
						/>
					</div>
					<div className="email-panel">
						<button type="button" className="btn btn-primary" disabled={sending} onClick={() => void handleSend()}>
							Send email
						</button>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="card__header">
					<h3>Scheduled sends</h3>
				</div>
				<table>
					<thead>
						<tr>
							<th>Template</th>
							<th>Segment</th>
							<th>When</th>
							<th>Audience</th>
						</tr>
					</thead>
					<tbody>
						{scheduled.length === 0 ? (
							<tr>
								<td colSpan={4}>No scheduled sends for this event.</td>
							</tr>
						) : (
							scheduled.map((row) => (
								<tr key={row.id}>
									<td>{row.templateName}</td>
									<td>{row.segment}</td>
									<td>{formatDateTime(row.scheduledAt)}</td>
									<td>
										{row.recipientCount} · {row.status}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}
