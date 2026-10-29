/**
 * Voice search, as on Amazon / Flipkart / YouTube: a mic in every search box marked
 * `form[data-voice-search]`. Tap it, speak ("system design", "java script interview"), and the words
 * fill the box as you talk; the search runs on the final result. Uses the browser's own speech
 * recognition in Indian English; where the browser has none (Firefox, some in-app browsers) no mic
 * is shown. Spoken tech names are tidied ("c plus plus" → C++, "sequel" → SQL).
 */
(function () {
    'use strict';
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) return;

    // How people say these, and how the catalog spells them.
    var SPOKEN = [
        [/\bjava ?script\b/gi, 'JavaScript'],
        [/\btype ?script\b/gi, 'TypeScript'],
        [/\bc ?plus ?plus\b/gi, 'C++'],
        [/\bc ?sharp\b/gi, 'C#'],
        [/\bdot ?net\b/gi, '.NET'],
        [/\bnode ?(?:dot ?)?js\b/gi, 'Node.js'],
        [/\breact ?(?:dot ?)?js\b/gi, 'React'],
        // Before plain "sequel", which would otherwise turn "my sequel" into "my SQL".
        [/\bmy ?sequel\b/gi, 'MySQL'],
        [/\bpost ?gres(?: ?sequel)?\b/gi, 'PostgreSQL'],
        [/\bsequel\b/gi, 'SQL'],
        [/\bmongo ?db\b/gi, 'MongoDB'],
        [/\bspring ?boot\b/gi, 'Spring Boot'],
        [/\bd ?s ?a\b/gi, 'DSA'],
        [/\bk ?8 ?s\b|\bkubernetes\b/gi, 'Kubernetes'],
        [/\bdev ?ops\b/gi, 'DevOps']
    ];

    function tidy(text) {
        var t = String(text || '').trim().replace(/[.?!]+$/, '');
        // Longest first: "search" alone would match and leave the "for".
        t = t.replace(/^(search for|search|find|show me)\s+/i, '');
        SPOKEN.forEach(function (p) { t = t.replace(p[0], p[1]); });
        return t;
    }

    var active = null; // the one recogniser running

    function attach(form) {
        var input = form.querySelector('input[name="q"]');
        if (!input || form.querySelector('.iq-voice-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'iq-voice-btn';
        btn.setAttribute('aria-label', 'Search by voice');
        btn.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
        // After the input's top-level box in the form: on the catalog pages the input is wrapped
        // by course-combobox.js, and a mic inside that wrapper stacked under the field.
        var anchor = input;
        while (anchor.parentElement && anchor.parentElement !== form) anchor = anchor.parentElement;
        anchor.insertAdjacentElement('afterend', btn);
        form.classList.add('has-voice');

        var placeholder = input.getAttribute('placeholder') || '';

        function stop() {
            form.classList.remove('is-listening');
            btn.setAttribute('aria-label', 'Search by voice');
            input.setAttribute('placeholder', placeholder);
            if (active && active.form === form) active = null;
        }

        btn.addEventListener('click', function () {
            if (active) {
                var mine = active.form === form;
                try { active.rec.abort(); } catch (e) { /* already stopped */ }
                if (mine) return; // second tap = cancel
            }
            var rec = new Rec();
            rec.lang = 'en-IN';
            rec.interimResults = true;
            rec.maxAlternatives = 1;
            rec.continuous = false;
            var finalText = '';
            active = { rec: rec, form: form };
            form.classList.add('is-listening');
            btn.setAttribute('aria-label', 'Stop listening');
            input.value = '';
            input.setAttribute('placeholder', 'Listening… say a topic, like “System Design”');

            rec.onresult = function (e) {
                var interim = '';
                for (var i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
                    else interim += e.results[i][0].transcript;
                }
                input.value = tidy(finalText + interim);
                // Live suggestions follow the words as they come in.
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };
            rec.onerror = function (e) {
                stop();
                var msg = e.error === 'not-allowed' || e.error === 'service-not-allowed'
                    ? 'Allow microphone access to search by voice.'
                    : e.error === 'no-speech' ? 'Didn’t catch that — tap the mic and try again.'
                    : e.error === 'network' ? 'Voice search needs an internet connection.' : null;
                if (msg && window.IqToast) window.IqToast.show(msg, 'info');
            };
            rec.onend = function () {
                var q = tidy(finalText) || input.value.trim();
                stop();
                if (!q) return;
                input.value = q;
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.submit();
            };
            try {
                rec.start();
            } catch (e) {
                stop();
            }
        });
    }

    function init() {
        document.querySelectorAll('form[data-voice-search]').forEach(attach);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.IntQuesVoiceSearch = { tidy: tidy };
})();
