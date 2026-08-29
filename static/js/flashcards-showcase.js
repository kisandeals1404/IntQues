/**
 * IntQues – Flashcards Showcase (Section 4)
 * Continuously-cycling vertical card stack demonstrating the core
 * flashcard experience across 11 topics. Pure CSS + JS, transform/
 * opacity only. Built on the shared ticker in motion-kit.js.
 *
 * Only animates while the deck is actually on-screen (own
 * IntersectionObserver, independent of the one-time lazy boot),
 * and respects prefers-reduced-motion by leaving the four
 * server-rendered cards static.
 */
(function () {
    'use strict';

    var Motion = window.IntQuesMotion;

    var TOPICS = [
        { topic: 'Java',           q: 'What is the difference between == and .equals()?' },
        { topic: 'Spring Boot',    q: 'What is Inversion of Control?' },
        { topic: 'MongoDB',        q: 'What is a replica set?' },
        { topic: 'Kafka',          q: 'What is a consumer group?' },
        { topic: 'SQL',            q: 'What is a composite index?' },
        { topic: 'React',          q: 'What is the Virtual DOM?' },
        { topic: 'DSA',            q: 'What is the time complexity of binary search?' },
        { topic: 'System Design',  q: 'What is a load balancer?' },
        { topic: 'Collections',    q: 'How does a HashMap resolve collisions?' },
        { topic: 'OS',             q: 'What is a deadlock?' },
        { topic: 'Networking',     q: 'What is the difference between TCP and UDP?' }
    ];

    var CYCLE_MS = 2600;
    var EXIT_MS = 480;

    function boot(root) {
        var cards = Array.prototype.slice.call(root.querySelectorAll('[data-fcs-card]'));
        if (cards.length < 4) return;
        if (Motion.prefersReducedMotion()) return; /* static default cards already correct */

        var cursor = cards.length; /* topics[0..3] already rendered server-side */
        var ticker = Motion.createTicker();
        var elapsed = 0;
        var exiting = false;

        function nextTopic() {
            var t = TOPICS[cursor % TOPICS.length];
            cursor++;
            return t;
        }

        function advance() {
            if (exiting) return;
            exiting = true;
            var front = cards[0];
            front.classList.add('is-exiting');

            setTimeout(function () {
                var data = nextTopic();
                front.querySelector('[data-fcs-topic]').textContent = data.topic;
                front.querySelector('[data-fcs-question]').textContent = data.q;
                front.classList.remove('is-exiting');

                cards.push(cards.shift());
                cards.forEach(function (c, i) { c.dataset.slot = String(i); });

                exiting = false;
            }, EXIT_MS);
        }

        function tick(dt) {
            elapsed += dt;
            if (elapsed >= CYCLE_MS) {
                elapsed = 0;
                advance();
            }
        }
        ticker.add(tick);

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    ticker.resync();
                    ticker.start();
                } else {
                    ticker.stop();
                }
            }, { threshold: 0.15 });
            io.observe(root);
        } else {
            ticker.start();
        }

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                ticker.stop();
            } else {
                ticker.resync();
                ticker.start();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        Motion.lazyBoot('[data-flashcards-showcase]', boot);
    });
})();
