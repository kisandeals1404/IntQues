/* Shared floating toast notification. window.IqToast.show(message, type, opts)
 * opts.scrollTo: an element (or selector string) to scroll into view + briefly highlight when
 * the toast shows — for a custom validation error (e.g. "select at least one question") that
 * has no single native-invalid form field for form-validation.js's own scroll-to-field handling
 * to catch, so the toast alone left the user to hunt for what it was actually complaining about
 * on a long page. */
(function () {
    'use strict';

    var ICONS = {
        error: 'fa-solid fa-xmark',
        success: 'fa-solid fa-check',
        info: 'fa-solid fa-info',
        warning: 'fa-solid fa-exclamation'
    };

    function region() {
        var el = document.getElementById('iq-toast-region');
        if (!el) {
            el = document.createElement('div');
            el.id = 'iq-toast-region';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function show(message, type, opts) {
        type = type && ICONS[type] ? type : 'info';
        opts = opts || {};
        var duration = typeof opts.duration === 'number' ? opts.duration : 5000;

        var toast = document.createElement('div');
        toast.className = 'iq-toast iq-toast--' + type;
        toast.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');

        var icon = document.createElement('span');
        icon.className = 'iq-toast-icon';
        icon.innerHTML = '<i class="' + ICONS[type] + '" aria-hidden="true"></i>';

        var body = document.createElement('div');
        body.className = 'iq-toast-body';
        body.textContent = message;

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'iq-toast-close';
        close.setAttribute('aria-label', 'Dismiss notification');
        close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

        toast.appendChild(icon);
        toast.appendChild(body);
        toast.appendChild(close);
        var reg = region();
        // Repeated taps on a submit button with the same problem used to stack an identical toast
        // per tap (6+ deep on a phone, covering the whole form). Replace an identical one instead,
        // and keep at most 3 on screen.
        Array.prototype.slice.call(reg.children).forEach(function (t) {
            if (t.className === toast.className && t.querySelector('.iq-toast-body') &&
                t.querySelector('.iq-toast-body').textContent === message) { t.remove(); }
        });
        while (reg.children.length >= 3) { reg.removeChild(reg.firstChild); }
        reg.appendChild(toast);

        var dismissed = false;
        var timer = duration > 0 ? setTimeout(dismiss, duration) : null;

        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            if (timer) clearTimeout(timer);
            toast.classList.add('is-leaving');
            toast.addEventListener('animationend', function () { toast.remove(); }, { once: true });
            setTimeout(function () { toast.remove(); }, 300); // fallback if animation is skipped (reduced-motion)
        }

        close.addEventListener('click', dismiss);

        if (opts.scrollTo) {
            var target = typeof opts.scrollTo === 'string' ? document.querySelector(opts.scrollTo) : opts.scrollTo;
            if (target) {
                try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* noop */ }
                if (typeof target.focus === 'function') target.focus({ preventScroll: true });
                // Same brief pulse afcEditCard (admin-flashcards.ftl) already uses to draw the eye
                // to a panel that just scrolled into view — a plain scroll alone can still leave
                // the user unsure exactly which element on a busy page the toast was about.
                target.classList.add('iq-toast-target-pulse');
                setTimeout(function () { target.classList.remove('iq-toast-target-pulse'); }, 1600);
            }
        }

        return dismiss;
    }

    window.IqToast = { show: show };
})();
