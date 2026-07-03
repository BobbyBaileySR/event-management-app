import { CONFIG } from '../config';
import styles from './PocBanner.module.css';

/** Shows which mock modes are active. Renders nothing once fully live. */
export function PocBanner() {
	const modes: string[] = [];
	if (CONFIG.USE_MOCK_AUTH) {
		modes.push('mock auth');
	}
	if (CONFIG.USE_MOCK_API) {
		modes.push('sample data');
	}
	if (modes.length === 0) {
		return null;
	}

	return (
		<div className={styles.banner}>
			EMS PoC — <strong>{modes.join(', ')}</strong>. Fully populated demo; HubSpot sync connects in Phase 2+.
		</div>
	);
}
