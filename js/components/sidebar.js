import { CONFIG } from '../config.js';
import { getState } from '../state/appState.js';
import { isEventScopedRoute } from '../router.js';
import { SIDEBAR_EVENT_MODULES } from '../config/eventModules.js';
import { el } from '../utils/dom.js';

/**
 * @param {HTMLElement} container
 * @param {{ onNavigate: (route: string) => void; onLogout: () => void; activeRoute: string; userEmail?: string; eventId?: string | null; eventName?: string | null }} options
 */
export function renderSidebar(container, options) {
    container.replaceChildren();

    const header = el('div', { className: 'sidebar-header' }, [
        el('h2', { text: CONFIG.APP_SHORT_NAME }),
    ]);

    if (options.userEmail) {
        header.appendChild(el('p', { className: 'sidebar-header__user', text: options.userEmail }));
    }

    const nav = el('nav', { className: 'nav-items', 'aria-label': 'Main navigation' });

    nav.appendChild(
        buildNavButton(
            { id: 'events', label: 'All Events', icon: '🏢' },
            options.activeRoute === 'events',
            () => options.onNavigate('events'),
        ),
    );

    const eventId = options.eventId ?? getState().selectedEventId;
    if (eventId && isEventScopedRoute(options.activeRoute)) {
        const eventSection = el('div', { className: 'nav-section' }, [
            el('p', {
                className: 'nav-section__label',
                text: options.eventName ?? 'Selected event',
            }),
        ]);

        SIDEBAR_EVENT_MODULES.forEach((item) => {
            eventSection.appendChild(
                buildNavButton(item, options.activeRoute === item.id, () => options.onNavigate(item.id)),
            );
        });

        nav.appendChild(eventSection);
    }

    const footer = el('div', { className: 'sidebar-footer' }, [
        el('p', { text: 'Adaptavist staff only · verified session' }),
        el('button', {
            className: 'btn btn-outline btn-sm',
            type: 'button',
            text: 'Sign out',
            onclick: options.onLogout,
        }),
    ]);

    container.appendChild(header);
    container.appendChild(nav);
    container.appendChild(footer);
}

/**
 * @param {{ id: string; label: string; icon: string }} item
 * @param {boolean} isActive
 * @param {() => void} onClick
 */
function buildNavButton(item, isActive, onClick) {
    return el('button', {
        className: `nav-item${isActive ? ' active' : ''}`,
        type: 'button',
        text: `${item.icon} ${item.label}`,
        onclick: onClick,
    });
}
