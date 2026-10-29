/**
 * Header search, the way Amazon / Flipkart do it: a real search box is always in reach instead of
 * a magnifier that leads to a separate page.
 *
 *  - Every `form[data-search-suggest]` (desktop navbar box, phone search bar under the navbar) gets
 *    live course suggestions from /api/home/search-suggest — the same anonymous endpoint the home
 *    hero uses. Plain submit (Enter / the keyboard's Search key) still goes to /search with JS off.
 *  - Phones: while the in-page search bar (#navSearchBar) is on screen the navbar's own magnifier is
 *    redundant, so it hides; once the bar scrolls away under the fixed navbar the magnifier returns
 *    (Flipkart's mobile-web header does the same).
 *  - Tapping an empty box shows recent searches (this browser only) and popular topics, the way
 *    Flipkart / Amazon / Swiggy open their search, instead of nothing until two letters are typed.
 *    Every visit to /search?q= records the term, so header, voice and search-page searches count.
 */
(function () {
    'use strict';

    var DEBOUNCE_MS = 250;
    var RECENT_KEY = 'iq.recentSearches';
    var RECENT_MAX = 5;

    // Recent searches: a per-browser convenience, so storage failures (private mode) just mean none.
    function readRecent() {
        try {
            var v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).slice(0, RECENT_MAX) : [];
        } catch (e) { return []; }
    }
    function writeRecent(list) {
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (e) { /* noop */ }
    }
    function addRecent(term) {
        term = String(term || '').trim().slice(0, 80);
        if (!term) return;
        var low = term.toLowerCase();
        writeRecent([term].concat(readRecent().filter(function (x) { return x.toLowerCase() !== low; })));
    }
    function removeRecent(term) {
        writeRecent(readRecent().filter(function (x) { return x !== term; }));
    }

    var popularPromise = null;
    function loadPopular() {
        if (!popularPromise) {
            popularPromise = fetch('/api/home/search-popular')
                .then(function (res) { return res.ok ? res.json() : []; })
                .then(function (d) { return Array.isArray(d) ? d.slice(0, 8) : []; })
                .catch(function () { popularPromise = null; return []; });
        }
        return popularPromise;
    }

    function searchUrl(term) { return '/search?q=' + encodeURIComponent(term); }

    // The typed run in bold — what the eye scans a suggestion list for (Amazon/Flipkart do this).
    function highlight(name, q) {
        var i = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
        if (i < 0) return escapeHtml(name);
        return escapeHtml(name.slice(0, i)) + '<mark class="iq-suggest-match">' + escapeHtml(name.slice(i, i + q.length)) + '</mark>' + escapeHtml(name.slice(i + q.length));
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function initSuggest(form) {
        var input = form.querySelector('input[name="q"]');
        var box = form.querySelector('.iq-suggest');
        if (!input || !box) return;

        var timer = null;
        var seq = 0;
        var items = [];
        var active = -1;
        var optPrefix = (box.id || 'iqs') + '-opt-';

        function close() {
            box.hidden = true;
            box.innerHTML = '';
            items = [];
            active = -1;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
        }

        function open(html) {
            box.innerHTML = html;
            box.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            // Keep the list above the on-screen keyboard on phones.
            if (window.visualViewport) {
                var r = input.getBoundingClientRect();
                box.style.maxHeight = Math.max(160, window.visualViewport.height - r.bottom - 16) + 'px';
            }
        }

        function render(results) {
            items = results;
            active = -1;
            var q = input.value.trim();
            var seeAll = '<a href="/search?q=' + encodeURIComponent(q) + '" class="iq-suggest-all">' +
                'See all results for &ldquo;' + escapeHtml(q) + '&rdquo; <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>';
            if (!items.length) {
                open('<div class="iq-suggest-empty">No matching quizzes or flashcards.</div>' + seeAll);
                return;
            }
            open(items.map(function (item, i) {
                var icon = item.type === 'Quiz' ? 'fa-bolt' : 'fa-layer-group';
                return '<a href="' + escapeHtml(item.url) + '" class="iq-suggest-item" role="option" id="' + optPrefix + i + '">' +
                    '<span class="iq-suggest-icon"><i class="fa-solid ' + icon + '" aria-hidden="true"></i></span>' +
                    '<span class="iq-suggest-text"><span class="iq-suggest-name">' + highlight(item.name, q) + '</span>' +
                    '<span class="iq-suggest-meta">' + escapeHtml(item.type) + ' &middot; ' + escapeHtml(item.meta || '') + '</span></span></a>';
            }).join('') + seeAll);
        }

        // Empty box: recent searches (removable) then popular topics.
        function renderZeroState() {
            var recent = readRecent();
            loadPopular().then(function (popular) {
                if (input.value.trim() || document.activeElement !== input) return;
                var low = recent.map(function (r) { return r.toLowerCase(); });
                popular = popular.filter(function (p) { return low.indexOf(String(p).toLowerCase()) < 0; });
                if (!recent.length && !popular.length) { close(); return; }
                items = recent.map(function (r) { return { url: searchUrl(r) }; });
                active = -1;
                var html = '';
                if (recent.length) {
                    html += '<div class="iq-suggest-head"><span>Recent searches</span>' +
                        '<button type="button" class="iq-suggest-clear" data-clear-recent>Clear</button></div>' +
                        recent.map(function (r, i) {
                            return '<div class="iq-suggest-recent"><a href="' + escapeHtml(searchUrl(r)) + '" class="iq-suggest-item" role="option" id="' + optPrefix + i + '">' +
                                '<span class="iq-suggest-icon iq-suggest-icon--muted"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i></span>' +
                                '<span class="iq-suggest-text"><span class="iq-suggest-name">' + escapeHtml(r) + '</span></span></a>' +
                                '<button type="button" class="iq-suggest-remove" data-remove-recent="' + escapeHtml(r) + '" aria-label="Remove ' + escapeHtml(r) + ' from recent searches">' +
                                '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>';
                        }).join('');
                }
                if (popular.length) {
                    html += '<div class="iq-suggest-head"><span>Popular on IntQues</span></div><div class="iq-suggest-chips">' +
                        popular.map(function (p) {
                            return '<a href="' + escapeHtml(searchUrl(p)) + '" class="iq-suggest-chip"><i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i>' + escapeHtml(p) + '</a>';
                        }).join('') + '</div>';
                }
                open(html);
            });
        }

        box.addEventListener('click', function (e) {
            var rm = e.target.closest('[data-remove-recent]');
            var clr = e.target.closest('[data-clear-recent]');
            if (!rm && !clr) return;
            e.preventDefault();
            // The re-render below detaches the tapped button before the document's outside-click
            // check runs, which would then see a click "outside" the form and close the panel.
            e.stopPropagation();
            if (rm) removeRecent(rm.getAttribute('data-remove-recent')); else writeRecent([]);
            input.focus();
            renderZeroState();
        });
        // Keep focus in the field while tapping Clear / × so the panel doesn't close under the tap.
        box.addEventListener('mousedown', function (e) {
            if (e.target.closest('[data-remove-recent],[data-clear-recent]')) e.preventDefault();
        });

        input.addEventListener('focus', function () { if (!input.value.trim()) renderZeroState(); });

        function fetchSuggestions(q) {
            var mine = ++seq;
            fetch('/api/home/search-suggest?q=' + encodeURIComponent(q))
                .then(function (res) { return res.ok ? res.json() : []; })
                .then(function (data) { if (mine === seq) render(Array.isArray(data) ? data : []); })
                .catch(function () { if (mine === seq) close(); });
        }

        input.addEventListener('input', function () {
            var q = input.value.trim();
            clearTimeout(timer);
            if (!q) { seq++; renderZeroState(); return; }
            if (q.length < 2) { seq++; close(); return; }
            timer = setTimeout(function () { fetchSuggestions(q); }, DEBOUNCE_MS);
        });

        function setActive(i) {
            var opts = box.querySelectorAll('.iq-suggest-item');
            opts.forEach(function (el) { el.classList.remove('is-active'); });
            active = i;
            if (i >= 0 && i < opts.length) {
                opts[i].classList.add('is-active');
                input.setAttribute('aria-activedescendant', optPrefix + i);
                opts[i].scrollIntoView({ block: 'nearest' });
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        }

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { close(); return; }
            if (box.hidden || !items.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % items.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + items.length) % items.length); }
            else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); window.location.href = items[active].url; }
        });

        // An empty submit would land on a blank results page — focus the box instead.
        form.addEventListener('submit', function (e) {
            if (!input.value.trim()) { e.preventDefault(); input.focus(); }
        });

        document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
    }

    document.querySelectorAll('form[data-search-suggest]').forEach(initSuggest);

    // Any search that reached the results page counts as a recent search.
    if (location.pathname === '/search') {
        var term = new URLSearchParams(location.search).get('q');
        if (term && term.trim()) addRecent(term);
        // The search page's own empty state lists them too (#searchRecent).
        var slot = document.getElementById('searchRecent');
        var recent = readRecent();
        if (slot && recent.length) {
            slot.innerHTML = '<span class="search-popular-label">Recent:</span>' + recent.map(function (r) {
                return '<a href="' + escapeHtml(searchUrl(r)) + '" class="search-popular-chip search-recent-chip"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> ' + escapeHtml(r) + '</a>';
            }).join('');
            slot.hidden = false;
        }
    }

    // Phone search bar ↔ navbar magnifier hand-off.
    var bar = document.getElementById('navSearchBar');
    if (bar && 'IntersectionObserver' in window) {
        var root = document.documentElement;
        var navbar = document.querySelector('.navbar');
        var navH = navbar ? Math.round(navbar.getBoundingClientRect().height) : 60;
        new IntersectionObserver(function (entries) {
            root.classList.toggle('nav-searchbar-visible', entries[0].isIntersecting);
        }, { rootMargin: '-' + navH + 'px 0px 0px 0px', threshold: 0.5 }).observe(bar);
    }
})();
