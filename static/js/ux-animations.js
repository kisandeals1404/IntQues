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
        '.mbc-seg',
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
        '.stats-strip',
    ];

    var GRID_SELECTORS = [
        '.testimonials-grid',
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
          Generic utility: any element with
          data-counter-target="1000" (+ optional
          data-counter-suffix="+") counts up from 0
          once it scrolls into view. Used by the
          homepage trust-stats section and reusable
          anywhere else a number should animate in.
    ───────────────────────────────────────── */
    function initCounterAnimation() {
        document.querySelectorAll('[data-counter-target]').forEach(function (el) {
            var target = parseInt(el.getAttribute('data-counter-target'), 10);
            if (isNaN(target)) return;
            var suffix = el.getAttribute('data-counter-suffix') || '';
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

            function start() {
                if (started) return;
                started = true;
                el.classList.add('is-counted'); /* releases any opacity/transform reveal-gate CSS */
                requestAnimationFrame(step);
            }

            if ('IntersectionObserver' in window) {
                var obs = new IntersectionObserver(function (entries) {
                    if (entries[0].isIntersecting) {
                        start();
                        obs.disconnect();
                    }
                }, { threshold: 0.4 });
                obs.observe(el.closest('section') || el);
            } else {
                start();
            }
        });
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
       8. INFINITE MARQUEE — popular offerings
          Cards clone themselves and scroll
          continuously. Pauses on hover.
    ───────────────────────────────────────── */
    function initMarquees() {
        document.querySelectorAll('[data-marquee]').forEach(function (track) {
            var cards = Array.from(track.children);
            if (cards.length === 0) return;

            /* Clone all cards for seamless loop (original + clone = 200%) */
            cards.forEach(function (card) {
                var clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                /* Prevent duplicate interactive elements in clones */
                clone.querySelectorAll('a, button').forEach(function (el) {
                    el.setAttribute('tabindex', '-1');
                });
                track.appendChild(clone);
            });

            /* Speed: ~6s per card, min 20s, max 60s */
            var dur = Math.min(60, Math.max(20, cards.length * 7));
            track.style.setProperty('--marquee-dur', dur + 's');
            track.classList.add('marquee-ready');
        });
    }

    /* ─────────────────────────────────────────
       9. AUTO-PLAY — sc-track carousels
          Advances automatically, pauses on
          hover or touch, loops back to start.
    ───────────────────────────────────────── */
    function initAutoPlay() {
        var INTERVAL  = 3800; /* ms between advances */
        var TOUCH_RESUME = 3000; /* ms after touch to resume */

        document.querySelectorAll('.sc-track').forEach(function (track) {
            var timer  = null;
            var paused = false;

            function cardStep() {
                /* Use first real card (not aria-hidden clone) */
                var first = track.querySelector(':scope > *:not([aria-hidden="true"])');
                return first ? first.offsetWidth + 20 : 300;
            }

            function advance() {
                if (paused) return;
                var max = track.scrollWidth - track.clientWidth;
                if (max <= 4) return; /* single card — nothing to scroll */

                if (track.scrollLeft + 6 >= max) {
                    track.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    track.scrollBy({ left: cardStep(), behavior: 'smooth' });
                }
            }

            function start() { timer = setInterval(advance, INTERVAL); }
            function stop()  { clearInterval(timer); }

            track.addEventListener('mouseenter', function () { paused = true;  stop(); });
            track.addEventListener('mouseleave', function () { paused = false; start(); });

            track.addEventListener('touchstart', function () { stop(); }, { passive: true });
            track.addEventListener('touchend', function () {
                setTimeout(function () { start(); }, TOUCH_RESUME);
            }, { passive: true });

            /* Sync arrow buttons on scroll (keeps nav state correct) */
            track.addEventListener('scroll', function () {
                var atStart = track.scrollLeft <= 4;
                var atEnd   = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
                var wrap    = track.closest('.sc-wrap');
                var fade    = wrap ? wrap.querySelector('.sc-fade') : null;
                var id      = track.id;
                if (id) {
                    document.querySelectorAll('[data-carousel="' + id + '"]').forEach(function (btn) {
                        var d = parseInt(btn.getAttribute('data-dir'), 10);
                        btn.disabled = (d === -1 && atStart) || (d === 1 && atEnd);
                    });
                }
                if (fade) fade.style.opacity = atEnd ? '0' : '1';
            }, { passive: true });

            /* Arrow button clicks */
            if (track.id) {
                document.querySelectorAll('[data-carousel="' + track.id + '"]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var d = parseInt(btn.getAttribute('data-dir'), 10);
                        track.scrollBy({ left: d * cardStep(), behavior: 'smooth' });
                        /* Brief pause so user sees where they clicked to */
                        stop();
                        setTimeout(start, INTERVAL * 2);
                    });
                });
            }

            /* Stagger start times so not all sections advance simultaneously */
            var delay = 1500 + Math.random() * 1000;
            setTimeout(start, delay);
        });
    }

    /* ─────────────────────────────────────────
       10. Remove stagger-children from carousels
           Cards must be fully visible — no fade-in
    ───────────────────────────────────────── */
    function fixCarouselStagger() {
        document.querySelectorAll('.pop-marquee-track, .sc-track').forEach(function (el) {
            el.classList.remove('stagger-children');
            el.querySelectorAll(':scope > *').forEach(function (card) {
                card.style.opacity    = '';
                card.style.transform  = '';
                card.style.transition = '';
            });
        });
    }

    /* ─────────────────────────────────────────
       11. HERO SEARCH — redirect to offerings
    ───────────────────────────────────────── */
    /* ─────────────────────────────────────────
       12. HERO HEADLINE — rotating word
           "Only Coding." → "Building." → …
           Slides old word up, slides new in from below.
    ───────────────────────────────────────── */
    function initHeroWordRotate() {
        var el = document.querySelector('.h1-rotate');
        if (!el) return;

        var words   = ['Hired.', 'Interview-Ready.', 'Noticed.', 'Job-Ready.'];
        var current = 0;

        function rotateTo(next) {
            /* Exit: fade + slide up */
            el.style.opacity   = '0';
            el.style.transform = 'translateY(-14px)';
            el.style.transition = 'opacity 240ms ease-in, transform 240ms ease-in';

            setTimeout(function () {
                /* Teleport below, swap text */
                el.style.transition = 'none';
                el.style.transform  = 'translateY(18px)';
                el.style.opacity    = '0';
                el.textContent      = words[next];

                /* Force reflow so the reset is applied before the enter transition */
                void el.offsetWidth;

                /* Enter: slide up from below */
                el.style.transition = 'opacity 340ms ease-out, transform 380ms cubic-bezier(0.2, 0.9, 0.2, 1)';
                el.style.opacity    = '1';
                el.style.transform  = 'translateY(0)';
                current             = next;
            }, 260);
        }

        /* Start rotating after 2.4s so user reads the first word first */
        setTimeout(function () {
            setInterval(function () {
                rotateTo((current + 1) % words.length);
            }, 2600);
        }, 2400);
    }

    /* ─────────────────────────────────────────
       15. OFFERINGS SEARCH — cycling placeholder
           Keeps the same rotating hints as the
           hero search so both feel consistent.
    ───────────────────────────────────────── */
    function initOfferingsSearchPlaceholder() {
        var input = document.getElementById('of-search');
        if (!input) return;
        var hints = ['Java', 'Kafka', 'Spring Boot', 'SQL', 'REST APIs', 'AWS', 'Microservices'];
        var hi = 0;
        setInterval(function () {
            if (document.activeElement === input) return;
            hi = (hi + 1) % hints.length;
            input.placeholder = 'Try “' + hints[hi] + '”…';
        }, 2800);
    }

    /* ─────────────────────────────────────────
       13. MOUSE DRAG — desktop drag-to-scroll
           Lets desktop users drag carousels with
           mouse, same as touch swipe on mobile.
           Suppresses child link clicks when the
           gesture was a drag, not a tap.
    ───────────────────────────────────────── */
    function initMouseDrag() {
        document.querySelectorAll('.sc-track, .pop-marquee-track').forEach(function (track) {
            var isDown   = false;
            var hasMoved = false;
            var startX   = 0;
            var startScroll = 0;

            function rect() { return track.getBoundingClientRect(); }

            track.addEventListener('mousedown', function (e) {
                if (e.button !== 0) return;
                isDown     = true;
                hasMoved   = false;
                startX     = e.pageX - rect().left;
                startScroll = track.scrollLeft;
                track.style.cursor     = 'grabbing';
                track.style.userSelect = 'none';
            });

            track.addEventListener('mousemove', function (e) {
                if (!isDown) return;
                e.preventDefault();
                var x  = e.pageX - rect().left;
                var dx = x - startX;
                if (Math.abs(dx) > 4) hasMoved = true;
                track.scrollLeft = startScroll - dx;
            });

            function release() {
                if (!isDown) return;
                isDown = false;
                track.style.cursor     = 'grab';
                track.style.userSelect = '';
            }
            track.addEventListener('mouseup',    release);
            track.addEventListener('mouseleave', release);

            /* Block child-link navigation when the action was a drag, not a click */
            track.addEventListener('click', function (e) {
                if (hasMoved) {
                    e.preventDefault();
                    e.stopPropagation();
                    hasMoved = false;
                }
            }, true);
        });
    }

    /* ─────────────────────────────────────────
       14. RESET CAROUSEL SCROLL — ensure every
           carousel starts at position 0 so mobile
           users always see the first card.
    ───────────────────────────────────────── */
    function resetCarouselPositions() {
        document.querySelectorAll('.sc-track, .pop-marquee-track').forEach(function (track) {
            track.scrollLeft = 0;
        });
    }

    /* ─────────────────────────────────────────
       16. BACK TO TOP — appears after 400px scroll
    ───────────────────────────────────────── */
    function initBackToTop() {
        var btn = document.createElement('button');
        btn.className = 'btt-btn';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);

        var visible = false;
        window.addEventListener('scroll', function () {
            var shouldShow = window.scrollY > 400;
            if (shouldShow !== visible) {
                visible = shouldShow;
                btn.classList.toggle('visible', visible);
            }
        }, { passive: true });
    }

    /* ─────────────────────────────────────────
       INIT
    ───────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        injectFloatKeyframes();
        autoMarkReveal();
        fixCarouselStagger();   /* clear stagger before reveal observer starts */
        upgradeCTAs();
        attachRipples();
        initScrollReveal();
        initCounterAnimation();
        initNavbarScroll();
        initMarquees();
        resetCarouselPositions(); /* ensure all carousels start at first card */
        initAutoPlay();
        initMouseDrag();
        initHeroWordRotate();
        initOfferingsSearchPlaceholder();
        initBackToTop();
    });
})();

