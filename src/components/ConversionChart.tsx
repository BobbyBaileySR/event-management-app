import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type { AnalyticsConversion } from '../types';
import { getBrandColor } from '../utils/branding';
import styles from './ConversionChart.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ConversionChartProps {
	conversion: AnalyticsConversion;
}

/** Registration funnel doughnut — Chart.js self-hosted in the Vite bundle (no CDN). */
export function ConversionChart({ conversion }: ConversionChartProps) {
	return (
		<div className={`chart-wrap ${styles.wrap}`}>
			<Doughnut
				data={{
					labels: ['Checked In', 'Registered (Not Arrived)', 'Cancelled'],
					datasets: [
						{
							data: [conversion.checkedIn, conversion.registered, conversion.cancelled],
							backgroundColor: [
								getBrandColor('--color-cobalt'),
								getBrandColor('--color-orange'),
								getBrandColor('--color-black'),
							],
							borderWidth: 0,
						},
					],
				}}
				options={{
					cutout: '70%',
					plugins: { legend: { position: 'bottom' } },
				}}
			/>
		</div>
	);
}
