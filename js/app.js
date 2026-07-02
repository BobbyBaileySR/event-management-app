import { CONFIG } from '../config.js';
import { renderSidebar } from './components/sidebar.js';
import { logout, isAuthenticated, registerGoogleCallback } from './services/authService.js';
import { fetchEvent } from './services/dataService.js';
import { getState, subscribe } from './state/appState.js';
import { getCurrentRoute, navigate, onRouteChange } from './router.js';
import { showLoginView } from './views/loginView.js';
import { mountEventsView, unmountEventsView } from './views/eventsView.js';
import { mountEventHubView, unmountEventHubView } from './views/eventHubView.js';
import { mountAttendeesView, unmountAttendeesView } from './views/attendeesView.js';
import { mountCheckInView, unmountCheckInView } from './views/checkInView.js';
import { mountEmailView, unmountEmailView } from './views/emailView.js';
import { mountAnalyticsView, unmountAnalyticsView } from './views/analyticsView.js';
import { mountAgendaView, unmountAgendaView } from './views/agendaView.js';
import { mountSettingsView, unmountSettingsView } from './views/settingsView.js';
import { el } from './utils/dom.js';
import { APP_DOCUMENT_TITLE } from './utils/branding.js';

/** @type {(() => void) | null} */
let routeUnsubscribe = null;

/** @type {(() => void) | null} */
let stateUnsubscribe = null;

function renderPocBanner() {
    const modes = [];
    if (CONFIG.USE_MOCK_AUTH) {
        modes.push('mock auth');
    }
    if (CONFIG.USE_MOCK_API) {
        modes.push('sample data');
    }
    if (modes.length === 0) {
        return null;
    }
    return el('div', { className: 'poc-banner' }, [
        document.createTextNode('EMS PoC — '),
        el('strong', { text: modes.join(', ') }),
        document.createTextNode('. Fully populated demo; HubSpot sync connects in Phase 2+.'),
    ]);
}

function teardownViews() {
    unmountEventsView();
    unmountEventHubView();
    unmountAttendeesView();
    unmountCheckInView();
    unmountEmailView();
    unmountAnalyticsView();
    unmountAgendaView();
    unmountSettingsView();
}

/**
 * @param {HTMLElement} mainContent
 * @param {{ name: string; eventId: string | null }} route
 */
function renderActiveView(mainContent, route) {
    teardownViews();
    mainContent.replaceChildren();

    switch (route.name) {
        case 'event-hub':
            mountEventHubView(mainContent, { eventId: route.eventId });
            break;
        case 'attendees':
            mountAttendeesView(mainContent, { eventId: route.eventId });
            break;
        case 'check-in':
            mountCheckInView(mainContent, { eventId: route.eventId });
            break;
        case 'email':
            mountEmailView(mainContent, { eventId: route.eventId });
            break;
        case 'analytics':
            mountAnalyticsView(mainContent, { eventId: route.eventId });
            break;
        case 'agenda':
            mountAgendaView(mainContent, { eventId: route.eventId });
            break;
        case 'settings':
            mountSettingsView(mainContent, { eventId: route.eventId });
            break;
        case 'events':
        default:
            mountEventsView(mainContent, {
                onOpenEvent: (eventId) => navigate('event-hub', eventId),
            });
            break;
    }
}

/**
 * @param {string | null} eventId
 */
async function resolveEventName(eventId) {
    if (!eventId) {
        return null;
    }

    try {
        const { event } = await fetchEvent(eventId);
        return event?.name ?? null;
    } catch {
        return null;
    }
}

/**
 * @param {HTMLElement} sidebarEl
 * @param {{ name: string; eventId: string | null }} route
 */
async function renderSidebarForRoute(sidebarEl, route) {
    const session = getState().session;
    const eventName = route.eventId ? await resolveEventName(route.eventId) : null;

    renderSidebar(sidebarEl, {
        activeRoute: route.name,
        userEmail: session?.email,
        eventId: route.eventId,
        eventName,
        onNavigate: (routeName) => navigate(routeName, route.eventId),
        onLogout: async () => {
            await logout();
        },
    });
}

function renderAppShell() {
    const loginView = document.getElementById('login-view');
    const appLayout = document.getElementById('app-layout');
    const sidebarEl = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const bannerHost = document.getElementById('banner-host');

    if (!loginView || !appLayout || !sidebarEl || !mainContent || !bannerHost) {
        return;
    }

    loginView.classList.add('hidden');
    appLayout.classList.remove('hidden');

    bannerHost.replaceChildren();
    const banner = renderPocBanner();
    if (banner) {
        bannerHost.appendChild(banner);
    }

    const route = getCurrentRoute();

    void renderSidebarForRoute(sidebarEl, route);
    renderActiveView(mainContent, route);

    if (routeUnsubscribe) {
        routeUnsubscribe();
    }
    routeUnsubscribe = onRouteChange((nextRoute) => {
        void renderSidebarForRoute(sidebarEl, nextRoute);
        renderActiveView(mainContent, nextRoute);
    });
}

function renderLoginShell() {
    const loginView = document.getElementById('login-view');
    const appLayout = document.getElementById('app-layout');
    const bannerHost = document.getElementById('banner-host');

    if (!loginView || !appLayout || !bannerHost) {
        return;
    }

    if (routeUnsubscribe) {
        routeUnsubscribe();
        routeUnsubscribe = null;
    }

    teardownViews();
    appLayout.classList.add('hidden');
    loginView.classList.remove('hidden');
    bannerHost.replaceChildren();

    showLoginView(loginView);
}

function bootstrap() {
    if (isAuthenticated()) {
        if (!window.location.hash) {
            navigate('events');
        }
        renderAppShell();
        return;
    }

    renderLoginShell();
}

function init() {
    document.title = APP_DOCUMENT_TITLE;
    registerGoogleCallback();

    if (stateUnsubscribe) {
        stateUnsubscribe();
    }

    stateUnsubscribe = subscribe(() => {
        if (isAuthenticated()) {
            if (!window.location.hash) {
                navigate('events');
            }
            renderAppShell();
        } else {
            renderLoginShell();
        }
    });

    bootstrap();
}

init();
