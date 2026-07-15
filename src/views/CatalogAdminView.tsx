import { Navigate } from 'react-router-dom';

/**
 * Retired Catalog admin surface (T079 / FE-REDESIGN-022).
 * Create/edit/archive lives on Programs & Events (`#/events`).
 */
export function CatalogAdminView() {
	return <Navigate to="/events" replace />;
}
