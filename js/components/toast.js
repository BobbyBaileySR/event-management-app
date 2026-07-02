/** @type {ReturnType<typeof setTimeout> | null} */
let hideTimer = null;

/**
 * @param {string} message
 * @param {'success' | 'error'} [type]
 * @param {number} [durationMs]
 */
export function showToast(message, type = 'success', durationMs = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.className = type === 'error' ? 'toast--error show' : 'toast--success show';

    if (hideTimer) {
        clearTimeout(hideTimer);
    }

    hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, durationMs);
}
