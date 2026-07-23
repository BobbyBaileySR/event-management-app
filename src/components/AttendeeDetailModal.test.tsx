import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendeeDetailModal } from './AttendeeDetailModal';
import { ConfirmProvider } from './ConfirmModal';
import { ToastProvider } from './Toast';
import type {
	AttendeeCommunicationsResponse,
	AttendeeDetail,
	AttendeeNotesResponse,
	ConversationNoteEntry,
	GenerateLeadResponse,
} from '../types';

/** The modal calls useToast() (Generate Lead action) and useConfirm() (note delete) — every render needs both ancestors. */
function render(ui: ReactElement) {
	return rtlRender(
		<ToastProvider>
			<ConfirmProvider>{ui}</ConfirmProvider>
		</ToastProvider>,
	);
}

const baseDetail: AttendeeDetail = {
	contactId: 'c-001',
	firstName: 'Amara',
	lastName: 'Okafor',
	company: 'Northwind',
	email: 'amara.okafor@northwind.io',
	accountManager: 'sam@adaptavist.com',
	attendeeType: 'customer',
	checkedIn: true,
	checkedInAt: '2026-09-02T08:52:00.000Z',
	phone: '+1 415 555 0101',
	jobTitle: 'Marketing Director',
	dietaryRequirement: 'Gluten-free',
	registrationSource: null,
	journey: [
		{ type: 'registered', timestamp: null, label: 'Registered', source: 'this_event' },
		{ type: 'dispatch_sent', timestamp: '2026-08-15T09:00:00.000Z', label: 'Confirmation email sent', source: 'this_event' },
		{ type: 'dispatch_opened', timestamp: null, label: 'Confirmation email opened', source: 'this_event' },
		{ type: 'checked_in', timestamp: '2026-09-02T08:52:00.000Z', label: 'Checked in at the venue', source: 'this_event' },
	],
	registrationAnswerHistory: [],
};

