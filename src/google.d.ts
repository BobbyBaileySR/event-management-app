/**
 * Minimal Google Identity Services typings for the fields we use.
 * Full library: https://developers.google.com/identity/gsi/web/reference/js-reference
 */
interface GoogleCredentialResponse {
	credential: string;
}

interface GoogleIdConfiguration {
	client_id: string;
	callback: (response: GoogleCredentialResponse) => void;
	context?: string;
	ux_mode?: 'popup' | 'redirect';
	auto_select?: boolean;
	use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonOptions {
	type?: 'standard' | 'icon';
	size?: 'small' | 'medium' | 'large';
	theme?: 'outline' | 'filled_blue' | 'filled_black';
	text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
	width?: number;
}

interface GoogleAccountsId {
	initialize: (config: GoogleIdConfiguration) => void;
	renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
}

interface Window {
	google?: {
		accounts?: {
			id?: GoogleAccountsId;
		};
	};
}
