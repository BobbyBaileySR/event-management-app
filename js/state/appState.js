/**
 * In-memory application state. No global window pollution.
 */

/** @typedef {{ token: string; email: string; role: string; expiresAt: string }} Session */

/** @type {{ session: Session | null; selectedEventId: string | null; listeners: Set<(state: AppStateSnapshot) => void> }} */
const state = {
    session: null,
    selectedEventId: null,
    listeners: new Set(),
};

/** @typedef {{ session: Session | null; selectedEventId: string | null }} AppStateSnapshot */

/**
 * @returns {AppStateSnapshot}
 */
export function getState() {
    return {
        session: state.session,
        selectedEventId: state.selectedEventId,
    };
}

/**
 * @param {(snapshot: AppStateSnapshot) => void} listener
 * @returns {() => void}
 */
export function subscribe(listener) {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
}

function notify() {
    const snapshot = getState();
    state.listeners.forEach((listener) => listener(snapshot));
}

/**
 * @param {Session | null} session
 */
export function setSession(session) {
    state.session = session;
    notify();
}

/**
 * @param {string | null} eventId
 */
export function setSelectedEventId(eventId) {
    if (state.selectedEventId === eventId) {
        return;
    }
    state.selectedEventId = eventId;
    // Hash routing drives view updates — do not notify listeners (avoids double render with hashchange).
}

export function clearSession() {
    state.session = null;
    notify();
}

/**
 * @returns {boolean}
 */
export function isAuthenticated() {
    if (!state.session) {
        return false;
    }
    return new Date(state.session.expiresAt) > new Date();
}
