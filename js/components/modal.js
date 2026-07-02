import { el } from '../utils/dom.js';

/**
 * @param {{ title: string; message: string; confirmLabel?: string; cancelLabel?: string }} options
 * @returns {Promise<boolean>}
 */
export function confirmModal(options) {
    return new Promise((resolve) => {
        const overlay = el('div', { className: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' });
        const modal = el('div', { className: 'modal' }, [
            el('h3', { text: options.title }),
            el('p', { text: options.message }),
            el('div', { className: 'modal__actions' }, [
                el('button', {
                    className: 'btn btn-outline',
                    type: 'button',
                    text: options.cancelLabel ?? 'Cancel',
                    onclick: () => {
                        overlay.remove();
                        resolve(false);
                    },
                }),
                el('button', {
                    className: 'btn btn-primary',
                    type: 'button',
                    text: options.confirmLabel ?? 'Confirm',
                    onclick: () => {
                        overlay.remove();
                        resolve(true);
                    },
                }),
            ]),
        ]);

        overlay.appendChild(modal);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });

        document.body.appendChild(overlay);
        modal.querySelector('.btn-primary')?.focus();
    });
}
