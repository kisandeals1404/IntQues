/* Site-wide form validation feedback: red fields + a toast, instead of the browser's default
 * (inconsistent-looking, easy-to-miss) native validation bubble.
 *
 * Works with ZERO per-page wiring for any real <form> with a native submit button/Enter key —
 * the browser's own submission algorithm runs interactive validation and fires one `invalid`
 * event per invalid control BEFORE the `submit` event itself ever fires (and blocks `submit`
 * entirely if anything's invalid), so this single document-level capture listener sees every
 * one of them regardless of what a page's own submit handler does.
 *
 * For a button that triggers a fetch() directly (no real form submission — e.g. some AJAX-only
 * flows), native `invalid` never fires on its own; call window.IqFormValidation.reportValidity(form)
 * from that click handler to get the same red-fields + toast treatment on demand.
 */
(function () {
    'use strict';

    var pendingForms = new WeakMap(); // form -> {fields: [], scheduled: bool}

    function cleanLabelText(labelEl) {
        var clone = labelEl.cloneNode(true);
        // Strip a trailing "(optional)"/help-text span some labels carry, and any bare
        // required-marker asterisk, so "Course title (optional)" doesn't turn into
        // "Course title (optional) is required." — just the label text itself.
        clone.querySelectorAll('.asn-hint, .visually-hidden').forEach(function (n) { n.remove(); });
        return clone.textContent.trim().replace(/\s*\*\s*$/, '');
    }

    // "amountRupees" -> "Amount Rupees", "student_group_ids" -> "Student Group Ids" — a last
    // resort for a field with no real label at all, so the message at least reads as English
    // instead of a raw HTML attribute.
    function humanizeName(name) {
        return name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .trim()
            .replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
    }

    function fieldLabel(field) {
        if (field.labels && field.labels.length) {
            var text = cleanLabelText(field.labels[0]);
            if (text) return text;
        }
        // Some hand-rolled compact forms (e.g. repeated per-row edit forms, where a shared id
        // would collide across rows) place a plain <label> right before the field with no
        // for/id link at all — not associated per field.labels, but still the real, intended
        // caption a person would read. Good enough for a validation message even though it
        // isn't a substitute for proper for/id association (which screen readers still need).
        var prev = field.previousElementSibling;
        if (prev && prev.tagName === 'LABEL') {
            var prevText = cleanLabelText(prev);
            if (prevText) return prevText;
        }
        if (field.getAttribute('placeholder')) return field.getAttribute('placeholder');
        if (field.name) return humanizeName(field.name);
        return 'This field';
    }

    // A friendly, field-specific message beats the browser's own generic validationMessage
    // ("Please fill out this field.") for the by-far most common case — an empty required
    // field — which is exactly what a user reported seeing and asked why it wasn't nicer.
    // Falls back to the native message for anything more specific (pattern/format/range),
    // since those are usually already more informative than a generic label-based guess.
    function fieldMessage(field) {
        var label = fieldLabel(field);
        var validity = field.validity;
        if (validity && validity.valueMissing) return label + ' is required.';
        if (validity && validity.typeMismatch && field.type === 'email') return 'Enter a valid email address for ' + label + '.';
        if (validity && validity.tooShort) return label + ' is too short.';
        if (validity && validity.tooLong) return label + ' is too long.';
        if (validity && (validity.rangeUnderflow || validity.rangeOverflow)) return label + ' is out of range.';
        return field.validationMessage || (label + ' is invalid.');
    }

    function markInvalid(field) {
        field.classList.add('is-invalid');
        var existing = field.parentElement && field.parentElement.querySelector(':scope > .iq-field-error[data-for="' + field.id + '"]');
        if (field.id && !existing && field.parentElement) {
            var msg = document.createElement('span');
            msg.className = 'iq-field-error';
            msg.setAttribute('data-for', field.id);
            msg.textContent = fieldMessage(field);
            field.insertAdjacentElement('afterend', msg);
        }
    }

    function clearInvalid(field) {
        field.classList.remove('is-invalid');
        if (field.id) {
            var msg = field.parentElement && field.parentElement.querySelector(':scope > .iq-field-error[data-for="' + field.id + '"]');
            if (msg) msg.remove();
        }
    }

    function flush(form) {
        var entry = pendingForms.get(form);
        if (!entry || !entry.fields.length) return;
        pendingForms.delete(form);

        var fields = entry.fields;
        fields.forEach(markInvalid);

        var message = fields.length === 1
            ? fieldMessage(fields[0])
            : 'Please fix ' + fields.length + ' fields and try again.';
        if (window.IqToast) window.IqToast.show(message, 'error');

        var first = fields[0];
        if (first && typeof first.focus === 'function') {
            try { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* noop */ }
            first.focus({ preventScroll: true });
        }
    }

    document.addEventListener('invalid', function (e) {
        var field = e.target;
        if (!field.form) return;
        e.preventDefault(); // suppress the native bubble — we show our own feedback instead

        var entry = pendingForms.get(field.form);
        if (!entry) {
            entry = { fields: [], scheduled: false };
            pendingForms.set(field.form, entry);
        }
        entry.fields.push(field);
        if (!entry.scheduled) {
            entry.scheduled = true;
            setTimeout(function () { flush(field.form); }, 0);
        }
    }, true); // capture — `invalid` does not bubble

    // Clear the red state as soon as the field is fixed.
    document.addEventListener('input', function (e) {
        var field = e.target;
        if (field.classList && field.classList.contains('is-invalid') && field.checkValidity && field.checkValidity()) {
            clearInvalid(field);
        }
    }, true);
    document.addEventListener('change', function (e) {
        var field = e.target;
        if (field.classList && field.classList.contains('is-invalid') && field.checkValidity && field.checkValidity()) {
            clearInvalid(field);
        }
    }, true);

    window.IqFormValidation = {
        // For AJAX-only buttons that never trigger a native form submission. Returns whether
        // the form is valid; shows the same red-fields + toast feedback when it isn't.
        reportValidity: function (form) {
            if (!form || form.checkValidity()) return true;
            form.reportValidity();
            return false;
        }
    };
})();
