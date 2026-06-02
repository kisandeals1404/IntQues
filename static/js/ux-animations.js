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

        var existing = btn.querySelector('.ripple-circle');
        if (existing) existing.remove();

        btn.appendChild(circle);
    }

    function attachRipples() {
        document.querySelectorAll('.ripple-btn').forEach(function (btn) {
            btn.removeEventListener('mousedown', createRipple);
            btn.addEventListener('mousedown', createRipple);
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
        '.of-btn-enroll',
        '.of-btn-o',
        '.od-btn-enroll',
        '.od-btn-enroll-lg',
        '.hero-v3-btn-primary',
        '.course-btn-primary',
        '.lcb-btn',
    ];

    function upgradeCTAs() {
        CTA_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.classList.add('btn-glow', 'ripple-btn');
            });
        });
    }

    /* ─────────────────────────────────────────
       3. SCROLL-REVEAL via IntersectionObserver
    ───────────────────────────────────────── */
    function initScrollReveal() {
        var REVEAL_SELECTOR = '.section-reveal, .stagger-children, .reveal-left, .reveal-right, .reveal-scale';

        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
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

        document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
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
        '.wiq-header',
        '.why-heading',
        '.workshops-heading',
        '.diff-section .section-heading',
        '.stats-strip',
        '.pop-group-header',
    ];

    var GRID_SELECTORS = [
        '.testimonials-grid',
        '.curriculum-grid',
        '.instructors-grid',
        '.ta-grid',
        '.companies-logos',
        '.pricing-wrapper',
        '.wiq-grid',
        '.why-grid',
        '.workshops-grid',
        '.diff-grid',
        '.pop-grid',
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
       6. COUNTER ANIMATION — animated number roll-up
          Covers hero metrics + stats strip numbers
    ───────────────────────────────────────── */
    function animateCounters() {
        /* .hp-metric-number — plain text like "120", "98%", safe to replace */
        document.querySelectorAll('.hp-metric-number').forEach(function (el) {
            var text = el.textContent.trim();
            var match = text.match(/^(\d+)/);
            if (!match) return;
            var target = parseInt(match[1], 10);
            var suffix = text.slice(match[0].length);
            var duration = 1400;
            var startTime = null;
            var started = false;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var ease = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(ease * target) + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }

            var obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting && !started) {
                    started = true;
                    requestAnimationFrame(step);
                    obs.disconnect();
                }
            }, { threshold: 0.4 });
            obs.observe(el.closest('section') || el);
        });

        /* .stat-number — contains child <span> elements, use CSS-class entrance only.
           Observe the panel so all 4 numbers trigger together (staggered via CSS delay). */
        var statsPanel = document.querySelector('.stats-panel');
        if (statsPanel) {
            if ('IntersectionObserver' in window) {
                var statObs = new IntersectionObserver(function (entries) {
                    if (entries[0].isIntersecting) {
                        statsPanel.querySelectorAll('.stat-number').forEach(function (el) {
                            el.classList.add('stat-counted');
                        });
                        statObs.disconnect();
                    }
                }, { threshold: 0.3 });
                statObs.observe(statsPanel);
            } else {
                /* Fallback: show immediately if IntersectionObserver unsupported */
                statsPanel.querySelectorAll('.stat-number').forEach(function (el) {
                    el.classList.add('stat-counted');
                });
            }
        }
    }

    /* ─────────────────────────────────────────
       7. NAVBAR — glass morphism on scroll
    ───────────────────────────────────────── */
    function initNavbarScroll() {
        var navbar = document.querySelector('.navbar');
        if (!navbar) return;

        function onScroll() {
            if (window.scrollY > 12) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
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
        initNavbarScroll();
    });
})();

