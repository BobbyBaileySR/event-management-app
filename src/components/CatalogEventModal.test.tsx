import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogEventModal } from './CatalogEventModal';
import type { CatalogEvent, CatalogProgram } from '../types';

const programs: CatalogProgram[] = [
	{
		id: 'prog-1',
		name: 'Atlassian Event 2026',
		archived: false,
	},
	{
		id: 'prog-2',
		name: 'QA Program 2026',
		archived: false,
	},
];

const baseEvent: CatalogEvent = {
	id: 'ev-1',
	programId: 'prog-1',
	name: 'Keynote',
	start: '2026-09-02T09:00:00.000Z',
	status: 'active',
	publishState: 'draft',
	archived: false,
};

function todayIsoDate(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function pickRequiredStart(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: /Start Date:/i }));
	await user.keyboard('{Enter}');
}

describe('CatalogEventModal', () => {
	const onCancel = vi.fn();
	const onSave = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		onCancel.mockReset();
		onSave.mockReset();
		onSave.mockResolvedValue(undefined);
	});

	it('renders create dialog with Program select and a11y attributes', () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(screen.getByLabelText(/^Program/)).toBeInTheDocument();
		expect(screen.getByLabelText(/^Event name/)).toHaveFocus();
	});

	it('marks Event name and Start Date — its only two truly required fields — with a visible asterisk', () => {
		const { container } = render(
			<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />,
		);

		expect(container.querySelectorAll('.required-mark')).toHaveLength(2);
		expect(screen.getByRole('button', { name: /Start Date:/i })).toHaveAttribute('aria-required', 'true');
	});

	it('renders a title, subtitle, and close button, and closes on click (design_handoff 2)', () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);

		expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
		expect(screen.getByText('Add a standalone event or attach it to a program')).toBeInTheDocument();

		const closeButton = screen.getByRole('button', { name: 'Close' });
		expect(closeButton).toBeInTheDocument();
		closeButton.click();
		expect(onCancel).toHaveBeenCalled();
	});

	it('shows the edit subtitle in edit mode', () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={baseEvent}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
		expect(screen.getByText('Update details for this event')).toBeInTheDocument();
	});

	it('submits create payload with optional metadata and ISO start', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: /^Program/ }));
		await user.click(screen.getByRole('option', { name: 'Atlassian Event 2026' }));
		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.type(screen.getByLabelText('Owner'), 'Jane Doe');
		await user.type(screen.getByLabelText('Capacity'), '500');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith({
			programId: 'prog-1',
			name: 'Keynote',
			start: `${todayIsoDate()}T09:00:00.000Z`,
			publishState: 'draft',
			owner: 'Jane Doe',
			capacity: 500,
		});
	});

	it('combines a picked Start Time with Start Date into the datetime, instead of the hardcoded default', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.click(screen.getByRole('button', { name: /Start Time:/i }));
		await user.click(screen.getByRole('option', { name: '2:30 PM' }));
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				start: `${todayIsoDate()}T14:30:00.000Z`,
			}),
		);
	});

	it('combines End Date + End Time into the end datetime', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.click(screen.getByRole('button', { name: /End Date:/i }));
		await user.keyboard('{Enter}');
		await user.click(screen.getByRole('button', { name: /End Time:/i }));
		await user.click(screen.getByRole('option', { name: '5:00 PM' }));
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				end: `${todayIsoDate()}T17:00:00.000Z`,
			}),
		);
	});

	it('round-trips an existing event\'s start time into the Start Time field on edit', () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{ ...baseEvent, start: '2026-09-02T14:30:00.000Z' }}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);

		expect(screen.getByRole('button', { name: /Start Time: 2:30 PM/i })).toBeInTheDocument();
	});

	it('allows create with No program (standalone event)', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Standalone');
		await pickRequiredStart(user);
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.not.objectContaining({
				programId: expect.anything(),
			}),
		);
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Standalone',
				start: `${todayIsoDate()}T09:00:00.000Z`,
			}),
		);
	});

	it('shows read-only Program in edit mode and clears capacity with null', async () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{ ...baseEvent, capacity: 100 }}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);
		const user = userEvent.setup();

		expect(screen.getByText('Program:')).toBeInTheDocument();
		expect(screen.getByText('Atlassian Event 2026')).toBeInTheDocument();
		expect(screen.queryByLabelText('Program')).toBeNull();
		await user.clear(screen.getByLabelText('Capacity'));
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ capacity: null }));
	});

	it('shows Archive Event in edit mode and calls onArchive', async () => {
		const onArchive = vi.fn().mockResolvedValue(undefined);
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				event={{ ...baseEvent, archived: false }}
				onCancel={onCancel}
				onSave={onSave}
				onArchive={onArchive}
			/>,
		);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Archive Event' }));
		expect(onArchive).toHaveBeenCalled();
	});

	it('allows edit of a standalone event with No program label', () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={null}
				event={{ ...baseEvent, id: 'ev-solo', programId: null, name: 'Solo' }}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);

		expect(screen.getByText('No program')).toBeInTheDocument();
	});

	it('renders hostile owner text safely in the input value', () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{
					...baseEvent,
					id: 'ev-xss',
					name: 'VIP',
					owner: '"><script>alert(1)</script>',
				}}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);

		expect(screen.getByLabelText('Owner')).toHaveValue('"><script>alert(1)</script>');
		expect(document.querySelector('script')).toBeNull();
	});

	it('never renders a native select for Program (in-place menu instead)', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		expect(document.querySelector('select')).toBeNull();

		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: /^Program/ }));

		const listbox = screen.getByRole('listbox');
		expect(listbox).toBeInTheDocument();
		expect(document.querySelector('select')).toBeNull();
	});

	it('opens the Program menu in place and updates the selection on choose', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: /^Program/ }));
		await user.click(screen.getByRole('option', { name: 'QA Program 2026' }));

		expect(screen.getByRole('button', { name: /^Program/ })).toHaveTextContent('QA Program 2026');
		expect(screen.queryByRole('listbox')).toBeNull();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ programId: 'prog-2' }));
	});

	it('closes the Program menu on Escape and on outside click', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: /^Program/ }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(onCancel).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: /^Program/ }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.click(document.body);
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('dismisses on Escape when the Program menu is closed', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		await userEvent.setup().keyboard('{Escape}');
		expect(onCancel).toHaveBeenCalled();
	});

	it('does not overflow body horizontally at 375px viewport', () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});

	it('includes a valid walk-in form URL on create', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();
		const walkInUrl = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.type(screen.getByLabelText('Walk-in form URL (HubSpot)'), walkInUrl);
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				walkInFormUrl: walkInUrl,
			}),
		);
	});

	it('omits walkInFormUrl when the field is empty on create', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.not.objectContaining({
				walkInFormUrl: expect.anything(),
			}),
		);
	});

	it('blocks save and shows an error for a non-HubSpot walk-in URL', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.type(screen.getByLabelText('Walk-in form URL (HubSpot)'), 'https://evil.example.com/form');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent('Walk-in form URL must be a HubSpot form URL');
	});

	it('blocks save and shows an error for a non-HTTPS walk-in URL', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await pickRequiredStart(user);
		await user.type(
			screen.getByLabelText('Walk-in form URL (HubSpot)'),
			'http://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890',
		);
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent('Walk-in form URL must use HTTPS');
	});

	it('prefills walk-in URL in edit mode and clears with null on save', async () => {
		const walkInUrl = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{ ...baseEvent, walkInFormUrl: walkInUrl }}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);
		const user = userEvent.setup();

		expect(screen.getByLabelText('Walk-in form URL (HubSpot)')).toHaveValue(walkInUrl);
		await user.clear(screen.getByLabelText('Walk-in form URL (HubSpot)'));
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ walkInFormUrl: null }));
	});

	it('blocks create save when start is missing', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Event name/), 'Keynote');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent('Start date is required');
	});
});
