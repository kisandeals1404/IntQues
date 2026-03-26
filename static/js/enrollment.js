(function () {
    'use strict';

    var form = document.getElementById('enrollmentForm');
    if (!form) {
        return;
    }

    var els = {
        course: document.getElementById('course'),
        batch: document.getElementById('batch'),
        submitBtn: document.getElementById('submitEnrollmentBtn'),
        message: document.getElementById('enrollMessage'),
        enrollmentLoader: document.getElementById('enrollmentLoader'),
    };

    var toastTimer = null;

    var requiredFields = [
        els.course,
        els.batch,
    ];

    function showMessage(text, type) {
        if (!els.message) {
            return;
        }

        if (toastTimer) {
            window.clearTimeout(toastTimer);
            toastTimer = null;
        }

        if (!text) {
            els.message.textContent = '';
            els.message.classList.remove('error', 'success', 'info', 'is-visible');
            return;
        }

        els.message.textContent = text;
        els.message.classList.remove('error', 'success', 'info');
        els.message.classList.add(type || 'info');
        els.message.classList.add('is-visible');

        toastTimer = window.setTimeout(function () {
            els.message.classList.remove('is-visible');
            window.setTimeout(function () {
                els.message.textContent = '';
                els.message.classList.remove('error', 'success', 'info');
            }, 220);
        }, 5000);
    }

    function setInvalid(el, invalid) {
        if (!el) {
            return;
        }
        el.classList.toggle('is-invalid', !!invalid);
        if (invalid) {
            el.setAttribute('aria-invalid', 'true');
        } else {
            el.removeAttribute('aria-invalid');
        }
    }

    function clearFieldErrors() {
        requiredFields.forEach(function (field) {
            setInvalid(field, false);
        });
    }

    function payload() {
        return {
            course: els.course.value,
            batch: els.batch.value,
        };
    }

    function basicValidate(data) {
        var hasError = false;

        requiredFields.forEach(function (field) {
            var valid = typeof field.checkValidity === 'function' ? field.checkValidity() : !!field.value;
            setInvalid(field, !valid);
            if (!valid && !hasError) {
                hasError = true;
            }
        });

        if (hasError) {
            showMessage('Please select both course and batch.', 'error');
            return false;
        }
        return true;
    }


    function showLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = false;
    }

    function hideLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = true;
    }

    function postJson(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) {
                    throw new Error(json.message || 'Request failed.');
                }
                return json;
            });
        });
    }

    els.submitBtn.addEventListener('click', function () {
        var data = payload();
        if (!basicValidate(data)) {
            return;
        }

        els.submitBtn.disabled = true;
        showLoader(els.enrollmentLoader);
        clearFieldErrors();
        showMessage('Completing your enrollment...', 'info');

        postJson('/api/enrollments', data)
            .then(function () {
                showMessage('Enrollment completed. Redirecting...', 'success');
                window.location.href = '/enrollment-success';
            })
            .catch(function (err) {
                showMessage(err.message, 'error');
                els.submitBtn.disabled = false;
                hideLoader(els.enrollmentLoader);
            })
            .finally(function () {
                // keep success flow redirecting; only reset button on failure
            });
    });

    requiredFields.forEach(function (field) {
        if (!field) {
            return;
        }

        field.addEventListener('input', function () {
            setInvalid(field, false);
        });

        field.addEventListener('change', function () {
            setInvalid(field, false);
        });
    });
})();

