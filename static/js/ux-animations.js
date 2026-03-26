/**
 * IntQues – UX Animations
 * Handles: ripple effect, scroll-reveal, stagger-children, btn-glow on CTAs
 */
(function () {
    'use strict';

    /* ─────────────────────────────────────────
       1. RIPPLE — attach to every .ripple-btn
    ───────────────────────────────────────── */
    function createRipple(e) {
        var btn = e.currentTarget;
        var circle = document.createElement('span');
        var diameter = Math.max(btn.clientWidth, btn.clientHeight);
        var radius = diameter / 2;
        var rect = btn.getBoundingClientRect();

        circle.classList.add('ripple-circle');
        circle.style.width  = circle.style.height = diameter + 'px';
        circle.style.left   = (e.clientX - rect.left - radius) + 'px';
        circle.style.top    = (e.clientY - rect.top  - radius) + 'px';

        // remove any old ripple
        var existing = btn.querySelector('.ripple-circle');
        if (existing) existing.remove();

        btn.appendChild(circle);
    }

    function isNavigationAnchor(el) {
        if (!el || el.tagName !== 'A') {
            return false;
        }

        var href = (el.getAttribute('href') || '').trim();
        return Boolean(href) && href !== '#' && href.charAt(0) !== '#';
    }

    function attachRipples() {
        document.querySelectorAll('.ripple-btn').forEach(function (btn) {
            btn.removeEventListener('click', createRipple);

            if (isNavigationAnchor(btn)) {
                btn.classList.remove('ripple-btn');
                return;
            }

            btn.addEventListener('click', createRipple);
        });
    }

    /* ─────────────────────────────────────────
       2. AUTO-UPGRADE main CTA buttons
          (add ripple-btn + btn-glow classes)
    ───────────────────────────────────────── */
    var CTA_SELECTORS = [
        '.hp-btn-shiny',
        '.pricing-btn-primary',
        '.cp-main-button',
        '.certificate-btn-primary',
        '.mobile-bottom-cta__button',
        '.demo-cta-btn',
        '[href="/enroll"]',
    ];

    function upgradeCTAs() {
        CTA_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.classList.add('btn-glow');

                if (isNavigationAnchor(el)) {
                    el.classList.remove('ripple-btn');
                    return;
                }

                el.classList.add('ripple-btn');
            });
        });
    }

    /* ─────────────────────────────────────────
       3. SCROLL-REVEAL via IntersectionObserver
    ───────────────────────────────────────── */
    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) {
            // fallback: just make everything visible
            document.querySelectorAll('.section-reveal, .stagger-children').forEach(function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.section-reveal, .stagger-children').forEach(function (el) {
            observer.observe(el);
        });
    }

    /* ─────────────────────────────────────────
       4. AUTO-MARK sections for reveal
    ───────────────────────────────────────── */
    var SECTION_HEADERS = [
        '.testimonials-header',
        '.faq-header',
        '.pricing-header',
        '.curriculum-header',
        '.instructors-header',
        '.certificate-header',
        '.companies-header',
    ];

    var GRID_SELECTORS = [
        '.testimonials-grid',
        '.curriculum-grid',
        '.instructors-grid',
        '.ta-grid',
        '.companies-logos',
        '.pricing-wrapper',
    ];

    function autoMarkReveal() {
        SECTION_HEADERS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.classList.add('section-reveal');
            });
        });

        GRID_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.classList.add('stagger-children');
            });
        });
    }

    /* ─────────────────────────────────────────
       5. FLOATING ANIMATION on hero orbs
          (adds slight continuous drift)
    ───────────────────────────────────────── */
    function injectFloatKeyframes() {
        if (document.getElementById('ux-float-keyframes')) return;
        var style = document.createElement('style');
        style.id = 'ux-float-keyframes';
        style.textContent = [
            '@keyframes uxFloat {',
            '  0%,100% { transform: translateY(0px) scale(1); }',
            '  50%      { transform: translateY(-18px) scale(1.04); }',
            '}',
            '.hp-orb-1 { animation: uxFloat 7s ease-in-out infinite !important; }',
            '.hp-orb-2 { animation: uxFloat 9s ease-in-out infinite 1.5s !important; }',
            '.cp-bg-glow { animation: uxFloat 11s ease-in-out infinite 3s !important; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    /* ─────────────────────────────────────────
       6. HERO COUNTER — animated number roll-up
    ───────────────────────────────────────── */
    function animateCounters() {
        var counters = document.querySelectorAll('.hp-metric-number');
        counters.forEach(function (el) {
            var text = el.textContent.trim();
            var match = text.match(/^(\d+)/);
            if (!match) return;
            var target = parseInt(match[1], 10);
            var suffix = text.slice(match[0].length); // e.g. "%" or "★"
            var start = 0;
            var duration = 1200;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                el.textContent = Math.round(ease * target) + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }

            // Only run once hero is in view
            var obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    requestAnimationFrame(step);
                    obs.disconnect();
                }
            }, { threshold: 0.5 });
            obs.observe(el.closest('section') || el);
        });
    }

    /* ─────────────────────────────────────────
       INIT
    ───────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        injectFloatKeyframes();
        autoMarkReveal();
        upgradeCTAs();
        attachRipples();
        initScrollReveal();
        animateCounters();
    });
})();

