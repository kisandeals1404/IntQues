/**
 * IntQues – Quiz Experience (Section 5)
 * Continuously-looping animated quiz card: question cycles,
 * an answer selects (alternating correct/wrong to show both
 * feedback states), progress advances, confidence score ticks
 * up, and an XP pop celebrates correct answers. Built on the
 * shared ticker/scheduler in motion-kit.js.
 */
(function () {
    'use strict';

    var Motion = window.IntQuesMotion;
    var scheduleSteps = Motion.scheduleSteps;

    var QUESTIONS = [
        { number: 3, q: 'Which HTTP status code means “Created”?',
          options: ['200', '201', '204', '400'], correctIndex: 1 },
        { number: 4, q: 'Which keyword prevents a class from being subclassed?',
          options: ['static', 'final', 'private', 'const'], correctIndex: 1 },
        { number: 5, q: 'What does ACID stand for in databases?',
          options: ['A design pattern', 'A transaction guarantee', 'An index type', 'A caching strategy'], correctIndex: 1 }
    ];

    /* true = the shown selection is correct, false = shown as wrong —
       mostly right with an occasional miss, so both feedback states play. */
    var OUTCOME_PATTERN = [true, true, false];
    var CONFIDENCE_SEQUENCE = [78, 84, 91];

    var CYCLE_MS = 2700;

    function boot(root) {
        var card = root.querySelector('.qex-card');
        if (!card) return;
        if (Motion.prefersReducedMotion()) return; /* static markup already correct */

        var qnumEl = card.querySelector('[data-qex-qnum]');
        var progressEl = card.querySelector('[data-qex-progress]');
        var questionEl = card.querySelector('[data-qex-question]');
        var optionEls = Array.prototype.slice.call(card.querySelectorAll('[data-qex-option]'));
        var feedbackEl = card.querySelector('[data-qex-feedback]');
        var xpEl = card.querySelector('[data-qex-xp]');
        var confidenceEl = card.querySelector('[data-qex-confidence-value]');

        var ticker = Motion.createTicker();
        var subMgr = Motion.createSubManager(ticker);
        var qIndex = 0;
        var confidenceIndex = 0;

        function renderQuestion(qData) {
            qnumEl.textContent = 'Question ' + qData.number + ' / 10';
            questionEl.textContent = qData.q;
            optionEls.forEach(function (li, i) {
                li.querySelector('[data-qex-option-text]').textContent = qData.options[i];
                li.classList.remove('is-correct', 'is-wrong');
            });
            feedbackEl.classList.remove('is-shown', 'is-wrong');
            xpEl.classList.remove('is-shown');
            progressEl.style.transform = 'scaleX(' + (qData.number / 10) + ')';
        }

        function runCycle() {
            var qData = QUESTIONS[qIndex % QUESTIONS.length];
            var isCorrect = OUTCOME_PATTERN[qIndex % OUTCOME_PATTERN.length];
            qIndex++;
            var pickIndex = isCorrect ? qData.correctIndex : (qData.correctIndex + 1) % qData.options.length;

            var steps = [
                { at: 0, run: function () { renderQuestion(qData); } },
                { at: 700, run: function () {
                    optionEls[pickIndex].classList.add(isCorrect ? 'is-correct' : 'is-wrong');
                } },
                { at: 1150, run: function () {
                    feedbackEl.textContent = isCorrect ? '✓ Correct' : '✗ Not quite';
                    feedbackEl.classList.toggle('is-wrong', !isCorrect);
                    feedbackEl.classList.add('is-shown');
                    if (isCorrect) {
                        xpEl.classList.remove('is-shown');
                        void xpEl.offsetWidth; /* restart the pop animation each time */
                        xpEl.classList.add('is-shown');
                        confidenceIndex = Math.min(confidenceIndex + 1, CONFIDENCE_SEQUENCE.length - 1);
                        confidenceEl.textContent = CONFIDENCE_SEQUENCE[confidenceIndex] + '%';
                    }
                } },
                { at: CYCLE_MS, run: runCycle }
            ];
            subMgr.clear();
            subMgr.add(scheduleSteps(steps));
        }

        runCycle();

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
        Motion.lazyBoot('[data-quiz-experience]', boot);
    });
})();
