import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/tokens.css';
import '../css/theme-celebration.css';
import '../css/base.css';
import '../css/layout.css';
import '../css/components.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
	throw new Error('Root container #root not found');
}

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
