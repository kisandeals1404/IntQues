/**
 * IntQues — Countdown Timer
 *
 * Renders a live D : H : M : S digit-box countdown (New-Year style)
 * for every [data-start-ts] element, ticking every second.
 *
 * data-start-ts  Unix epoch milliseconds (UTC) of the session start time.
 * data-urgency   Auto-set: "normal" >24h | "soon" 1–24h | "urgent" <1h | "ended"
 * data-long      Present on detail page → adds "Session starts in" label above boxes.
 */
(function () {
    'use strict';

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function urgency(ms) {
        if (ms < 3600000)  return 'urgent';
        if (ms < 86400000) return 'soon';
        return 'normal';
    }

    /** Build 4-segment array: days / hrs / min / sec */
    function segsOf(ms) {
        var d = Math.floor(ms / 86400000);
        var h = Math.floor((ms % 86400000) / 3600000);
        var m = Math.floor((ms % 3600000)  / 60000);
        var s = Math.floor((ms % 60000)    / 1000);
        return [
            { n: pad(d), l: 'days' },
            { n: pad(h), l: 'hrs'  },
            { n: pad(m), l: 'min'  },
            { n: pad(s), l: 'sec'  }
        ];
    }

    /** Render D:H:M:S boxes as an HTML string. */
    function renderBoxes(segs, long) {
        var html = long
            ? '<span class="cd-label">Session starts in</span>'
            : '';
        html += '<span class="cd-blocks">';
        segs.forEach(function (s, i) {
            if (i) html += '<span class="cd-sep" aria-hidden="true">:</span>';
            html += '<span class="cd-seg">'
                  +   '<b class="cd-num">' + s.n + '</b>'
                  +   '<span class="cd-lbl">' + s.l + '</span>'
                  + '</span>';
        });
        html += '</span>';
        return html;
    }

    /** IST time string for admin table cells. */
    function toIST(ms) {
        try {
            return new Date(ms).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit', minute: '2-digit', hour12: true,
                day: 'numeric',  month: 'short'
            });
        } catch (e) { return ''; }
    }

    /** Disables an enroll anchor and labels it "Session Ended". */
    function disableBtn(btn) {
        btn.setAttribute('href', 'javascript:void(0)');
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('btn-session-ended');
        btn.textContent = 'Session Ended';
    }

    /** Called once per item when it expires. Dims the card; kills enroll button(s). */
    function expire(el) {
        var card = el.closest('.of-card, .ep-card, .pop-card, article, .od-hero');
        if (!card || card.classList.contains('is-expired')) return;
        card.classList.add('is-expired');

        if (el.hasAttribute('data-long')) {
            // Detail page — disable both hero + bottom-CTA buttons
            document.querySelectorAll('.od-btn-enroll, .od-btn-enroll-lg').forEach(disableBtn);
        } else {
            // Listing card — only this card's button
            card.querySelectorAll('.of-btn-enroll, .pop-btn-enroll').forEach(disableBtn);
        }
    }

    var items  = [];
    var handle = null;

    function tick() {
        var now      = Date.now();
        var anyAlive = false;

        items.forEach(function (item) {
            if (item.done) return;

            var diff = item.ts - now;

            if (diff > 0) {
                item.el.innerHTML       = renderBoxes(segsOf(diff), item.long);
                item.el.dataset.urgency = urgency(diff);
                item.el.hidden          = false;
                anyAlive = true;
            } else {
                /* Session has started — show a compact "Ended" pill */
                item.el.innerHTML       = '';          // clear boxes
                item.el.textContent     = 'Ended';
                item.el.dataset.urgency = 'ended';
                item.el.hidden          = false;
                item.done               = true;
                expire(item.el);
            }
        });

        if (!anyAlive && handle) { clearInterval(handle); handle = null; }
    }

    document.addEventListener('DOMContentLoaded', function () {

        document.querySelectorAll('[data-start-ts]').forEach(function (el) {
            if (el.tagName === 'SMALL') return;
            var ts = parseInt(el.dataset.startTs, 10);
            if (!ts || ts <= 0) return;
            items.push({ el: el, ts: ts, long: el.hasAttribute('data-long'), done: false });
        });

        // Admin table — show readable IST datetime
        document.querySelectorAll('small[data-start-ts]').forEach(function (el) {
            var ts = parseInt(el.dataset.startTs, 10);
            if (ts) el.textContent = toIST(ts) + ' IST';
        });

        if (!items.length) return;
        tick();
        handle = setInterval(tick, 1000);
    });
})();
