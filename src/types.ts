export type EmsRole = 'viewer' | 'operator' | 'communications' | 'admin';

export interface Session {
	token: string;
	email: string;
	role: EmsRole | string;
	expiresAt: string;
}
