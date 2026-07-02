/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(Node | string)[]} [children]
 */
export function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'text') {
            element.textContent = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    children.forEach((child) => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child) {
            element.appendChild(child);
        }
    });
    return element;
}

/**
 * Parse TRUSTED static markup into an element.
 *
 * SECURITY: never pass user input, HubSpot data, API responses, or any remote/dynamic
 * string here — this uses innerHTML and will execute injected markup (XSS). For dynamic
 * content use `el({ text })` or `textContent`. See `.cursor/rules/frontend-security.mdc`.
 *
 * @param {string} html Trusted, developer-authored static markup only
 */
export function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

/**
 * @param {HTMLElement} container
 */
export function clearElement(container) {
    container.replaceChildren();
}

/**
 * @param {string} status
 */
export function statusBadgeClass(status) {
    const map = {
        active: 'badge--active',
        draft: 'badge--draft',
        cancelled: 'badge--cancelled',
        completed: 'badge--draft',
        Registered: 'badge--registered',
        'Checked In': 'badge--checked-in',
        Cancelled: 'badge--cancelled',
    };
    return map[status] ?? 'badge--draft';
}

/**
 * @param {string} iso
 */
export function formatDateTime(iso) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(iso));
}
