/**
 * Home page hero search box — live autosuggest against the one anonymous-accessible course
 * search endpoint (/api/home/search-suggest, see WelcomeController). Plain form submit (Enter,
 * or the search button) still works with JS disabled/failed — it just posts straight to /search
 * with no suggestions, same as every other search box on the site.
 */
(function () {
    'use strict';

    var form  = document.getElementById('heroSearchForm');
    var input = document.getElementById('heroSearchInput');
    var box   = document.getElementById('heroSearchSuggest');
    if (!form || !input || !box) return;

    var DEBOUNCE_MS = 250;
    var debounceTimer = null;
    var requestSeq = 0;
    var items = [];
    var activeIndex = -1;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function closeSuggest() {
        box.hidden = true;
        box.innerHTML = '';
        items = [];
        activeIndex = -1;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
    }

    function renderEmpty(message) {
        box.innerHTML = '<div class="hvss-empty">' + escapeHtml(message) + '</div>';
        box.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function render(results) {
        items = results;
        activeIndex = -1;
        if (items.length === 0) {
            renderEmpty('No matching quizzes or flashcards.');
            return;
        }
        box.innerHTML = items.map(function (item, i) {
            var icon = item.type === 'Quiz' ? 'fa-bolt' : 'fa-layer-group';
            return (
                '<a href="' + escapeHtml(item.url) + '" class="hvss-item" role="option" id="hvss-opt-' + i + '">' +
                    '<span class="hvss-item-icon"><i class="fa-solid ' + icon + '" aria-hidden="true"></i></span>' +
                    '<span class="hvss-item-text">' +
                        '<span class="hvss-item-name">' + escapeHtml(item.name) + '</span>' +
                        '<span class="hvss-item-meta">' + escapeHtml(item.type) + ' · ' + escapeHtml(item.meta) + '</span>' +
                    '</span>' +
                '</a>'
            );
        }).join('');
        box.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function fetchSuggestions(query) {
        var seq = ++requestSeq;
        fetch('/api/home/search-suggest?q=' + encodeURIComponent(query))
            .then(function (res) { return res.ok ? res.json() : []; })
            .then(function (data) {
                if (seq !== requestSeq) return; // a newer keystroke already superseded this request
                render(Array.isArray(data) ? data : []);
            })
            .catch(function () {
                if (seq !== requestSeq) return;
                closeSuggest();
            });
    }

    input.addEventListener('input', function () {
        var query = input.value.trim();
        clearTimeout(debounceTimer);
        if (query.length < 2) {
            requestSeq++; // invalidate any in-flight request
            closeSuggest();
            return;
        }
        debounceTimer = setTimeout(function () { fetchSuggestions(query); }, DEBOUNCE_MS);
    });

    function setActive(index) {
        var options = box.querySelectorAll('.hvss-item');
        options.forEach(function (el) { el.classList.remove('is-active'); });
        activeIndex = index;
        if (index >= 0 && index < options.length) {
            options[index].classList.add('is-active');
            input.setAttribute('aria-activedescendant', 'hvss-opt-' + index);
            options[index].scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    input.addEventListener('keydown', function (e) {
        if (box.hidden || items.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((activeIndex + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((activeIndex - 1 + items.length) % items.length);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            window.location.href = items[activeIndex].url;
        } else if (e.key === 'Escape') {
            closeSuggest();
        }
    });

    document.addEventListener('click', function (e) {
        if (!form.contains(e.target)) closeSuggest();
    });

    /* ── Typewriter placeholder — cycles through example searches, Google-style,
       so the empty search bar feels alive instead of static. Stops for good the moment the
       visitor focuses or types anything real; only ever touches the `placeholder` attribute,
       never the input's actual value. ── */
    var EXAMPLES = ['Java', 'SQL', 'Spring Boot', 'Kafka', 'System Design', 'React', 'DSA'];
    var PREFIX = 'Search quizzes or flashcards — ';
    var TYPE_MS = 70;
    var DELETE_MS = 35;
    var HOLD_MS = 1400;
    var exampleIndex = 0;
    var typewriterTimer = null;
    var typewriterStopped = false;

    function stopTypewriter() {
        typewriterStopped = true;
        clearTimeout(typewriterTimer);
        input.placeholder = 'Search quizzes or flashcards…';
    }
    input.addEventListener('focus', stopTypewriter, { once: true });
    input.addEventListener('input', stopTypewriter);

    function typewriterStep(text, charIndex, deleting) {
        if (typewriterStopped) return;
        input.placeholder = PREFIX + text.slice(0, charIndex) + (charIndex < text.length && !deleting ? '|' : '');

        if (!deleting && charIndex < text.length) {
            typewriterTimer = setTimeout(function () { typewriterStep(text, charIndex + 1, false); }, TYPE_MS);
        } else if (!deleting) {
            typewriterTimer = setTimeout(function () { typewriterStep(text, charIndex, true); }, HOLD_MS);
        } else if (charIndex > 0) {
            typewriterTimer = setTimeout(function () { typewriterStep(text, charIndex - 1, true); }, DELETE_MS);
        } else {
            exampleIndex = (exampleIndex + 1) % EXAMPLES.length;
            typewriterTimer = setTimeout(function () { typewriterStep(EXAMPLES[exampleIndex], 0, false); }, 200);
        }
    }

    // Respect reduced-motion preferences — just show a plain, non-animated placeholder instead.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        input.placeholder = PREFIX + EXAMPLES[0] + '…';
    } else {
        typewriterStep(EXAMPLES[0], 0, false);
    }
})();
