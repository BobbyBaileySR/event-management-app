const HUBSPOT_HOST_SUFFIXES = ['.hubspot.com', '.hsforms.com'] as const;
const EXACT_HUBSPOT_HOSTS = ['share.hsforms.com'] as const;

function isAllowedHubSpotFormHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (EXACT_HUBSPOT_HOSTS.includes(host as (typeof EXACT_HUBSPOT_HOSTS)[number])) {
		return true;
	}
	return HUBSPOT_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Returns true when `url` is an HTTPS HubSpot form embed/share URL safe for iframe src.
 */
export function isAllowedHubSpotFormUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) {
		return false;
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return false;
	}

	if (parsed.protocol !== 'https:') {
		return false;
	}
	if (parsed.username || parsed.password) {
		return false;
	}
	if (parsed.port && parsed.port !== '443') {
		return false;
	}
	if (!parsed.hostname) {
		return false;
	}

	return isAllowedHubSpotFormHost(parsed.hostname);
}

/**
 * Field/render validation message for a walk-in form URL, or null when the URL is empty
 * (optional field) or a valid HubSpot form URL. Shared by the Catalog Event modal (which
 * edits the URL) and the Check-in view (which renders it), so the message never drifts.
 */
export function walkInFormUrlError(url: string): string | null {
	const trimmed = url.trim();
	if (!trimmed) {
		return null;
	}
	if (isAllowedHubSpotFormUrl(trimmed)) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'https:') {
			return 'Walk-in form URL must use HTTPS';
		}
	} catch {
		return 'Walk-in form URL must use HTTPS';
	}

	return 'Walk-in form URL must be a HubSpot form URL';
}
