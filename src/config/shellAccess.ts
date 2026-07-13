import type { EmsRole } from '../types';

/**
 * FR-013: the redesigned shell is admin-only for now, but role-aware by design — a future
 * `check-in operator` role is added here (and to specific `EventModule.minRoles` entries),
 * not by restructuring AppLayout/Sidebar.
 */
export const SHELL_ALLOWED_ROLES: EmsRole[] = ['admin'];

export function hasRequiredRole(role: string | undefined | null, minRoles: EmsRole[]): boolean {
	return !!role && (minRoles as string[]).includes(role);
}

export function canAccessShell(role: string | undefined | null): boolean {
	return hasRequiredRole(role, SHELL_ALLOWED_ROLES);
}
