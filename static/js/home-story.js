/**
 * IntQues – Home "Story" Sections
 * Lightweight one-shot scroll reveals for the glue sections of the
 * redesigned homepage (Daily Habit's goal checklist + weekly chart).
 * How It Works / Comparison / Learning Paths / Resume teaser / Final
 * CTA only need the existing sitewide scroll-reveal classes and have
 * no bespoke JS here.
 */
(function () {
    'use strict';

    function revealDailyHabit(root) {
        var goalItems = Array.prototype.slice.call(root.querySelectorAll('[data-dh-goal]'));
        var bars = Array.prototype.slice.call(root.querySelectorAll('[data-dh-bar]'));

        goalItems.forEach(function (li, i) {
            setTimeout(function () { li.classList.add('is-shown'); }, i * 150);
        });

        bars.forEach(function (bar, i) {
            setTimeout(function () { bar.classList.add('is-grown'); }, 300 + i * 90);
        });
    }

    function initDailyHabit() {
        var root = document.querySelector('[data-daily-habit]');
        if (!root) return;

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    revealDailyHabit(root);
                    io.disconnect();
                }
            }, { threshold: 0.25 });
            io.observe(root);
        } else {
            revealDailyHabit(root);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initDailyHabit();
    });
})();
