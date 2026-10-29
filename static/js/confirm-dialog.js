/**
 * Shared accessible confirm dialog — a drop-in replacement for native confirm() on
 * destructive actions (remove teammate, delete group, revoke invite, etc). Native confirm()
 * can't be styled, freezes the whole page/tab, and gives assistive tech no relation between
 * the dialog and the button that triggered it; this renders a real dialog, traps focus while
 * open (via focus-trap.js, which must be loaded alongside this file), and restores focus to
 * the trigger on close.
 *
 * Usage (replaces `if (!confirm('...')) return;`):
 *   IntQuesConfirm.show({
 *       title: 'Remove teammate?',
 *       body: 'They will lose access immediately. This cannot be undone.',
 *       confirmText: 'Remove',
 *       danger: true
 *   }).then(function (confirmed) {
 *       if (!confirmed) return;
 *       // proceed with the destructive action
 *   });
 */
(function (global) {
    'use strict';
    // Also loaded site-wide: a second copy would register the data-confirm submit handler twice.
    if (global.IntQuesConfirm) return;

    var overlay, modal, titleEl, bodyEl, confirmBtn, cancelBtn, releaseTrap, resolveFn;

    function ensureDom() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'iq-confirm-overlay';
        overlay.innerHTML =
            '<div class="iq-confirm-modal" role="alertdialog" aria-modal="true" ' +
                 'aria-labelledby="iqConfirmTitle" aria-describedby="iqConfirmBody">' +
                '<h3 class="iq-confirm-title" id="iqConfirmTitle"></h3>' +
                '<p class="iq-confirm-body" id="iqConfirmBody"></p>' +
                '<div class="iq-confirm-actions">' +
                    '<button type="button" class="iq-confirm-cancel"></button>' +
                    '<button type="button" class="iq-confirm-confirm"></button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        modal      = overlay.querySelector('.iq-confirm-modal');
        titleEl    = overlay.querySelector('.iq-confirm-title');
        bodyEl     = overlay.querySelector('.iq-confirm-body');
        cancelBtn  = overlay.querySelector('.iq-confirm-cancel');
        confirmBtn = overlay.querySelector('.iq-confirm-confirm');

        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
        cancelBtn.addEventListener('click', function () { close(false); });
        confirmBtn.addEventListener('click', function () { close(true); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('open')) close(false);
        });
    }

    function close(result) {
        overlay.classList.remove('open');
        if (releaseTrap) { releaseTrap(); releaseTrap = null; }
        if (resolveFn) { var resolve = resolveFn; resolveFn = null; resolve(result); }
    }

    function show(opts) {
        opts = opts || {};
        ensureDom();
        titleEl.textContent    = opts.title       || 'Are you sure?';
        bodyEl.textContent     = opts.body         || 'This action cannot be undone.';
        cancelBtn.textContent  = opts.cancelText   || 'Cancel';
        confirmBtn.textContent = opts.confirmText  || 'Confirm';
        confirmBtn.className   = 'iq-confirm-confirm' + (opts.danger ? ' iq-confirm-confirm--danger' : '');

        overlay.classList.add('open');
        confirmBtn.focus();
        if (global.IntQuesFocusTrap) releaseTrap = global.IntQuesFocusTrap.activate(modal);

        return new Promise(function (resolve) { resolveFn = resolve; });
    }

    global.IntQuesConfirm = { show: show };

    /**
     * Delegated replacement for `<form onsubmit="return confirm('...')">`. Put the message
     * on the form as `data-confirm="..."` (optionally `data-confirm-title`, `data-confirm-text`,
     * `data-confirm-danger`) instead, and this intercepts the submit, shows the dialog, and
     * — only on confirmation — calls form.submit(), which (unlike a real user submit) does not
     * re-fire the 'submit' event, so there's no risk of a loop.
     */
    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-confirm')) return;
        e.preventDefault();
        show({
            title:       form.getAttribute('data-confirm-title') || 'Are you sure?',
            body:        form.getAttribute('data-confirm'),
            confirmText: form.getAttribute('data-confirm-text') || 'Confirm',
            danger:      form.hasAttribute('data-confirm-danger')
        }).then(function (ok) { if (ok) form.submit(); });
    }, true);
})(window);
