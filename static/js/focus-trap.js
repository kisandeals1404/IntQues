/**
 * Minimal focus trap for modal dialogs/drawers (quiz/assignment quit-confirm, integrity
 * warnings, mobile question-palette drawer). None of these overlays previously trapped or
 * restored focus, so a keyboard user tabbing through a modal could tab straight into the
 * page behind it, and focus was left wherever it happened to be after the modal closed.
 *
 * Usage:
 *   var release = IntQuesFocusTrap.activate(dialogEl); // call right after opening + focusing
 *   ...
 *   release(); // call right before/while closing — restores focus to the opener
 */
(function (global) {
    'use strict';
    if (global.IntQuesFocusTrap) return; // also loaded site-wide — keep the first copy

    var FOCUSABLE_SELECTOR =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable(container) {
        return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(function (el) { return el.offsetParent !== null; });
    }

    function activate(container) {
        var previouslyFocused = document.activeElement;

        function onKeydown(e) {
            if (e.key !== 'Tab') return;
            var focusable = getFocusable(container);
            if (!focusable.length) return;
            var first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        container.addEventListener('keydown', onKeydown);

        return function release() {
            container.removeEventListener('keydown', onKeydown);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }

    global.IntQuesFocusTrap = { activate: activate };
})(window);
