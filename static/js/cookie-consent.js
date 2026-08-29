/**
 * Minimal cookie-consent banner + gated analytics loader.
 *
 * Session/CSRF/remember-me cookies are strictly necessary (the site can't function without
 * them) and are set regardless of this banner — nothing here gates those. This only gates
 * the *optional* GA4 analytics script (window.__GA_MEASUREMENT_ID__, set server-side from
 * app.analytics.ga-measurement-id): it never loads until the visitor accepts, and never loads
 * at all if no measurement ID is configured.
 */
(function () {
    'use strict';

    var CONSENT_KEY = 'intques_cookie_consent';

    function loadAnalytics() {
        var gaId = window.__GA_MEASUREMENT_ID__;
        if (!gaId || document.getElementById('ga4-script')) return;

        var script = document.createElement('script');
        script.id = 'ga4-script';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', gaId, { anonymize_ip: true });
    }

    function getConsent() {
        try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
    }

    function setConsent(value) {
        try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* ignore */ }
    }

    function showBanner() {
        var banner = document.createElement('div');
        banner.className = 'cookie-consent-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML =
            '<p class="cookie-consent-text">' +
                'We use essential cookies to run IntQues, and optional analytics cookies to understand how the site is used. ' +
                '<a href="/cookie-policy">Learn more</a>.' +
            '</p>' +
            '<div class="cookie-consent-actions">' +
                '<button type="button" class="cookie-consent-btn cookie-consent-decline">Decline</button>' +
                '<button type="button" class="cookie-consent-btn cookie-consent-accept">Accept</button>' +
            '</div>';
        document.body.appendChild(banner);

        banner.querySelector('.cookie-consent-accept').addEventListener('click', function () {
            setConsent('accepted');
            banner.remove();
            loadAnalytics();
        });
        banner.querySelector('.cookie-consent-decline').addEventListener('click', function () {
            setConsent('declined');
            banner.remove();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var consent = getConsent();
        if (consent === 'accepted') {
            loadAnalytics();
        } else if (consent !== 'declined') {
            showBanner();
        }
    });
})();
