import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegistrationHistoryPanel } from './RegistrationHistoryPanel';
import type { RegistrationAnswerHistoryEntry } from '../types';

const entries: RegistrationAnswerHistoryEntry[] = [
	{
		answers: { 'What would you like to discuss?': 'Renewal timeline' },
		source: 'registration',
		observedAt: '2026-08-01T10:00:00.000Z',
		slot: 1,
	},
	{
		answers: { 'What would you like to discuss?': 'Contract renewal', 'Guest names': ['Alex', 'Sam'] },
		source: 'amendment',
		observedAt: '2026-08-05T14:00:00.000Z',
		slot: 1,
	},
];

describe('RegistrationHistoryPanel', () => {
	it('renders every history entry with its submission time and answers', () => {
		render(<RegistrationHistoryPanel entries={entries} headingId="reg-history" />);

		expect(screen.getByRole('heading', { name: 'Registration history' })).toBeInTheDocument();
		expect(screen.getByText('Renewal timeline')).toBeInTheDocument();
		expect(screen.getByText('Contract renewal')).toBeInTheDocument();
		expect(screen.getByText('Alex, Sam')).toBeInTheDocument();
		expect(screen.getAllByText('What would you like to discuss?')).toHaveLength(2);
		expect(screen.getByText('Guest names')).toBeInTheDocument();
	});

	it('shows a clear empty state when no history is recorded', () => {
		render(<RegistrationHistoryPanel entries={[]} headingId="reg-history" />);

		expect(screen.getByText('No registration answers recorded yet.')).toBeInTheDocument();
	});

	it('renders a hostile answer string as literal text, never as markup or an executing script', () => {
		const hostileEntries: RegistrationAnswerHistoryEntry[] = [
			{
				answers: {
					'Script injection': '<script>alert(1)</script>',
					'Image injection': '<img src=x onerror=alert(1)>',
				},
				source: 'registration',
				observedAt: '2026-08-01T10:00:00.000Z',
				slot: 1,
			},
		];

		render(<RegistrationHistoryPanel entries={hostileEntries} headingId="reg-history" />);

		expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
		expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(document.querySelector('script')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
	});

	it('truncates a pathologically long answer for display rather than blowing out the layout', () => {
		const longAnswer = 'x'.repeat(600);
		const longEntries: RegistrationAnswerHistoryEntry[] = [
			{
				answers: { 'Anything else?': longAnswer },
				source: 'registration',
				observedAt: '2026-08-01T10:00:00.000Z',
				slot: 1,
			},
		];

		render(<RegistrationHistoryPanel entries={longEntries} headingId="reg-history" />);

		const rendered = screen.getByText(/^x+…$/);
		expect(rendered.textContent?.length).toBeLessThan(longAnswer.length);
	});
});
