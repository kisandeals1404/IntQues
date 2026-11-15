/**
 * Cloudflare Turnstile helper for the login and sign-up pages (window.IqCaptcha).
 *
 * The page opts in with <meta name="iq-captcha" content="SITE_KEY"> (only login/signup render it,
 * and only when the server has keys — see TurnstileService). Without that meta tag getToken()
 * resolves to '' straight away, so the rest of the site never loads Cloudflare's script.
 *
 * IqCaptcha.getToken('containerId') → Promise<string>. The widget is "interaction-only": real
 * people usually see nothing; when Cloudflare wants a click, the box appears in that container.
 * Tokens are single-use, so every send asks for a fresh one.
 */
(function () {
    'use strict';

    var meta = document.querySelector('meta[name="iq-captcha"]');
    var siteKey = meta ? (meta.getAttribute('content') || '').trim() : '';
    var scriptPromise = null;
    var widgets = {};   // containerId -> widgetId
    var pending = {};   // containerId -> {resolve, reject, timer}

    function loadScript() {
        if (window.turnstile) return Promise.resolve();
        if (scriptPromise) return scriptPromise;
        scriptPromise = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true;
            s.defer = true;
            s.onload = function () { resolve(); };
            s.onerror = function () { scriptPromise = null; reject(new Error('load')); };
            document.head.appendChild(s);
        });
        return scriptPromise;
    }

    function settle(id, err, token) {
        var p = pending[id];
        if (!p) return;
        delete pending[id];
        clearTimeout(p.timer);
        if (err) p.reject(err); else p.resolve(token);
    }

    function getToken(containerId) {
        if (!siteKey) return Promise.resolve('');
        return loadScript().then(function () {
            return new Promise(function (resolve, reject) {
                var box = document.getElementById(containerId);
                if (!box) { resolve(''); return; }
                settle(containerId, new Error('replaced')); // a previous, unfinished request
                pending[containerId] = {
                    resolve: resolve,
                    reject: reject,
                    // Long enough to solve a visible challenge; then give the user a clear retry.
                    timer: setTimeout(function () {
                        settle(containerId, new Error('timeout'));
                    }, 90000)
                };
                if (widgets[containerId] === undefined) {
                    widgets[containerId] = window.turnstile.render(box, {
                        sitekey: siteKey,
                        appearance: 'interaction-only',
                        execution: 'execute',
                        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
                        size: 'flexible',
                        callback: function (token) { settle(containerId, null, token); },
                        'error-callback': function () { settle(containerId, new Error('error')); return true; },
                        'expired-callback': function () { /* a fresh one is fetched on the next send */ }
                    });
                } else {
                    window.turnstile.reset(widgets[containerId]);
                }
                window.turnstile.execute(widgets[containerId]);
            });
        }).catch(function (err) {
            if (err && err.message === 'replaced') throw err;
            throw new Error(err && err.message === 'load'
                ? 'The security check couldn’t load. Check your connection (or turn off an ad blocker) and try again.'
                : 'The security check didn’t finish. Please try again.');
        });
    }

    // Warm up on pages that use it, so the first click doesn't wait for the script.
    if (siteKey) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadScript);
        else loadScript();
    }

    window.IqCaptcha = { enabled: !!siteKey, getToken: getToken };
})();
