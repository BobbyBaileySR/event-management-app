import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = vi.hoisted(() => ({
	EMS_ENV: 'live' as 'uat' | 'live',
	USE_MOCK_AUTH: false,
	USE_MOCK_API: false,
}));

vi.mock('../config', () => ({
	CONFIG: mockConfig,
}));

import { PocBanner } from './PocBanner';

describe('PocBanner', () => {
	beforeEach(() => {
		mockConfig.EMS_ENV = 'live';
		mockConfig.USE_MOCK_AUTH = false;
		mockConfig.USE_MOCK_API = false;
	});

	it('renders nothing when fully live with no mock modes', () => {
		const { container } = render(<PocBanner />);
		expect(container).toBeEmptyDOMElement();
	});

	it('shows UAT staging label when EMS_ENV is uat', () => {
		mockConfig.EMS_ENV = 'uat';
		render(<PocBanner />);
		expect(screen.getByText(/UAT — HubSpot Staging/i)).toBeInTheDocument();
	});

	it('lists mock auth and sample data when enabled', () => {
		mockConfig.USE_MOCK_AUTH = true;
		mockConfig.USE_MOCK_API = true;
		render(<PocBanner />);
		expect(screen.getByText(/mock auth/i)).toBeInTheDocument();
		expect(screen.getByText(/sample data/i)).toBeInTheDocument();
	});
});
