import { CONFIG } from '../config';
import styles from './PocBanner.module.css';

/** Shows UAT label and/or active mock modes. Renders nothing on fully live production builds. */
export function PocBanner() {
	const modes: string[] = [];
	if (CONFIG.EMS_ENV === 'uat') {
		modes.push('UAT — HubSpot Staging');
	}
	if (CONFIG.USE_MOCK_AUTH) {
		modes.push('mock auth');
	}
	if (CONFIG.USE_MOCK_API) {
		modes.push('sample data');
	}
	if (modes.length === 0) {
		return null;
	}

	const bannerClass = CONFIG.EMS_ENV === 'uat' ? `${styles.banner} ${styles.bannerUat}` : styles.banner;

	return (
		<div className={bannerClass}>
			{CONFIG.EMS_ENV === 'uat' ? (
				<>
					<strong>{modes[0]}</strong>
					{modes.length > 1 ? ` — ${modes.slice(1).join(', ')}` : ''}
					{CONFIG.USE_MOCK_AUTH || CONFIG.USE_MOCK_API ? '' : '. UI preview on github.io — use local dev for staging API.'}
				</>
			) : (
				<>
					EMS PoC — <strong>{modes.join(', ')}</strong>. Fully populated demo; HubSpot sync connects in Phase 2+.
				</>
			)}
		</div>
	);
}
