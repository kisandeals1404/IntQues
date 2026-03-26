(function () {
    'use strict';

    var loaderEl = null;
    var stylesReady = false;

    function injectStyles() {
        if (stylesReady) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'page-navigation-loader-styles';
        style.textContent = [
            '.page-nav-loader{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(255,255,255,0.88);z-index:2500;pointer-events:none;}',
            '.page-nav-loader.is-visible{display:flex;}',
            '.page-nav-loader__content{display:flex;flex-direction:column;align-items:center;gap:10px;color:#111827;font:600 14px/1.3 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}',
            '.page-nav-loader__spinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(17,24,39,0.18);border-top-color:#ff6a00;animation:pageNavSpin .8s linear infinite;}',
            '@keyframes pageNavSpin{to{transform:rotate(360deg);}}',
            '@media (prefers-reduced-motion: reduce){.page-nav-loader__spinner{animation-duration:1.6s;}}'
        ].join('');
        document.head.appendChild(style);
        stylesReady = true;
    }

    function ensureLoader() {
        if (loaderEl) {
            return loaderEl;
        }

        injectStyles();

        loaderEl = document.createElement('div');
        loaderEl.className = 'page-nav-loader';
        loaderEl.setAttribute('aria-hidden', 'true');
        loaderEl.innerHTML = '<div class="page-nav-loader__content" role="status" aria-live="polite">' +
            '<span class="page-nav-loader__spinner" aria-hidden="true"></span>' +
            '<span>Opening page\u2026</span></div>';
        document.body.appendChild(loaderEl);
        return loaderEl;
    }

    function showLoader() {
        var el = ensureLoader();
        el.classList.add('is-visible');
        el.setAttribute('aria-hidden', 'false');
        document.body.setAttribute('aria-busy', 'true');
    }

    function hideLoader() {
        if (!loaderEl) {
            return;
        }
        loaderEl.classList.remove('is-visible');
        loaderEl.setAttribute('aria-hidden', 'true');
        document.body.removeAttribute('aria-busy');
    }

    function resolveSafeUrl(url) {
        try {
            var resolved = new URL(url, window.location.origin);
            if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
                return null;
            }
            return resolved;
        } catch (e) {
            return null;
        }
    }

    /**
     * Navigate to `url`, showing a full-page loader.
     *
     * Key iOS Chrome / WebKit requirements that drove this design:
     *  1. event.preventDefault() MUST be called first so the native anchor
     *     does not also try to navigate (double-navigation race).
     *  2. window.location.assign() MUST be called synchronously inside the
     *     same user-gesture stack frame — no setTimeout, no Promise.
     *     iOS WebKit blocks programmatic navigation that happens outside a
     *     user gesture, which is why the previous "return true / let browser
     *     handle it" approach silently failed (loader appeared, no navigation).
     */
    window.navigateToPage = function (url, event) {
        if (!url) {
            return true;
        }

        var resolvedUrl = resolveSafeUrl(url);
        if (!resolvedUrl) {
            return false;
        }

        // Step 1 – block native anchor so the browser doesn't race us.
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        // Step 2 – show loader (purely visual, pointer-events:none).
        showLoader();

        // Step 3 – navigate NOW, synchronously, while still inside the
        //           user-gesture call stack.  This is the only reliable path
        //           on iOS Chrome / Safari WebKit.
        window.location.assign(resolvedUrl.href);

        return false;
    };

    window.handlePageNavigationKey = function (event, url) {
        if (!event) {
            return false;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            return window.navigateToPage(url, event);
        }

        return true;
    };

    // Hide loader on back/forward cache restore and page transitions.
    window.addEventListener('pageshow', hideLoader);
    window.addEventListener('pagehide', hideLoader);
    // Hide loader if a JS error prevents navigation from completing.
    window.addEventListener('error', hideLoader);
})();
