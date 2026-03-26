/**
 * Lazy logo loader for home page company section.
 * Shows fallback icon first and reveals real logo after successful image load.
 */
(function () {
    'use strict';

    const FALLBACK_URLS = {
        'Amazon': [
            'https://ik.imagekit.io/g3qqy3t8j/amozon%20apna%20clg.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/amozon%20apna%20clg.png'
        ],
        'Microsoft': [
            'https://ik.imagekit.io/g3qqy3t8j/microsoft%20apna.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/microsoft%20apna.png'
        ],
        'Google': [
            'https://ik.imagekit.io/g3qqy3t8j/google%20apna%20clg.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/google%20apna%20clg.png'
        ],
        'JPmorgan': [
            'https://ik.imagekit.io/g3qqy3t8j/JPMorgan.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/jp%20morgan.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/JPMorgan.png',
            'https://ik.imagekit.io/g3qqy3t8j/jp%20morgan.png'
        ],
        'Deloitte': [
            'https://ik.imagekit.io/g3qqy3t8j/DELOITEE%20APNA.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/DELOITEE%20APNA.png'
        ],
        'Dell': [
            'https://ik.imagekit.io/g3qqy3t8j/dell%20apna.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/dell%20apna.png'
        ],
        'IBM': [
            'https://ik.imagekit.io/g3qqy3t8j/IBM%20APNA.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/IBM%20APNA.png'
        ],
        'Paypal': [
            'https://ik.imagekit.io/g3qqy3t8j/PayPal.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/PayPal.png?tr=w-200,h-100',
            'https://ik.imagekit.io/g3qqy3t8j/paypal.png?tr=w-200,h-100,q-80',
            'https://ik.imagekit.io/g3qqy3t8j/PayPal.png',
            'https://ik.imagekit.io/g3qqy3t8j/paypal.png'
        ]
    };

    function buildCandidateUrls(img) {
        const primary = img.getAttribute('data-src') || '';
        const alt = img.getAttribute('alt') || '';
        const fallback = FALLBACK_URLS[alt] || [];
        return [primary].concat(fallback).filter(function (url, idx, all) {
            return Boolean(url) && all.indexOf(url) === idx;
        });
    }

    function markLoaded(img) {
        const card = img.closest('.cp-logo-card');
        if (card) {
            card.classList.add('logo-loaded');
            card.classList.remove('logo-error');
        }
        img.classList.remove('img-error');
        img.setAttribute('aria-busy', 'false');
    }

    function markError(img) {
        const card = img.closest('.cp-logo-card');
        if (card) {
            card.classList.remove('logo-loaded');
            card.classList.add('logo-error');
        }
        img.classList.add('img-error');
        img.setAttribute('aria-busy', 'false');
    }

    function loadWithFallback(img) {
        if (img.dataset.logoInitialized === 'true') {
            return;
        }

        img.dataset.logoInitialized = 'true';
        img.setAttribute('aria-busy', 'true');

        const urls = buildCandidateUrls(img);
        if (!urls.length) {
            markError(img);
            return;
        }

        let index = 0;

        function tryNextUrl() {
            if (index >= urls.length) {
                markError(img);
                return;
            }

            const candidate = urls[index++];
            const probe = new Image();

            probe.onload = function () {
                const onImageLoad = function () {
                    markLoaded(img);
                };
                const onImageError = function () {
                    tryNextUrl();
                };

                img.addEventListener('load', onImageLoad, { once: true });
                img.addEventListener('error', onImageError, { once: true });
                img.src = candidate;

                if (img.complete && img.naturalHeight > 0) {
                    markLoaded(img);
                }
            };

            probe.onerror = tryNextUrl;
            probe.src = candidate;
        }

        tryNextUrl();
    }

    function initCompanyLogos() {
        const logos = document.querySelectorAll('.company-logo[data-src]');
        if (!logos.length) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            logos.forEach(loadWithFallback);
            return;
        }

        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                loadWithFallback(entry.target);
                obs.unobserve(entry.target);
            });
        }, {
            root: null,
            rootMargin: '260px 0px',
            threshold: 0.01
        });

        logos.forEach(function (img) {
            observer.observe(img);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCompanyLogos);
    } else {
        initCompanyLogos();
    }
})();

