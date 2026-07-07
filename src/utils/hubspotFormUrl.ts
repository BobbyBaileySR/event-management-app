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