const mockFetchAttendeeDetail = vi.fn();
const mockFetchAttendeeCommunications = vi.fn();
const mockGenerateAttendeeLead = vi.fn();
const mockFetchAttendeeNotes = vi.fn();
const mockCreateAttendeeNote = vi.fn();
const mockUpdateAttendeeNote = vi.fn();
const mockDeleteAttendeeNote = vi.fn();
const mockDataService = {
	fetchAttendeeDetail: mockFetchAttendeeDetail,
	fetchAttendeeCommunications: mockFetchAttendeeCommunications,
	generateAttendeeLead: mockGenerateAttendeeLead,
	fetchAttendeeNotes: mockFetchAttendeeNotes,
	createAttendeeNote: mockCreateAttendeeNote,
	updateAttendeeNote: mockUpdateAttendeeNote,
	deleteAttendeeNote: mockDeleteAttendeeNote,
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

const baseCommunications: AttendeeCommunicationsResponse = {
	contactId: 'c-001',
	cutoffTimestamp: '2026-08-15T09:00:00.000Z',
	timeline: baseDetail.journey,
};

describe('AttendeeDetailModal', () => {
	beforeEach(() => {
		mockFetchAttendeeDetail.mockReset();
		mockFetchAttendeeDetail.mockResolvedValue(baseDetail);
		mockFetchAttendeeCommunications.mockReset();
		mockFetchAttendeeCommunications.mockResolvedValue(baseCommunications);
		mockGenerateAttendeeLead.mockReset();
		mockGenerateAttendeeLead.mockResolvedValue({ outcome: 'created', leadId: 'lead-1' } satisfies GenerateLeadResponse);
		mockFetchAttendeeNotes.mockReset();
		mockFetchAttendeeNotes.mockResolvedValue({ notes: [] } satisfies AttendeeNotesResponse);
		mockCreateAttendeeNote.mockReset();
		mockUpdateAttendeeNote.mockReset();
		mockDeleteAttendeeNote.mockReset();
	});

	it('renders nothing when closed', () => {
		render(
			<AttendeeDetailModal open={false} eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />,
		);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('fetches and renders Basic Information and the event-only Attendee Journey', async () => {
		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);

		await waitFor(() => {
			expect(mockFetchAttendeeDetail).toHaveBeenCalledWith('ev-1', 'c-001');
		});

		expect(await screen.findByRole('heading', { name: 'Amara Okafor' })).toBeInTheDocument();
		expect(screen.getByText('amara.okafor@northwind.io')).toBeInTheDocument();
		expect(screen.getByText('+1 415 555 0101')).toBeInTheDocument();
		expect(screen.getByText('Northwind')).toBeInTheDocument();
		expect(screen.getByText('Marketing Director')).toBeInTheDocument();
		expect(screen.getByText('Gluten-free')).toBeInTheDocument();

		expect(screen.getByText('Registered')).toBeInTheDocument();
		expect(screen.getByText('Confirmation email sent')).toBeInTheDocument();
		expect(screen.getByText('Confirmation email opened')).toBeInTheDocument();
		expect(screen.getByText('Checked in at the venue')).toBeInTheDocument();
		expect(screen.getAllByText('Not yet').length).toBe(2);
	});

	it('shows no edit control anywhere and never renders a raw HubSpot contact ID', async () => {
		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);

		await screen.findByRole('heading', { name: 'Amara Okafor' });

		expect(screen.queryByText(/c-001/)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
	});

	it('omits phone/job title/dietary requirement fields rather than showing a placeholder when absent', async () => {
		mockFetchAttendeeDetail.mockResolvedValue({
			...baseDetail,
			phone: null,
			jobTitle: null,
			dietaryRequirement: null,
			registrationSource: null,
		});

		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);

		await screen.findByRole('heading', { name: 'Amara Okafor' });

		expect(screen.queryByText('Phone')).not.toBeInTheDocument();
		expect(screen.queryByText('Job title')).not.toBeInTheDocument();
		expect(screen.queryByText('Dietary requirement')).not.toBeInTheDocument();
		expect(screen.queryByText('Registration source')).not.toBeInTheDocument();
	});

	it('renders hostile company/job title/dietary requirement strings as literal text, never markup', async () => {
		const hostile = '<script>alert(1)</script>';
		mockFetchAttendeeDetail.mockResolvedValue({
			...baseDetail,
			company: hostile,
			jobTitle: hostile,
			dietaryRequirement: hostile,
		});

		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);

		await screen.findByRole('heading', { name: 'Amara Okafor' });

		expect(screen.getAllByText(hostile).length).toBeGreaterThan(0);
		expect(document.querySelector('script')).toBeNull();
	});

	it('mounts the Registration history panel when registrationAnswerHistory is present, and shows the empty state when absent (013-registration-form-bridge)', async () => {
		mockFetchAttendeeDetail.mockResolvedValue({
			...baseDetail,
			registrationAnswerHistory: [
				{
					answers: { 'What would you like to discuss?': 'Renewal timeline' },
					source: 'registration',
					observedAt: '2026-08-01T10:00:00.000Z',
					slot: 1,
				},
			],
		});

		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
		await screen.findByRole('heading', { name: 'Amara Okafor' });

		expect(screen.getByRole('heading', { name: 'Registration history' })).toBeInTheDocument();
		expect(screen.getByText('Renewal timeline')).toBeInTheDocument();
	});

	it('shows the Registration history empty state when no answers are recorded', async () => {
		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
		await screen.findByRole('heading', { name: 'Amara Okafor' });

		expect(screen.getByRole('heading', { name: 'Registration history' })).toBeInTheDocument();
		expect(screen.getByText('No registration answers recorded yet.')).toBeInTheDocument();
	});

	it('shows an inline error with retry when the fetch fails, and recovers on retry', async () => {
		const user = userEvent.setup();
		mockFetchAttendeeDetail.mockRejectedValueOnce(new Error('Failed to load attendee'));

		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);

		expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load attendee');

		mockFetchAttendeeDetail.mockResolvedValueOnce(baseDetail);
		await user.click(screen.getByRole('button', { name: 'Try again' }));

		expect(await screen.findByRole('heading', { name: 'Amara Okafor' })).toBeInTheDocument();
	});

	it('calls onClose from the Close button', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={onClose}  variant="registered" />);

		await screen.findByRole('heading', { name: 'Amara Okafor' });
		const closeButtons = screen.getAllByRole('button', { name: 'Close' });
		await user.click(closeButtons[closeButtons.length - 1]!);

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	describe('"Show all communications" toggle (US2)', () => {
		it('expands/collapses and flips its own label, fetching only once', async () => {
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Show all communications' }));
			expect(await screen.findByRole('button', { name: 'Hide all communications' })).toBeInTheDocument();
			expect(mockFetchAttendeeCommunications).toHaveBeenCalledWith('c-001', 'ev-1');
			expect(mockFetchAttendeeCommunications).toHaveBeenCalledTimes(1);

			await user.click(screen.getByRole('button', { name: 'Hide all communications' }));
			expect(await screen.findByRole('button', { name: 'Show all communications' })).toBeInTheDocument();

			// Toggling back on does not re-fetch — already-loaded data is reused.
			await user.click(screen.getByRole('button', { name: 'Show all communications' }));
			expect(mockFetchAttendeeCommunications).toHaveBeenCalledTimes(1);
		});

		it('shows a loading state while the expansion is in flight', async () => {
			const user = userEvent.setup();
			let resolveFetch: (value: AttendeeCommunicationsResponse) => void = () => {};
			mockFetchAttendeeCommunications.mockReturnValue(
				new Promise((resolve) => {
					resolveFetch = resolve;
				}),
			);

			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Show all communications' }));
			expect(await screen.findByText('Loading all communications…')).toBeInTheDocument();

			resolveFetch(baseCommunications);
			await waitFor(() => {
				expect(screen.queryByText('Loading all communications…')).not.toBeInTheDocument();
			});
		});

		it('keeps the event-only timeline visible with a retry when the expansion fetch fails (modal never blanks)', async () => {
			const user = userEvent.setup();
			mockFetchAttendeeCommunications.mockRejectedValueOnce(new Error('All communications unavailable'));

			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Show all communications' }));

			expect(await screen.findByRole('alert')).toHaveTextContent('All communications unavailable');
			// The base this-Event journey is still fully rendered — the modal never blanks.
			expect(screen.getByText('Registered')).toBeInTheDocument();
			expect(screen.getByText('Confirmation email sent')).toBeInTheDocument();
			expect(screen.getByText('Checked in at the venue')).toBeInTheDocument();

			mockFetchAttendeeCommunications.mockResolvedValueOnce(baseCommunications);
			await user.click(screen.getByRole('button', { name: 'Try again' }));
			await waitFor(() => {
				expect(screen.queryByRole('alert')).not.toBeInTheDocument();
			});
		});

		it('is a silent no-op when the expansion has no additional non-Event items', async () => {
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			const user = userEvent.setup();
			await user.click(screen.getByRole('button', { name: 'Show all communications' }));

			await waitFor(() => expect(mockFetchAttendeeCommunications).toHaveBeenCalled());
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
			expect(screen.getAllByRole('listitem')).toHaveLength(baseDetail.journey.length);
		});

		it('tags an other-Event item with its Event name and an external item with the generic "OTHER DISPATCH" label', async () => {
			mockFetchAttendeeCommunications.mockResolvedValue({
				contactId: 'c-001',
				cutoffTimestamp: '2026-08-15T09:00:00.000Z',
				timeline: [
					...baseDetail.journey,
					{
						type: 'dispatch_sent',
						timestamp: '2026-11-02T09:00:00.000Z',
						label: 'Post-Event Thank You sent',
						source: 'other_event',
						tag: { kind: 'other_event', eventName: 'Executive Roundtable 2026' },
					},
					{
						type: 'dispatch_sent',
						timestamp: '2026-12-10T09:00:00.000Z',
						label: 'Developer Newsletter sent',
						source: 'external',
						tag: { kind: 'external' },
					},
				],
			} satisfies AttendeeCommunicationsResponse);

			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Show all communications' }));

			expect(await screen.findByText('Executive Roundtable 2026')).toBeInTheDocument();
			expect(screen.getByText('OTHER DISPATCH')).toBeInTheDocument();
		});
	});

	describe('Create lead action (014-lead-generation US1)', () => {
		it('calls dataService.generateAttendeeLead and shows a success toast on click', async () => {
			mockGenerateAttendeeLead.mockResolvedValue({ outcome: 'created', leadId: 'lead-42' } satisfies GenerateLeadResponse);
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Create lead' }));

			await waitFor(() => {
				expect(mockGenerateAttendeeLead).toHaveBeenCalledWith('ev-1', 'c-001', { includeFullHistory: false });
			});
			expect(await screen.findByText('Lead created in HubSpot')).toBeInTheDocument();
			expect(screen.getByText('HubSpot Lead ID: lead-42')).toBeInTheDocument();
		});

		it('passes includeFullHistory: true when the expanded-history checkbox is checked (US4)', async () => {
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('checkbox', { name: /full cross-event history/i }));
			await user.click(screen.getByRole('button', { name: 'Create lead' }));

			await waitFor(() => {
				expect(mockGenerateAttendeeLead).toHaveBeenCalledWith('ev-1', 'c-001', { includeFullHistory: true });
			});
		});

		it('shows a distinct message for the updated and created_separate outcomes', async () => {
			mockGenerateAttendeeLead.mockResolvedValue({ outcome: 'updated', leadId: 'lead-7' } satisfies GenerateLeadResponse);
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await user.click(screen.getByRole('button', { name: 'Create lead' }));

			expect(await screen.findByText('Lead updated — a new note was added')).toBeInTheDocument();
		});

		it('shows a failure toast when the API call rejects, and re-enables the button', async () => {
			mockGenerateAttendeeLead.mockRejectedValue(new Error('Could not generate the Lead in HubSpot'));
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			const button = screen.getByRole('button', { name: 'Create lead' });
			await user.click(button);

			expect(await screen.findByText('Could not generate the Lead in HubSpot')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Create lead' })).not.toBeDisabled();
		});

		it('disables the button and shows a busy state while the request is in flight', async () => {
			let resolveCall: (value: GenerateLeadResponse) => void = () => {};
			mockGenerateAttendeeLead.mockReturnValue(
				new Promise<GenerateLeadResponse>((resolve) => {
					resolveCall = resolve;
				}),
			);
			const user = userEvent.setup();
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			const button = screen.getByRole('button', { name: 'Create lead' });
			await user.click(button);

			expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();

			resolveCall({ outcome: 'created', leadId: 'lead-1' });
			await waitFor(() => {
				expect(screen.getByRole('button', { name: 'Create lead' })).not.toBeDisabled();
			});
		});
	});

	describe('Notes section (015-conversation-notes, US2/US3/US5)', () => {
		function makeNote(overrides: Partial<ConversationNoteEntry> = {}): ConversationNoteEntry {
			return {
				noteId: 'n-1',
				content: 'Interested in renewal pricing',
				authorEmail: 'author-admin@adaptavist.com',
				createdAt: '2026-08-01T10:00:00.000Z',
				editHistory: [],
				eventId: 'ev-1',
				...overrides,
			};
		}

		it('fetches and renders captured notes with author and timestamp', async () => {
			mockFetchAttendeeNotes.mockResolvedValue({ notes: [makeNote()] } satisfies AttendeeNotesResponse);

			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			await waitFor(() => {
				expect(mockFetchAttendeeNotes).toHaveBeenCalledWith('ev-1', 'c-001', { allEvents: false });
			});
			expect(await screen.findByText('Interested in renewal pricing')).toBeInTheDocument();
			expect(screen.getByText('author-admin@adaptavist.com')).toBeInTheDocument();
		});

		it('shows the empty state when no notes are recorded yet', async () => {
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			expect(await screen.findByText('No notes recorded yet.')).toBeInTheDocument();
		});

		it('adds a note via the form and shows a success toast (conversations compose mode)', async () => {
			const user = userEvent.setup();
			mockCreateAttendeeNote.mockResolvedValue(makeNote({ noteId: 'n-new', content: 'New note text' }));
			render(
				<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="conversations" />,
			);
			await screen.findByRole('heading', { name: 'Amara Okafor' });
			await screen.findByText('No notes recorded yet.');

			await user.type(screen.getByLabelText('Add a note'), 'New note text');
			await user.click(screen.getByRole('button', { name: 'Save note' }));

			await waitFor(() => {
				expect(mockCreateAttendeeNote).toHaveBeenCalledWith('ev-1', 'c-001', 'New note text');
			});
			expect(await screen.findByText('Note added')).toBeInTheDocument();
			expect(await screen.findByText('New note text')).toBeInTheDocument();
		});

		it('registered variant shows notes history without the add form or edit/delete controls', async () => {
			mockFetchAttendeeNotes.mockResolvedValue({ notes: [makeNote()] } satisfies AttendeeNotesResponse);
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });
			expect(await screen.findByText('Interested in renewal pricing')).toBeInTheDocument();

			expect(screen.queryByLabelText('Add a note')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Save note' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
		});

		it('renders a hostile note content string as literal text, never markup (staff-authored but still guarded)', async () => {
			const hostile = '<img src=x onerror=alert(1)>';
			mockFetchAttendeeNotes.mockResolvedValue({
				notes: [makeNote({ content: hostile })],
			} satisfies AttendeeNotesResponse);

			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			expect(await screen.findByText(hostile)).toBeInTheDocument();
			expect(document.querySelector('img')).toBeNull();
		});

		it('the "Show notes from all events" toggle refetches with allEvents: true and tags other-event notes', async () => {
			const user = userEvent.setup();
			mockFetchAttendeeNotes.mockResolvedValueOnce({ notes: [makeNote()] } satisfies AttendeeNotesResponse);
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()}  variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });
			await screen.findByText('Interested in renewal pricing');

			mockFetchAttendeeNotes.mockResolvedValueOnce({
				notes: [makeNote(), makeNote({ noteId: 'n-2', content: 'From another event', eventId: 'ev-2' })],
			} satisfies AttendeeNotesResponse);
			await user.click(screen.getByRole('checkbox', { name: 'Show notes from all events' }));

			await waitFor(() => {
				expect(mockFetchAttendeeNotes).toHaveBeenCalledWith('ev-1', 'c-001', { allEvents: true });
			});
			expect(await screen.findByText('From another event')).toBeInTheDocument();
			expect(screen.getByText('Other event')).toBeInTheDocument();
		});

		/**
		 * T035 — the core no-author-lock property (ADR-019 decision #5) proven end-to-end through
		 * the UI, not just at the API layer: the modal never gates the Edit/Delete controls to the
		 * note's own `authorEmail`. A note authored by one admin is fully editable/deletable by
		 * whichever admin is currently viewing it — the component has no concept of "current user"
		 * to check against at all, matching the server's intentionally open policy.
		 */
		it('a note authored by a different admin can still be edited and deleted through the UI (no author lock)', async () => {
			const user = userEvent.setup();
			const noteFromAnotherAdmin = makeNote({ authorEmail: 'author-admin@adaptavist.com' });
			mockFetchAttendeeNotes.mockResolvedValueOnce({
				notes: [noteFromAnotherAdmin],
			} satisfies AttendeeNotesResponse);
			mockUpdateAttendeeNote.mockResolvedValue(
				makeNote({ content: 'Corrected by a different admin', authorEmail: 'author-admin@adaptavist.com' }),
			);

			render(
				<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="conversations" />,
			);
			await screen.findByRole('heading', { name: 'Amara Okafor' });
			await screen.findByText('Interested in renewal pricing');

			// Edit — available even though this viewing admin is not the note's author.
			await user.click(screen.getByRole('button', { name: 'Edit' }));
			const editBox = screen.getByRole('textbox', { name: 'Edit note' });
			await user.clear(editBox);
			await user.type(editBox, 'Corrected by a different admin');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => {
				expect(mockUpdateAttendeeNote).toHaveBeenCalledWith(
					'ev-1',
					'c-001',
					'n-1',
					'Corrected by a different admin',
				);
			});
			expect(await screen.findByText('Note updated')).toBeInTheDocument();
			expect(await screen.findByText('Corrected by a different admin')).toBeInTheDocument();

			// Delete — same story: no author check blocks it. Confirming opens a second dialog
			// whose own "Delete" button coexists briefly with the note row's — disambiguate by index.
			mockDeleteAttendeeNote.mockResolvedValue(undefined);
			await user.click(screen.getByRole('button', { name: 'Delete' }));
			const confirmButtons = await screen.findAllByRole('button', { name: 'Delete' });
			await user.click(confirmButtons[confirmButtons.length - 1]!);

			await waitFor(() => {
				expect(mockDeleteAttendeeNote).toHaveBeenCalledWith('ev-1', 'c-001', 'n-1');
			});
			expect(await screen.findByText('Note deleted')).toBeInTheDocument();
			expect(screen.queryByText('Corrected by a different admin')).not.toBeInTheDocument();
		});

		it('shows a failure toast when adding a note fails', async () => {
			const user = userEvent.setup();
			mockCreateAttendeeNote.mockRejectedValue(new Error('Failed to add note'));
			render(
				<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="conversations" />,
			);
			await screen.findByRole('heading', { name: 'Amara Okafor' });
			await screen.findByText('No notes recorded yet.');

			await user.type(screen.getByLabelText('Add a note'), 'Will fail');
			await user.click(screen.getByRole('button', { name: 'Save note' }));

			expect(await screen.findByText('Failed to add note')).toBeInTheDocument();
		});
	});

	describe('variant section visibility', () => {
		it('conversations hides Create lead, Attendee Journey, and Registration History', async () => {
			render(
				<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="conversations" />,
			);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
			expect(screen.getByLabelText('Add a note')).toBeInTheDocument();

			expect(screen.queryByRole('button', { name: 'Create lead' })).not.toBeInTheDocument();
			expect(screen.queryByRole('heading', { name: 'Attendee Journey' })).not.toBeInTheDocument();
			expect(screen.queryByRole('heading', { name: 'Registration history' })).not.toBeInTheDocument();
			expect(screen.queryByRole('heading', { name: 'HubSpot Lead' })).not.toBeInTheDocument();
			expect(screen.queryByText('Confirmation email sent')).not.toBeInTheDocument();
		});

		it('registered shows Create lead in the footer with journey and registration history', async () => {
			render(<AttendeeDetailModal open eventId="ev-1" contactId="c-001" onClose={vi.fn()} variant="registered" />);
			await screen.findByRole('heading', { name: 'Amara Okafor' });

			expect(screen.getByRole('button', { name: 'Create lead' })).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: 'Attendee Journey' })).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: 'Registration history' })).toBeInTheDocument();
			expect(screen.getByRole('checkbox', { name: /full cross-event history/i })).toBeInTheDocument();
			expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
		});
	});
});
