import { navigate } from '../router.js';
import { el } from './dom.js';

/**
 * @param {string} viewId
 * @param {string} message
 * @param {{ label: string; route: string; eventId?: string | null }} [action]
 */
export function buildEventEmptyState(viewId, message, action) {
    const children = [el('p', { text: message })];
    if (action) {
        children.push(
            el('button', {
                className: 'btn btn-outline',
                type: 'button',
                text: action.label,
                onclick: () => navigate(action.route, action.eventId ?? null),
            }),
        );
    }
    return el('section', { id: viewId }, [el('div', { className: 'card empty-state' }, children)]);
}

/**
 * @param {string} title
 * @param {string} [meta]
 * @param {HTMLElement | DocumentFragment} [trailing]
 */
export function buildTopBar(title, meta, trailing) {
    const header = el('div', {}, [el('h1', { text: title })]);
    if (meta) {
        header.appendChild(el('p', { className: 'top-bar__meta', text: meta }));
    }
    const bar = el('div', { className: 'top-bar' }, [header]);
    if (trailing) {
        bar.appendChild(trailing);
    }
    return bar;
}

/**
 * @param {number} value
 * @param {number} capacity
 */
export function buildCapacityBar(value, capacity) {
    const pct = capacity > 0 ? Math.min(100, Math.round((value / capacity) * 100)) : 0;
    return el('div', { className: 'capacity-bar' }, [
        el('div', { className: 'capacity-bar__labels' }, [
            el('span', { text: `${value} / ${capacity} registered` }),
            el('span', { text: `${pct}%` }),
        ]),
        el('div', { className: 'capacity-bar__track' }, [
            el('div', { className: 'capacity-bar__fill', style: `width: ${pct}%` }),
        ]),
    ]);
}
