(function () {
    'use strict';

    function safeDecodeBase64(value) {
        if (!value) return '';
        try {
            return window.atob(value);
        } catch (e) {
            return '';
        }
    }

    function hydrateObfuscatedEmail(anchor) {
        if (!anchor) return;

        var user = safeDecodeBase64(anchor.getAttribute('data-user-b64'));
        var domain = safeDecodeBase64(anchor.getAttribute('data-domain-b64'));
        if (!user || !domain) return;

        var email = user + '@' + domain;
        anchor.textContent = email;
        anchor.setAttribute('href', 'mailto:' + email);
        anchor.setAttribute('aria-label', 'Email ' + email);
    }

    var nodes = document.querySelectorAll('.js-obfuscated-email');
    if (!nodes.length) return;

    nodes.forEach(hydrateObfuscatedEmail);
})();

