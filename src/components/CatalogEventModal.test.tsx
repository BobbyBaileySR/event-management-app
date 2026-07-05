import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogEventModal } from './CatalogEventModal';

const programs = [
	{
		id: 'prog-1',
		name: 'Atlassian Event 2026',
		hubspotFormIds: ['form-1'],
		archived: false,
		events: [],
	},
	{
		id: 'prog-2',
		name: 'QA Program 2026',
		hubspotFormIds: ['form-2'],
		archived: false,
		events: [],
	},
];

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
		expect(screen.getByLabelText('Program')).toBeInTheDocument();
		expect(screen.getByLabelText('Program')).toHaveFocus();
	});

	it('submits create payload with optional metadata', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText('Event name'), 'Keynote');
		await user.type(screen.getByLabelText('Parts Attended option'), 'Keynote');
		await user.type(screen.getByLabelText('Owner'), 'Jane Doe');
		await user.type(screen.getByLabelText('Capacity'), '500');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith({
			programId: 'prog-1',
			name: 'Keynote',
			partsAttendedOption: 'Keynote',
			attendanceProperty: 'atlassian_event__customer_event_attendance',
			owner: 'Jane Doe',
			capacity: 500,
		});
	});

	it('shows read-only Program in edit mode and clears capacity with null', async () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{
					id: 'ev-1',
					name: 'Keynote',
					partsAttendedOption: 'Keynote',
					attendanceProperty: 'atlassian_event__customer_event_attendance',
					archived: false,
					capacity: 100,
				}}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);
		const user = userEvent.setup();

		expect(screen.getByText('Program:')).toBeInTheDocument();
		expect(screen.queryByLabelText('Program')).toBeNull();
		await user.clear(screen.getByLabelText('Capacity'));
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ capacity: null }));
	});

	it('renders hostile owner text safely in the input value', () => {
		render(
			<CatalogEventModal
				mode="edit"
				open
				programs={programs}
				parentProgram={programs[0]}
				event={{
					id: 'ev-xss',
					name: 'VIP',
					partsAttendedOption: 'VIP',
					attendanceProperty: 'atlassian_event__vip_event_attendance',
					archived: false,
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
		await user.click(screen.getByRole('button', { name: 'Program' }));

		const listbox = screen.getByRole('listbox');
		expect(listbox).toBeInTheDocument();
		expect(document.querySelector('select')).toBeNull();
	});

	it('opens the Program menu in place and updates the selection on choose', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: 'Program' }));
		await user.click(screen.getByRole('option', { name: 'QA Program 2026' }));

		expect(screen.getByRole('button', { name: 'Program' })).toHaveTextContent('QA Program 2026');
		expect(screen.queryByRole('listbox')).toBeNull();

		await user.type(screen.getByLabelText('Event name'), 'Keynote');
		await user.type(screen.getByLabelText('Parts Attended option'), 'Keynote');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ programId: 'prog-2' }));
	});

	it('closes the Program menu on Escape and on outside click', async () => {
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: 'Program' }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('listbox')).toBeNull();

		await user.click(screen.getByRole('button', { name: 'Program' }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.click(document.body);
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('does not overflow body horizontally at 375px viewport', () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';
		render(<CatalogEventModal mode="create" open programs={programs} onCancel={onCancel} onSave={onSave} />);
		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});
});
