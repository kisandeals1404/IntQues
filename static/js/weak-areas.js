/**
 * IntQues – Weak-Area Analytics (Section 6)
 * One-shot scroll-triggered reveal: proficiency bars fill,
 * "Mastered" badges pop on strong topics, weak topics start a
 * continuous warm glow, the heat map and recommendation list
 * stagger in. No continuous loop needed here (unlike Sections
 * 4/5), so this is plain setTimeout staggering rather than the
 * ticker/scheduler used for the infinite showcases.
 */
(function () {
    'use strict';

    function reveal(root) {
        var barRows = Array.prototype.slice.call(root.querySelectorAll('.wka-bar-row'));
        var cells = Array.prototype.slice.call(root.querySelectorAll('[data-wka-heatmap] .wka-cell'));
        var recommendItems = Array.prototype.slice.call(root.querySelectorAll('.wka-recommend-list li'));

        barRows.forEach(function (row, i) {
            var fill = row.querySelector('[data-wka-fill]');
            var badge = row.querySelector('[data-wka-badge]');
            setTimeout(function () {
                if (fill) fill.classList.add('is-filled');
                if (row.dataset.wkaWeak === 'true') {
                    setTimeout(function () { row.classList.add('is-glowing'); }, 900);
                }
                if (badge) {
                    setTimeout(function () { badge.classList.add('is-shown'); }, 950);
                }
            }, i * 140);
        });

        cells.forEach(function (cell, i) {
            setTimeout(function () { cell.classList.add('is-shown'); }, 500 + i * 60);
        });

        recommendItems.forEach(function (li, i) {
            setTimeout(function () { li.classList.add('is-shown'); }, 900 + i * 120);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-weak-areas]');
        if (!root) return;

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    reveal(root);
                    io.disconnect();
                }
            }, { threshold: 0.25 });
            io.observe(root);
        } else {
            reveal(root);
        }
    });
})();
