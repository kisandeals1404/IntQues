/**
 * IntQues – Motion Kit
 * Shared primitives for building infinitely-looping, GPU-accelerated
 * (transform/opacity-only) scripted animations across the site: the
 * homepage hero canvas and the flashcards/quiz/weak-area showcase
 * sections below it.
 *
 * Exposes window.IntQuesMotion = {
 *   createTicker, createSubManager, scheduleSteps,
 *   typeInto, animateCounter, readMs,
 *   prefersReducedMotion, lazyBoot
 * }
 *
 * Each consumer creates its OWN ticker (via createTicker()) rather than
 * sharing one global loop, so a showcase section further down the page
 * can be started only once it scrolls into view and stopped once it
 * scrolls back out — not just paused on document.visibilitychange.
 */
(function () {
    'use strict';

    /* One requestAnimationFrame loop driving every subscribed step
       function with a measured per-frame dt. stop()/resync() lets a
       caller pause cleanly (tab hidden, scrolled out of view) without
       hunting down individual timers, and avoid a multi-second
       "catch-up" jump when resuming. */
    function createTicker() {
        var subs = [];
        var last = null;
        var running = false;

        function frame(now) {
            if (!running) return;
            var dt = last === null ? 0 : now - last;
            last = now;
            subs.slice().forEach(function (fn) { fn(dt); });
            requestAnimationFrame(frame);
        }

        return {
            add: function (fn) { subs.push(fn); },
            remove: function (fn) { subs = subs.filter(function (s) { return s !== fn; }); },
            start: function () {
                if (running) return;
                running = true;
                last = null;
                requestAnimationFrame(frame);
            },
            stop: function () { running = false; },
            resync: function () { last = null; }
        };
    }

    /* Tracks a set of ticker subscriptions so a scene/component can
       clear all of them in one call (e.g. when it stops being focal). */
    function createSubManager(ticker) {
        var subs = [];
        return {
            add: function (fn) { subs.push(fn); ticker.add(fn); },
            remove: function (fn) { ticker.remove(fn); subs = subs.filter(function (s) { return s !== fn; }); },
            clear: function () { subs.forEach(function (fn) { ticker.remove(fn); }); subs = []; }
        };
    }

    /* Runs a list of {at, run} steps once, in order, as elapsed time
       (summed from per-frame dt) crosses each threshold. */
    function scheduleSteps(steps) {
        steps.sort(function (a, b) { return a.at - b.at; });
        var elapsed = 0, idx = 0;
        return function stepFn(dt) {
            elapsed += dt;
            while (idx < steps.length && elapsed >= steps[idx].at) {
                steps[idx].run();
                idx++;
            }
        };
    }

    /* Reveals `text` into el one character at a time. */
    function typeInto(subMgr, el, text, charMs, onDone) {
        var i = 0, acc = 0;
        function step(dt) {
            acc += dt;
            while (acc >= charMs && i <= text.length) {
                el.textContent = text.slice(0, i);
                i++;
                acc -= charMs;
            }
            if (i > text.length) {
                subMgr.remove(step);
                if (onDone) onDone();
            }
        }
        subMgr.add(step);
    }

    /* Eases a number from `from` to `to` over `duration` ms. */
    function animateCounter(subMgr, el, from, to, duration, suffix) {
        var elapsed = 0;
        function step(dt) {
            elapsed += dt;
            var t = Math.min(1, elapsed / duration);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(from + (to - from) * eased) + (suffix || '');
            if (t >= 1) subMgr.remove(step);
        }
        subMgr.add(step);
    }

    function readMs(styles, name, fallback) {
        var raw = styles.getPropertyValue(name).trim();
        var n = parseFloat(raw);
        return isNaN(n) ? fallback : n;
    }

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* Boots `bootFn(root)` once the first element matching `selector`
       scrolls into view, deferred via requestIdleCallback so it never
       competes with first paint/LCP even when already on-screen. */
    function lazyBoot(selector, bootFn) {
        var root = document.querySelector(selector);
        if (!root) return;

        function idle() {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(function () { bootFn(root); }, { timeout: 1500 });
            } else {
                setTimeout(function () { bootFn(root); }, 200);
            }
        }

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    idle();
                    io.disconnect();
                }
            }, { threshold: 0 });
            io.observe(root);
        } else {
            idle();
        }
    }

    window.IntQuesMotion = {
        createTicker: createTicker,
        createSubManager: createSubManager,
        scheduleSteps: scheduleSteps,
        typeInto: typeInto,
        animateCounter: animateCounter,
        readMs: readMs,
        prefersReducedMotion: prefersReducedMotion,
        lazyBoot: lazyBoot
    };
})();
