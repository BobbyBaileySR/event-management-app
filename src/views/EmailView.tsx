import { Navigate } from 'react-router-dom';
import { sliceModulePath } from '../router/navigation';

/** Legacy `#/events/:eventId/email` — redirect to catalog-scoped Slice 2 route. */
export function EmailView() {
	return <Navigate to={sliceModulePath('email')} replace />;
}
