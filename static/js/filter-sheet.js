/**
 * Full-screen filters on phones, the Amazon / Flipkart way: a "Filters" button with a count of
 * what's applied, removable chips for each active filter, and a full-screen sheet with the facet
 * list on the left and its options on the right, "Clear all" in the header and "Apply" in a sticky
 * footer. Desktop keeps the form's inline <select>s (design-patterns.css hides one or the other).
 *
 * Markup contract — any GET filter form:
 *   <form method="get" data-filter-sheet [data-result-count="42" data-result-noun="result"]>
 *     <select name="mode" data-facet="Mode"> <option value="">All</option> ... </select>
 *   The first <option> of each facet is its "no filter" default.
 *
 * Phone back button closes the sheet instead of leaving the page (a history entry is pushed on
 * open), since that's how Android users dismiss any full-screen panel.
 */
(function () {
    'use strict';

    var uid = 0;

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function defaultValue(select) {
        return select.options.length ? select.options[0].value : '';
    }

    function submit(form) {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
    }

    function init(form) {
        var selects = Array.prototype.slice.call(form.querySelectorAll('select[data-facet]'));
        if (!selects.length) return;
        var id = 'fs' + (++uid);
        form.classList.add('fs-enhanced');

        function activeSelects() {
            return selects.filter(function (s) { return s.value !== defaultValue(s); });
        }

        // ── Trigger bar + applied chips (phones) ──
        var bar = el('div', 'fs-bar');
        var trigger = el('button', 'fs-trigger');
        trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', id);
        trigger.innerHTML = '<i class="fa-solid fa-sliders" aria-hidden="true"></i> <span>Filters</span>';
        var badge = el('span', 'fs-trigger-count');
        trigger.appendChild(badge);
        bar.appendChild(trigger);
        var chips = el('div', 'fs-chips');
        chips.setAttribute('aria-label', 'Applied filters');
        bar.appendChild(chips);
        form.appendChild(bar);

        function renderChips() {
            var active = activeSelects();
            badge.textContent = active.length ? String(active.length) : '';
            badge.hidden = !active.length;
            trigger.setAttribute('aria-label', active.length ? 'Filters, ' + active.length + ' applied' : 'Filters');
            chips.innerHTML = '';
            active.forEach(function (s) {
                var chip = el('button', 'fs-chip');
                chip.type = 'button';
                var text = s.options[s.selectedIndex].text;
                chip.innerHTML = '<span></span><i class="fa-solid fa-xmark" aria-hidden="true"></i>';
                chip.firstChild.textContent = text;
                chip.setAttribute('aria-label', 'Remove filter: ' + s.getAttribute('data-facet') + ' ' + text);
                chip.addEventListener('click', function () {
                    s.value = defaultValue(s);
                    submit(form);
                });
                chips.appendChild(chip);
            });
        }
        renderChips();

        // The form's own "Clear" link joins the chip row on phones (design-patterns.css hides the
        // original there), so clearing everything stays one tap without a full-width button.
        var clearLink = form.querySelector('.admin-search-clear, [data-filter-clear]');
        if (clearLink) {
            var clearChip = clearLink.cloneNode(true);
            clearChip.className = 'fs-chip fs-chip--clear';
            clearChip.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> <span>Clear all</span>';
            chips.appendChild(clearChip);
        }

        // ── Sheet ──
        var sheet = el('div', 'fs-sheet');
        sheet.id = id;
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-labelledby', id + '-title');
        sheet.hidden = true;
        if (selects.length === 1) sheet.classList.add('fs-sheet--single');

        var head = el('div', 'fs-head');
        var closeBtn = el('button', 'fs-close');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close filters');
        closeBtn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
        var title = el('h2', 'fs-title', 'Filters');
        title.id = id + '-title';
        var clearBtn = el('button', 'fs-clear', 'Clear all');
        clearBtn.type = 'button';
        head.appendChild(closeBtn);
        head.appendChild(title);
        head.appendChild(clearBtn);

        var body = el('div', 'fs-body');
        var rail = el('div', 'fs-rail');
        rail.setAttribute('role', 'tablist');
        rail.setAttribute('aria-orientation', 'vertical');
        rail.setAttribute('aria-label', 'Filter categories');
        var panels = el('div', 'fs-panels');
        body.appendChild(rail);
        body.appendChild(panels);

        var tabs = [];
        var groups = [];
        selects.forEach(function (s, i) {
            var label = s.getAttribute('data-facet');
            var tab = el('button', 'fs-tab');
            tab.type = 'button';
            tab.id = id + '-tab' + i;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', id + '-panel' + i);
            tab.innerHTML = '<span></span><span class="fs-tab-dot" aria-hidden="true"></span>';
            tab.firstChild.textContent = label;
            tab.addEventListener('click', function () { selectTab(i); });
            tab.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown') { e.preventDefault(); selectTab((i + 1) % tabs.length, true); }
                if (e.key === 'ArrowUp') { e.preventDefault(); selectTab((i - 1 + tabs.length) % tabs.length, true); }
            });
            rail.appendChild(tab);
            tabs.push(tab);

            var panel = el('fieldset', 'fs-panel');
            panel.id = id + '-panel' + i;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', tab.id);
            var legend = el('legend', 'fs-panel-title', label);
            panel.appendChild(legend);
            Array.prototype.forEach.call(s.options, function (opt) {
                var row = el('label', 'fs-opt');
                var radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = id + '-' + s.name;
                radio.value = opt.value;
                radio.addEventListener('change', refreshDots);
                var txt = el('span', 'fs-opt-text', opt.text);
                row.appendChild(radio);
                row.appendChild(txt);
                panel.appendChild(row);
            });
            panels.appendChild(panel);
            groups.push(panel);
        });

        var foot = el('div', 'fs-foot');
        var count = el('span', 'fs-foot-count');
        var total = form.getAttribute('data-result-count');
        if (total != null && total !== '') {
            var noun = form.getAttribute('data-result-noun') || 'result';
            count.textContent = Number(total).toLocaleString('en-IN') + ' ' + noun + (total === '1' ? '' : 's') + ' now';
        }
        var applyBtn = el('button', 'fs-apply', 'Apply');
        applyBtn.type = 'button';
        foot.appendChild(count);
        foot.appendChild(applyBtn);

        sheet.appendChild(head);
        sheet.appendChild(body);
        sheet.appendChild(foot);
        document.body.appendChild(sheet);

        function radioFor(i, value) {
            return groups[i].querySelector('input[value="' + (window.CSS && CSS.escape ? CSS.escape(value) : value) + '"]');
        }

        function draftValue(i) {
            var checked = groups[i].querySelector('input:checked');
            return checked ? checked.value : defaultValue(selects[i]);
        }

        function refreshDots() {
            tabs.forEach(function (t, i) {
                t.classList.toggle('has-value', draftValue(i) !== defaultValue(selects[i]));
            });
            clearBtn.disabled = !tabs.some(function (t) { return t.classList.contains('has-value'); });
        }

        function selectTab(i, focus) {
            tabs.forEach(function (t, j) {
                t.setAttribute('aria-selected', String(i === j));
                t.tabIndex = i === j ? 0 : -1;
                groups[j].hidden = i !== j && selects.length > 1;
            });
            if (focus) tabs[i].focus();
        }

        var release = null;
        var pushed = false;

        function open() {
            selects.forEach(function (s, i) {
                var r = radioFor(i, s.value);
                if (r) r.checked = true;
            });
            refreshDots();
            // Open on the first facet that has a filter applied, else the first.
            var first = selects.findIndex(function (s) { return s.value !== defaultValue(s); });
            selectTab(first < 0 ? 0 : first);
            sheet.hidden = false;
            document.documentElement.classList.add('fs-open');
            trigger.setAttribute('aria-expanded', 'true');
            closeBtn.focus();
            if (window.IntQuesFocusTrap) release = window.IntQuesFocusTrap.activate(sheet);
            try { history.pushState({ fsSheet: id }, ''); pushed = true; } catch (e) { pushed = false; }
        }

        function close(fromPopstate) {
            if (sheet.hidden) return;
            sheet.hidden = true;
            document.documentElement.classList.remove('fs-open');
            trigger.setAttribute('aria-expanded', 'false');
            if (release) { release(); release = null; } else trigger.focus();
            if (pushed && !fromPopstate) history.back();
            pushed = false;
        }

        var submitAfterBack = false;

        trigger.addEventListener('click', open);
        closeBtn.addEventListener('click', function () { close(false); });
        sheet.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(false); });
        window.addEventListener('popstate', function () {
            close(true);
            if (submitAfterBack) { submitAfterBack = false; submit(form); }
        });

        clearBtn.addEventListener('click', function () {
            selects.forEach(function (s, i) {
                var r = radioFor(i, defaultValue(s));
                if (r) r.checked = true;
            });
            refreshDots();
        });

        applyBtn.addEventListener('click', function () {
            var changed = false;
            selects.forEach(function (s, i) {
                var v = draftValue(i);
                if (s.value !== v) { s.value = v; changed = true; }
            });
            if (!changed) { close(false); return; }
            // Pop the sheet's history entry first and submit once that lands — submitting straight
            // away would leave a duplicate of this page behind the results in Back history.
            if (pushed) { submitAfterBack = true; history.back(); }
            else { close(true); submit(form); }
        });
    }

    document.querySelectorAll('form[data-filter-sheet]').forEach(init);
})();
