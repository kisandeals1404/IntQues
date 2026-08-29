/**
 * IntQues – Hero Product Showcase
 * Interactive, infinitely-looping animated demo of Flashcards / Quiz /
 * Resume Builder shown in the homepage hero. Pure CSS + JS — no Lottie,
 * no video, no GIF. Only transform/opacity are animated (GPU-accelerated).
 *
 * Desktop: layered "depth-stack" — one focal panel + two peeking panels,
 * cycling which scene is focal. Mobile: swipeable carousel, one scene
 * at a time, auto-advances every 5s.
 *
 * Respects prefers-reduced-motion (renders one static frame, no timers)
 * and pauses all animation when the tab is hidden.
 *
 * Built on the shared ticker/scheduler primitives in motion-kit.js
 * (load order: motion-kit.js must come before this file).
 */
(function () {
    'use strict';

    var Motion = window.IntQuesMotion;
    var scheduleSteps = Motion.scheduleSteps;
    var typeInto = Motion.typeInto;
    var animateCounter = Motion.animateCounter;
    var readMs = Motion.readMs;

    /* ─────────────────────────────────────────
       1. DEMO DATA
    ───────────────────────────────────────── */
    var FLASHCARDS = [
        { topic: 'Java',           q: 'What is Dependency Injection?',
          a: 'A design pattern where objects receive their dependencies from an external source rather than creating them, enabling loose coupling.' },
        { topic: 'Spring Boot',    q: 'What does @SpringBootApplication do?',
          a: 'Combines @Configuration, @EnableAutoConfiguration and @ComponentScan into one bootstrap annotation.' },
        { topic: 'MongoDB',        q: 'What is a document in MongoDB?',
          a: 'MongoDB’s equivalent of a row — a BSON record stored as flexible, JSON-like key-value fields.' },
        { topic: 'Kafka',          q: 'What is a Kafka partition?',
          a: 'An ordered, immutable sequence of messages within a topic that enables parallel consumption.' },
        { topic: 'SQL',            q: 'INNER JOIN vs. LEFT JOIN — what’s the difference?',
          a: 'INNER JOIN returns only matching rows; LEFT JOIN returns all left-table rows plus matches from the right.' },
        { topic: 'REST APIs',      q: 'What makes an API RESTful?',
          a: 'Stateless requests, resource-based URLs, and standard HTTP verbs — GET, POST, PUT, DELETE.' },
        { topic: 'Microservices',  q: 'What is service discovery?',
          a: 'A mechanism that lets microservices find and call each other dynamically, without hardcoded addresses.' },
        { topic: 'System Design',  q: 'What is horizontal scaling?',
          a: 'Adding more machines to handle load, instead of upgrading a single machine’s resources.' },
        { topic: 'Collections',    q: 'When would you use a HashSet over a List?',
          a: 'When you need unique elements with O(1) average lookup and don’t care about insertion order.' },
        { topic: 'Multithreading', q: 'What does the synchronized keyword do?',
          a: 'Ensures only one thread executes a block or method at a time, preventing race conditions.' }
    ];

    var QUIZ_QUESTIONS = [
        { number: 7, q: 'Which annotation creates a REST endpoint?',
          options: ['@RestController', '@Entity', '@Autowired', '@Configuration'], correctIndex: 0 },
        { number: 8, q: 'Which Java Collection does NOT allow duplicates?',
          options: ['ArrayList', 'HashSet', 'LinkedList', 'Vector'], correctIndex: 1 }
    ];

    var PROFICIENCY_BAR_KEYS = ['java', 'springboot', 'sql', 'mongodb'];
    var SCORE_SEQUENCE = [76, 81, 84];

    var RESUME_FIELDS = {
        name: 'Ashok Kumar',
        email: 'ashok@email.com',
        phone: '98XXXXXXXX',
        skills: ['Java', 'Spring Boot', 'MongoDB', 'Kafka'],
        experience: '4 Years',
        projects: 'E-Commerce Platform'
    };
    var ATS_SCORE = 96;

    /* Single ticker for the whole hero canvas — shared by every scene,
       the depth-stack cycle, and the parallax. See motion-kit.js. */
    var HSTicker = Motion.createTicker();

    /* ─────────────────────────────────────────
       3. SCENE 1 — FLASHCARDS
    ───────────────────────────────────────── */
    function createFlashcardScene(panelEl, config) {
        var cardEl        = panelEl.querySelector('[data-hs-flash-card]');
        var topicFrontEl  = panelEl.querySelector('[data-hs-topic-front]');
        var topicBackEl   = panelEl.querySelector('[data-hs-topic-back]');
        var questionEl    = panelEl.querySelector('[data-hs-question]');
        var answerEl      = panelEl.querySelector('[data-hs-answer]');
        var indexEl       = panelEl.querySelector('[data-hs-card-index]');

        var subMgr = Motion.createSubManager(HSTicker);
        var cursor = 0; /* persists across activate/deactivate so a long-running
                            visitor eventually sees all 10 topics */

        function renderCard(card, number) {
            topicFrontEl.textContent = card.topic;
            topicBackEl.textContent  = card.topic;
            questionEl.textContent   = card.q;
            answerEl.textContent     = card.a;
            indexEl.textContent      = 'Card ' + number + ' / ' + FLASHCARDS.length;
        }

        function showSettled() {
            cardEl.classList.remove('is-exiting', 'is-entering', 'is-flipped');
            cardEl.classList.add('is-settled');
        }
        function flip() { cardEl.classList.add('is-flipped'); }
        function exitCard() {
            cardEl.classList.remove('is-settled');
            cardEl.classList.add('is-exiting');
        }
        function enterNext(card, number) {
            renderCard(card, number);
            cardEl.classList.remove('is-exiting', 'is-flipped');
            cardEl.classList.add('is-entering');
            void cardEl.offsetWidth; /* force reflow so "entering" start position registers */
            cardEl.classList.remove('is-entering');
            cardEl.classList.add('is-settled');
        }

        /* One card's show -> flip -> hold -> (optional) exit. Returns the
           time its exit completes, so the caller can chain the next card
           to enter seamlessly. */
        function buildCard(baseAt, card, number, isFirst, withExit) {
            var flipAt = baseAt + 1500;
            var steps = [{
                at: baseAt,
                run: isFirst
                    ? function () { renderCard(card, number); showSettled(); }
                    : function () { enterNext(card, number); }
            }, {
                at: flipAt,
                run: flip
            }];
            var exitCompleteAt = flipAt + config.flipDuration + 1100;
            if (withExit) {
                steps.push({ at: exitCompleteAt - config.cardSwipeDuration, run: exitCard });
            }
            return { steps: steps, exitCompleteAt: exitCompleteAt };
        }

        function activate() {
            subMgr.clear();
            cardEl.classList.remove('is-exiting', 'is-entering', 'is-flipped', 'is-settled');

            var i1 = cursor % FLASHCARDS.length;
            var i2 = (cursor + 1) % FLASHCARDS.length;

            /* Card 1 plays a full cycle (show, flip, hold, exit). Card 2
               enters right after and simply holds after its flip — a clean
               resting frame rather than fading out mid-loop. */
            var first  = buildCard(0, FLASHCARDS[i1], i1 + 1, true, true);
            var second = buildCard(first.exitCompleteAt, FLASHCARDS[i2], i2 + 1, false, false);

            subMgr.add(scheduleSteps(first.steps.concat(second.steps)));
        }

        function deactivate() {
            subMgr.clear();
            cursor = (cursor + 2) % FLASHCARDS.length;
        }

        return { activate: activate, deactivate: deactivate };
    }

    /* ─────────────────────────────────────────
       4. SCENE 2 — QUIZ
    ───────────────────────────────────────── */
    function createQuizScene(panelEl) {
        var qnumEl         = panelEl.querySelector('[data-hs-qnum]');
        var progressFillEl = panelEl.querySelector('[data-hs-quiz-progress]');
        var questionEl     = panelEl.querySelector('[data-hs-quiz-question]');
        var optionEls      = Array.prototype.slice.call(panelEl.querySelectorAll('[data-hs-option]'));
        var feedbackEl     = panelEl.querySelector('[data-hs-quiz-feedback]');
        var sessionView    = panelEl.querySelector('[data-hs-quiz-view="session"]');
        var dashboardView  = panelEl.querySelector('[data-hs-quiz-view="dashboard"]');
        var scoreEl        = panelEl.querySelector('[data-hs-quiz-score]');
        var weakChipEls    = Array.prototype.slice.call(panelEl.querySelectorAll('.hs-quiz-weak-chip'));
        var recommendLiEls = Array.prototype.slice.call(panelEl.querySelectorAll('.hs-quiz-recommend li'));
        var barEls = {};
        PROFICIENCY_BAR_KEYS.forEach(function (key) {
            barEls[key] = panelEl.querySelector('[data-hs-bar="' + key + '"]');
        });

        var subMgr = Motion.createSubManager(HSTicker);

        function renderQuestion(qData) {
            qnumEl.textContent = 'Question ' + qData.number + ' / 20';
            questionEl.textContent = qData.q;
            optionEls.forEach(function (li, i) {
                li.querySelector('[data-hs-option-text]').textContent = qData.options[i];
                li.classList.remove('is-correct');
            });
            feedbackEl.classList.remove('is-shown');
            progressFillEl.style.transform = 'scaleX(' + (qData.number / 20) + ')';
        }

        function resetVisual() {
            sessionView.classList.add('is-active');
            dashboardView.classList.remove('is-active');
            PROFICIENCY_BAR_KEYS.forEach(function (key) { barEls[key].classList.remove('is-filled'); });
            weakChipEls.forEach(function (el) { el.classList.remove('is-shown'); });
            recommendLiEls.forEach(function (el) { el.classList.remove('is-shown'); });
            scoreEl.textContent = SCORE_SEQUENCE[0] + '%';
        }

        function animateScore() {
            var i = 0, elapsed = 0, stepDuration = 1000;
            function step(dt) {
                elapsed += dt;
                if (elapsed >= stepDuration && i < SCORE_SEQUENCE.length - 1) {
                    elapsed = 0;
                    i++;
                    scoreEl.textContent = SCORE_SEQUENCE[i] + '%';
                }
                if (i >= SCORE_SEQUENCE.length - 1 && elapsed >= stepDuration) {
                    subMgr.remove(step);
                }
            }
            subMgr.add(step);
        }

        function activate() {
            subMgr.clear();
            resetVisual();

            var q1 = QUIZ_QUESTIONS[0];
            var q2 = QUIZ_QUESTIONS[1];

            subMgr.add(scheduleSteps([
                { at: 0,    run: function () { renderQuestion(q1); } },
                { at: 800,  run: function () { optionEls[q1.correctIndex].classList.add('is-correct'); } },
                { at: 1300, run: function () { feedbackEl.classList.add('is-shown'); } },
                { at: 2500, run: function () { renderQuestion(q2); } },
                { at: 3300, run: function () { optionEls[q2.correctIndex].classList.add('is-correct'); } },
                { at: 3800, run: function () { feedbackEl.classList.add('is-shown'); } },
                { at: 5000, run: function () {
                    sessionView.classList.remove('is-active');
                    dashboardView.classList.add('is-active');
                } },
                { at: 5450, run: function () { barEls.java.classList.add('is-filled'); } },
                { at: 5600, run: function () { barEls.springboot.classList.add('is-filled'); } },
                { at: 5750, run: function () { barEls.sql.classList.add('is-filled'); } },
                { at: 5900, run: function () { barEls.mongodb.classList.add('is-filled'); } },
                { at: 6700, run: function () { weakChipEls[0].classList.add('is-shown'); } },
                { at: 6850, run: function () { weakChipEls[1].classList.add('is-shown'); } },
                { at: 7050, run: function () { recommendLiEls[0].classList.add('is-shown'); } },
                { at: 7200, run: function () { recommendLiEls[1].classList.add('is-shown'); } },
                { at: 7350, run: function () { recommendLiEls[2].classList.add('is-shown'); } },
                { at: 8000, run: animateScore }
            ]));
        }

        function deactivate() { subMgr.clear(); }

        return { activate: activate, deactivate: deactivate };
    }

    /* ─────────────────────────────────────────
       5. SCENE 3 — RESUME BUILDER
    ───────────────────────────────────────── */
    function createResumeScene(panelEl, config) {
        var nameEl       = panelEl.querySelector('[data-hs-field="name"]');
        var emailEl      = panelEl.querySelector('[data-hs-field="email"]');
        var phoneEl      = panelEl.querySelector('[data-hs-field="phone"]');
        var skillsEl     = panelEl.querySelector('[data-hs-field="skills"]');
        var experienceEl = panelEl.querySelector('[data-hs-field="experience"]');
        var projectsEl   = panelEl.querySelector('[data-hs-field="projects"]');
        var caretEl      = panelEl.querySelector('[data-hs-caret]');
        var generateBtn  = panelEl.querySelector('[data-hs-generate-btn]');
        var loadingEl    = panelEl.querySelector('[data-hs-resume-loading]');
        var loadingFillEl= panelEl.querySelector('[data-hs-loading-fill]');
        var formView     = panelEl.querySelector('[data-hs-resume-view="form"]');
        var previewView  = panelEl.querySelector('[data-hs-resume-view="preview"]');
        var atsScoreEl   = panelEl.querySelector('[data-hs-ats-score]');

        var subMgr = Motion.createSubManager(HSTicker);

        function resetVisual() {
            [nameEl, emailEl, phoneEl, experienceEl, projectsEl].forEach(function (el) { el.textContent = ''; });
            skillsEl.innerHTML = '';
            caretEl.style.display = '';
            generateBtn.classList.remove('is-pressed');
            loadingEl.classList.remove('is-shown');
            loadingFillEl.classList.remove('is-filled');
            formView.classList.add('is-active');
            previewView.classList.remove('is-active');
            atsScoreEl.textContent = '0';
        }

        function popChip(text) {
            var span = document.createElement('span');
            span.textContent = text;
            skillsEl.appendChild(span);
            void span.offsetWidth;
            span.classList.add('is-shown');
        }

        function activate() {
            subMgr.clear();
            resetVisual();

            var charMs = config.typingCharMs;
            var steps = [];
            var t = 0;

            steps.push({ at: t, run: function () {
                typeInto(subMgr, nameEl, RESUME_FIELDS.name, charMs, function () { caretEl.style.display = 'none'; });
            } });
            t += RESUME_FIELDS.name.length * charMs + 150;

            steps.push({ at: t, run: function () { typeInto(subMgr, emailEl, RESUME_FIELDS.email, charMs); } });
            t += RESUME_FIELDS.email.length * charMs + 150;

            steps.push({ at: t, run: function () { typeInto(subMgr, phoneEl, RESUME_FIELDS.phone, charMs); } });
            t += RESUME_FIELDS.phone.length * charMs + 150;

            RESUME_FIELDS.skills.forEach(function (skill, i) {
                steps.push({ at: t + i * 150, run: function () { popChip(skill); } });
            });
            t += RESUME_FIELDS.skills.length * 150 + 150;

            steps.push({ at: t, run: function () { typeInto(subMgr, experienceEl, RESUME_FIELDS.experience, charMs); } });
            t += RESUME_FIELDS.experience.length * charMs + 150;

            steps.push({ at: t, run: function () { typeInto(subMgr, projectsEl, RESUME_FIELDS.projects, charMs); } });
            t += RESUME_FIELDS.projects.length * charMs + 300;

            steps.push({ at: t, run: function () { generateBtn.classList.add('is-pressed'); } });
            t += 160;
            steps.push({ at: t, run: function () {
                generateBtn.classList.remove('is-pressed');
                loadingEl.classList.add('is-shown');
            } });
            t += 120;
            steps.push({ at: t, run: function () { loadingFillEl.classList.add('is-filled'); } });
            t += 1300;
            steps.push({ at: t, run: function () {
                formView.classList.remove('is-active');
                previewView.classList.add('is-active');
            } });
            t += 450;
            steps.push({ at: t, run: function () {
                animateCounter(subMgr, atsScoreEl, 0, ATS_SCORE, 700, '');
            } });

            subMgr.add(scheduleSteps(steps));
        }

        function deactivate() { subMgr.clear(); }

        return { activate: activate, deactivate: deactivate };
    }

    /* ─────────────────────────────────────────
       6. DESKTOP DEPTH-STACK CYCLE
    ───────────────────────────────────────── */
    function initDepthStackCycle(root, scenes) {
        var panels = Array.prototype.slice.call(root.querySelectorAll('[data-hs-panel]'));
        var order  = panels.map(function (p) { return p.dataset.hsScene; });
        var SLOTS  = ['focal', 'peek-a', 'peek-b'];

        function panelFor(scene) {
            return panels.filter(function (p) { return p.dataset.hsScene === scene; })[0];
        }
        function applySlots() {
            order.forEach(function (scene, i) { panelFor(scene).dataset.hsSlot = SLOTS[i]; });
        }
        function focalDuration() {
            var attr = panelFor(order[0]).getAttribute('data-hs-focal-duration');
            return attr ? parseInt(attr, 10) : 8000;
        }

        applySlots();
        scenes[order[0]].activate();

        var elapsed = 0;
        var duration = focalDuration();

        function tick(dt) {
            elapsed += dt;
            if (elapsed >= duration) {
                elapsed = 0;
                scenes[order[0]].deactivate();
                order.push(order.shift());
                applySlots();
                duration = focalDuration();
                scenes[order[0]].activate();
            }
        }
        HSTicker.add(tick);

        return {
            teardown: function () {
                HSTicker.remove(tick);
                scenes[order[0]].deactivate();
            }
        };
    }

    /* ─────────────────────────────────────────
       7. MOUSE PARALLAX (desktop, fine pointer only)
    ───────────────────────────────────────── */
    function initParallax(root) {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            return { teardown: function () {} };
        }
        var section = root.closest('.hero-v3');
        if (!section) return { teardown: function () {} };

        var panels = root.querySelectorAll('[data-hs-parallax]');
        var raf = null, targetX = 0, targetY = 0;

        function apply() {
            raf = null;
            panels.forEach(function (p) {
                var depth = parseFloat(getComputedStyle(p).getPropertyValue('--hs-parallax-depth')) || 1;
                p.style.setProperty('--hs-px', (targetX * 6 * depth) + 'px');
                p.style.setProperty('--hs-py', (targetY * 6 * depth) + 'px');
            });
        }
        function onMove(e) {
            var rect = section.getBoundingClientRect();
            targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            if (!raf) raf = requestAnimationFrame(apply);
        }
        function onLeave() {
            panels.forEach(function (p) {
                p.style.setProperty('--hs-px', '0px');
                p.style.setProperty('--hs-py', '0px');
            });
        }

        section.addEventListener('mousemove', onMove, { passive: true });
        section.addEventListener('mouseleave', onLeave, { passive: true });

        return {
            teardown: function () {
                section.removeEventListener('mousemove', onMove);
                section.removeEventListener('mouseleave', onLeave);
            }
        };
    }

    /* ─────────────────────────────────────────
       8. MOBILE CAROUSEL
    ───────────────────────────────────────── */
    function initMobileCarousel(root, scenes, config) {
        var track = root.querySelector('[data-hs-track]');
        var order = ['flashcards', 'quiz', 'resume'];
        var index = 0;
        var timer = null;

        function render() {
            track.style.setProperty('--hs-active-index', index);
            root.querySelectorAll('[data-hs-dot]').forEach(function (d, i) {
                d.classList.toggle('is-active', i === index);
            });
        }
        function goTo(next) {
            scenes[order[index]].deactivate();
            index = (next + order.length) % order.length;
            scenes[order[index]].activate();
            render();
        }
        function scheduleAdvance() {
            clearTimeout(timer);
            timer = setTimeout(function () { goTo(index + 1); scheduleAdvance(); }, config.mobileAdvance);
        }

        scenes[order[index]].activate();
        render();
        scheduleAdvance();

        var startX = 0, startT = 0;
        function onTouchStart(e) {
            startX = e.touches[0].clientX;
            startT = Date.now();
            clearTimeout(timer);
        }
        function onTouchEnd(e) {
            var dx = e.changedTouches[0].clientX - startX;
            var dt = Date.now() - startT;
            if (Math.abs(dx) > 40 && dt < 600) {
                goTo(index + (dx < 0 ? 1 : -1));
            }
            scheduleAdvance();
        }
        track.addEventListener('touchstart', onTouchStart, { passive: true });
        track.addEventListener('touchend', onTouchEnd, { passive: true });

        return {
            teardown: function () {
                clearTimeout(timer);
                track.removeEventListener('touchstart', onTouchStart);
                track.removeEventListener('touchend', onTouchEnd);
                scenes[order[index]].deactivate();
            },
            onHide: function () { clearTimeout(timer); },
            onShow: function () { scheduleAdvance(); }
        };
    }

    /* ─────────────────────────────────────────
       9. LIFECYCLE — reduced motion, visibility,
          responsive mode switch, lazy boot
    ───────────────────────────────────────── */

    /* Freezes the showcase on one deliberately-composed frame per scene.
       Flashcards/quiz already default to the right frame in the markup;
       only the resume scene needs to be flipped to its finished preview. */
    function renderStaticSnapshot(root) {
        root.classList.add('hs--static');
        var resumePanel = root.querySelector('[data-hs-scene="resume"]');
        if (!resumePanel) return;
        var formView = resumePanel.querySelector('[data-hs-resume-view="form"]');
        var previewView = resumePanel.querySelector('[data-hs-resume-view="preview"]');
        var atsScoreEl = resumePanel.querySelector('[data-hs-ats-score]');
        if (formView) formView.classList.remove('is-active');
        if (previewView) previewView.classList.add('is-active');
        if (atsScoreEl) atsScoreEl.textContent = String(ATS_SCORE);
    }

    function bootShowcase(root) {
        if (root.dataset.hsBooted === 'true') return;
        root.dataset.hsBooted = 'true';

        if (Motion.prefersReducedMotion()) {
            renderStaticSnapshot(root);
            return;
        }

        var styles = getComputedStyle(root);
        var config = {
            swipeDuration:      readMs(styles, '--hero-showcase-swipe-duration', 700),
            cardSwipeDuration:  readMs(styles, '--hero-showcase-card-swipe-duration', 450),
            flipDuration:       readMs(styles, '--hero-showcase-flip-duration', 480),
            crossfadeDuration:  readMs(styles, '--hero-showcase-crossfade-duration', 400),
            typingCharMs:       readMs(styles, '--hero-showcase-typing-char-ms', 42),
            mobileAdvance:      readMs(styles, '--hero-showcase-mobile-advance', 5000)
        };

        var panels = root.querySelectorAll('[data-hs-panel]');
        var scenes = {
            flashcards: createFlashcardScene(panels[0], config),
            quiz:       createQuizScene(panels[1]),
            resume:     createResumeScene(panels[2], config)
        };

        HSTicker.start();

        var mql = window.matchMedia('(max-width: 767px)');
        var current = null;

        function teardownCurrent() {
            if (current && current.teardown) current.teardown();
            current = null;
        }

        function applyMode() {
            teardownCurrent();
            if (mql.matches) {
                current = initMobileCarousel(root, scenes, config);
            } else {
                var cycle = initDepthStackCycle(root, scenes);
                var parallax = initParallax(root);
                current = { teardown: function () { cycle.teardown(); parallax.teardown(); } };
            }
        }
        applyMode();
        if (mql.addEventListener) mql.addEventListener('change', applyMode);
        else if (mql.addListener) mql.addListener(applyMode);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                HSTicker.stop();
                if (current && current.onHide) current.onHide();
            } else {
                HSTicker.resync();
                HSTicker.start();
                if (current && current.onShow) current.onShow();
            }
        });

        var reduceMql = window.matchMedia('(prefers-reduced-motion: reduce)');
        function onReduceChange(e) {
            if (!e.matches) return;
            HSTicker.stop();
            teardownCurrent();
            renderStaticSnapshot(root);
        }
        if (reduceMql.addEventListener) reduceMql.addEventListener('change', onReduceChange);
        else if (reduceMql.addListener) reduceMql.addListener(onReduceChange);
    }

    function lazyInit() {
        Motion.lazyBoot('[data-hero-showcase]', bootShowcase);
    }

    document.addEventListener('DOMContentLoaded', lazyInit);
})();
