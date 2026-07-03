import { capitalizeStatus, statusBadgeClass } from '../utils/format';

interface StatusBadgeProps {
	status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
	return <span className={`badge ${statusBadgeClass(status)}`}>{capitalizeStatus(status)}</span>;
}
