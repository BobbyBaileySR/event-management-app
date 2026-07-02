import { fetchAnalytics, fetchAuditLog, fetchCampaignMetrics, fetchEvent } from '../services/dataService.js';
import { el, clearElement, formatDateTime } from '../utils/dom.js';
import { getBrandColor } from '../utils/branding.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/** @type {import('chart.js').Chart | null} */
let chartInstance = null;

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountAnalyticsView(container, options) {
    root = container;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-analytics', 'Select an event from All Events to view analytics.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading analytics…' }));
    loadAnalytics(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadAnalytics(container, eventId) {
    try {
        const [{ event }, { conversion }, { metrics }, { entries }] = await Promise.all([
            fetchEvent(eventId),
            fetchAnalytics(eventId),
            fetchCampaignMetrics(eventId),
            fetchAuditLog(eventId),
        ]);

        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-analytics', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }

        renderAnalytics(container, event, conversion, metrics, entries);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load analytics' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ name: string }} event
 * @param {{ checkedIn: number; registered: number; cancelled: number }} conversion
 * @param {{ sent: number; opened: number; clicked: number; bounced: number }} metrics
 * @param {Array<{ templateName: string; recipientCount: number; timestamp: string; outcome: string; actorEmail: string }>} auditEntries
 */
function renderAnalytics(container, event, conversion, metrics, auditEntries) {
    const total = conversion.checkedIn + conversion.registered + conversion.cancelled;
    const openRate = metrics.sent > 0 ? Math.round((metrics.opened / metrics.sent) * 100) : 0;
    const clickRate = metrics.sent > 0 ? Math.round((metrics.clicked / metrics.sent) * 100) : 0;
    const bounceRate = metrics.sent > 0 ? Math.round((metrics.bounced / metrics.sent) * 100) : 0;

    const auditList = el('ul', { className: 'audit-list' });
    if (auditEntries.length === 0) {
        auditList.appendChild(el('li', { text: 'No sends recorded for this event yet.' }));
    } else {
        auditEntries.forEach((entry) => {
            auditList.appendChild(
                el('li', {}, [
                    el('strong', { text: `${entry.templateName} — ${entry.recipientCount} recipients` }),
                    el('div', {
                        className: 'audit-list__meta',
                        text: `${entry.outcome} by ${entry.actorEmail} · ${formatDateTime(entry.timestamp)}`,
                    }),
                ]),
            );
        });
    }

    container.replaceChildren(
        el('section', { id: 'view-analytics' }, [
            buildTopBar(`${event.name} — Analytics`, 'Registration funnel and email performance (sample metrics)'),
            el('div', { className: 'hub-stats grid-3' }, [
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Registrations' }),
                    el('p', { className: 'hub-stat__value', text: String(total) }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Check-in rate' }),
                    el('p', {
                        className: 'hub-stat__value',
                        text: total > 0 ? `${Math.round((conversion.checkedIn / total) * 100)}%` : '0%',
                    }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Emails sent' }),
                    el('p', { className: 'hub-stat__value', text: String(metrics.sent) }),
                ]),
            ]),
            el('div', { className: 'grid-2' }, [
                el('div', { className: 'card' }, [
                    el('h3', { className: 'card__header', text: 'Registration funnel' }),
                    total > 0
                        ? el('div', { className: 'chart-wrap' }, [el('canvas', { id: 'conversionChart' })])
                        : el('p', { className: 'empty-state__hint', text: 'No registration data for this event.' }),
                ]),
                el('div', { className: 'card' }, [
                    el('h3', { className: 'card__header', text: 'Campaign metrics' }),
                    el('ul', { className: 'stats-list' }, [
                        el('li', {}, [el('strong', { text: 'Sent' }), el('span', { text: String(metrics.sent) })]),
                        el('li', {}, [el('strong', { text: 'Opened' }), el('span', { text: `${metrics.opened} (${openRate}%)` })]),
                        el('li', {}, [el('strong', { text: 'Clicked' }), el('span', { text: `${metrics.clicked} (${clickRate}%)` })]),
                        el('li', {}, [el('strong', { text: 'Bounced' }), el('span', { text: `${metrics.bounced} (${bounceRate}%)` })]),
                    ]),
                ]),
            ]),
            el('div', { className: 'card' }, [
                el('h3', { className: 'card__header', text: 'Recent sends' }),
                auditList,
            ]),
        ]),
    );

    if (total > 0) {
        renderChart(conversion);
    }
}

/**
 * @param {{ checkedIn: number; registered: number; cancelled: number }} conversion
 */
function renderChart(conversion) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const canvas = document.getElementById('conversionChart');
    if (!canvas || typeof Chart === 'undefined') {
        return;
    }

    chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
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
        },
        options: {
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } },
        },
    });
}

export function unmountAnalyticsView() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    root = null;
}
