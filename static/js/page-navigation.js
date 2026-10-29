(function () {
    'use strict';

    var loaderEl = null;
    var stylesReady = false;

    // Skeleton, not a spinner: the header and tab bar stay put and the content area shows a
    // shimmering page outline plus a thin progress bar at the top (the Flipkart / Swiggy / YouTube
    // pattern). A white sheet with "Opening page…" read as the whole site reloading. Fades in after
    // 150ms so a fast navigation never flashes it. Colours come from the theme tokens, so it is
    // right in dark mode too.
    function injectStyles() {
        if (stylesReady) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'page-navigation-loader-styles';
        style.textContent = [
            '.page-nav-loader{position:fixed;left:0;right:0;bottom:0;top:calc(60px + env(safe-area-inset-top,0px));display:none;z-index:1250;pointer-events:none;background:var(--light-bg,#f8fafc);overflow:hidden;}',
            '@media (min-width:992px){.page-nav-loader{top:68px;}}',
            '.page-nav-loader.is-visible{display:block;animation:pnlIn .2s ease .15s both;}',
            '.page-nav-progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:2600;background:linear-gradient(90deg,#ff6a00,#ff3d81);box-shadow:0 0 8px rgba(255,106,0,.5);pointer-events:none;opacity:0;}',
            '.page-nav-progress.is-visible{opacity:1;animation:pnlBar 8s cubic-bezier(.1,.7,.2,1) forwards;}',
            '.pnl-wrap{max-width:1140px;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;gap:14px;}',
            '.pnl-b{border-radius:10px;background:var(--border-color,#e2e8f0);position:relative;overflow:hidden;}',
            '.pnl-b::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:pnlShine 1.2s ease-in-out infinite;}',
            ':root[data-theme="dark"] .pnl-b::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);}',
            '.pnl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:8px;}',
            '.pnl-card{height:150px;border-radius:16px;}',
            '@keyframes pnlIn{from{opacity:0}to{opacity:1}}',
            '@keyframes pnlShine{to{transform:translateX(100%);}}',
            '@keyframes pnlBar{0%{width:0}20%{width:45%}60%{width:75%}100%{width:92%}}',
            '@media (prefers-reduced-motion: reduce){.pnl-b::after{animation:none;}.page-nav-progress.is-visible{animation:none;width:70%;}}'
        ].join('');
        document.head.appendChild(style);
        stylesReady = true;
    }

    var progressEl = null;

    function ensureLoader() {
        if (loaderEl) {
            return loaderEl;
        }

        injectStyles();

        loaderEl = document.createElement('div');
        loaderEl.className = 'page-nav-loader';
        loaderEl.setAttribute('aria-hidden', 'true');
        loaderEl.innerHTML = '<div class="pnl-wrap" role="status" aria-live="polite">' +
            '<span class="visually-hidden">Loading page…</span>' +
            '<div class="pnl-b" style="height:26px;width:55%"></div>' +
            '<div class="pnl-b" style="height:14px;width:80%"></div>' +
            '<div class="pnl-b" style="height:44px;width:100%;border-radius:12px"></div>' +
            '<div class="pnl-grid">' +
            '<div class="pnl-b pnl-card"></div><div class="pnl-b pnl-card"></div><div class="pnl-b pnl-card"></div>' +
            '<div class="pnl-b pnl-card"></div><div class="pnl-b pnl-card"></div><div class="pnl-b pnl-card"></div>' +
            '</div></div>';
        document.body.appendChild(loaderEl);
        progressEl = document.createElement('div');
        progressEl.className = 'page-nav-progress';
        progressEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(progressEl);
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
        if (progressEl) progressEl.classList.remove('is-visible');
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
     * Navigate to `url`, showing the page skeleton + top progress bar.
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
