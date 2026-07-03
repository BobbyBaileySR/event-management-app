import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import type { Attendee, EmailTemplate, Event, ScheduledEmail } from '../types';
import { EmailView } from './EmailView';

const mockEvent: Event = {
	id: 'evt-london-q3',
	name: 'London Q3 Summit',
	date: 'Oct 15, 2026',
	dateIso: '2026-10-15',
	location: 'London',
	status: 'active',
	attendeeCount: 2,
	capacity: 100,
	type: 'In-person',
	owner: 'events@adaptavist.com',
	registrationClose: 'Oct 10, 2026',
	hubspotId: 'HS-1',
	description: 'Test',
};

const mockAttendees: Attendee[] = [
	{
		id: 'c-001',
		name: 'Jane Doe',
		email: 'jane@example.com',
		company: 'Adaptavist',
		status: 'Registered',
		ticketType: 'General',
		registeredAt: '2026-08-01',
		source: 'HubSpot form',
	},
	{
		id: 'c-002',
		name: 'John Smith',
		email: 'john@example.com',
		company: 'Atlassian',
		status: 'Checked In',
		ticketType: 'VIP',
		registeredAt: '2026-08-12',
		source: 'Partner invite',
	},
];

const mockTemplates: EmailTemplate[] = [
	{
		id: 'tpl-invite',
		name: '<script>alert(1)</script> Invite',
		description: 'First touch',
		category: 'Invitation',
	},
];

const mockScheduled: ScheduledEmail[] = [
	{
		id: 'sch-001',
		templateName: 'Reminder',
		segment: 'Registered',
		scheduledAt: '2026-10-13T09:00:00Z',
		recipientCount: 42,
		status: 'Scheduled',
	},
];

const mockDataService = {
	fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
	fetchAttendees: vi.fn().mockResolvedValue({ attendees: mockAttendees }),
	fetchTemplates: vi.fn().mockResolvedValue({ templates: mockTemplates }),
	fetchScheduledEmails: vi.fn().mockResolvedValue({ scheduled: mockScheduled }),
	previewEmail: vi.fn().mockResolvedValue({ recipientCount: 1, scheduledAt: null }),
	sendEmail: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'sent', recipientCount: 1 }),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderEmail() {
	return render(
		<MemoryRouter initialEntries={['/events/evt-london-q3/email']}>
			<ToastProvider>
				<ConfirmProvider>
					<Routes>
						<Route path="/events/:eventId/:module" element={<EmailView />} />
					</Routes>
				</ConfirmProvider>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('EmailView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDataService.fetchEvent.mockResolvedValue({ event: mockEvent });
		mockDataService.fetchAttendees.mockResolvedValue({ attendees: mockAttendees });
		mockDataService.fetchTemplates.mockResolvedValue({ templates: mockTemplates });
		mockDataService.fetchScheduledEmails.mockResolvedValue({ scheduled: mockScheduled });
		mockDataService.previewEmail.mockResolvedValue({ recipientCount: 1, scheduledAt: null });
		mockDataService.sendEmail.mockResolvedValue({ jobId: 'job-1', status: 'sent', recipientCount: 1 });
	});

	it('shows audience counts and scheduled sends', async () => {
		renderEmail();

		await waitFor(() => {
			expect(screen.getByText('Audience overview')).toBeInTheDocument();
		});

		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('Reminder')).toBeInTheDocument();
	});

	it('queues send for registered segment', async () => {
		renderEmail();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Send email' })).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText('Segment'), { target: { value: 'Registered' } });
		fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

		await waitFor(() => {
			expect(mockDataService.sendEmail).toHaveBeenCalled();
		});

		expect(screen.getByRole('status')).toHaveTextContent(/Success: 1 emails queued/);
	});

	it('escapes hostile template name in select (XSS)', async () => {
		renderEmail();

		await waitFor(() => {
			expect(screen.getByLabelText('Template')).toBeInTheDocument();
		});

		expect(document.querySelector('script')).toBeNull();
		expect(screen.getByText('<script>alert(1)</script> Invite — Invitation')).toBeInTheDocument();
	});
});
