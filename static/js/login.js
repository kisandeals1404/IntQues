(function () {
    'use strict';

    var form = document.getElementById('loginForm');
    if (!form) return;

    var state = { userId: null, email: '' };

    var els = {
        step1: document.getElementById('loginStep1'),
        step2: document.getElementById('loginStep2'),
        email: document.getElementById('loginEmail'),
        sendBtn: document.getElementById('sendLoginOtpBtn'),
        otpHint: document.getElementById('loginOtpHint'),
        otp: document.getElementById('loginOtp'),
        verifyBtn: document.getElementById('verifyLoginOtpBtn'),
        backBtn: document.getElementById('backToLoginEmailBtn'),
        message: document.getElementById('loginMessage'),
        sendLoginLoader: document.getElementById('sendLoginLoader'),
        verifyLoginLoader: document.getElementById('verifyLoginLoader')
    };

    var toastTimer = null;

    function setInvalid(el, invalid) {
        if (!el) return;
        el.classList.toggle('is-invalid', !!invalid);
        el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function toast(text, type) {
        if (!els.message) return;
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
        }, 5000);
    }

    if (els.email) {
        els.email.addEventListener('input', function () {
            var currentEmail = (els.email.value || '').trim();
            if (!currentEmail || isValidEmail(currentEmail)) {
                setInvalid(els.email, false);
            }
        });
    }

    function postJson(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) throw new Error(json.message || 'Request failed.');
                return json;
            });
        });
    }

    function showLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = false;
    }

    function hideLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = true;
    }

    function showStep1() {
        if (els.step1) els.step1.hidden = false;
        if (els.step2) els.step2.hidden = true;
        if (els.otp) els.otp.value = '';
    }

    function showStep2() {
        if (els.step1) els.step1.hidden = true;
        if (els.step2) els.step2.hidden = false;
        if (els.otpHint) {
            els.otpHint.textContent = 'Enter the OTP sent to ' + state.email + '.';
        }
        if (els.otp) els.otp.focus();
    }

    els.sendBtn.addEventListener('click', function () {
        var email = (els.email.value || '').trim();
        if (!email) {
            setInvalid(els.email, true);
            toast('Please enter your email.', 'error');
            els.email.focus();
            return;
        }

        if (!isValidEmail(email)) {
            setInvalid(els.email, true);
            toast('Please enter a valid email address.', 'error');
            els.email.focus();
            return;
        }

        setInvalid(els.email, false);

        els.sendBtn.disabled = true;
        showLoader(els.sendLoginLoader);
        postJson('/api/auth/login/start', { email: email })
            .then(function (res) {
                state.userId = res.userId;
                state.email = email;
                showStep2();
                toast('Login OTP sent to your email.', 'success');
            })
            .catch(function (err) {
                toast(err.message, 'error');
            })
            .finally(function () {
                els.sendBtn.disabled = false;
                hideLoader(els.sendLoginLoader);
            });
    });

    els.verifyBtn.addEventListener('click', function () {
        if (!state.userId) {
            toast('Please request OTP first.', 'error');
            return;
        }

        els.verifyBtn.disabled = true;
        showLoader(els.verifyLoginLoader);
        postJson('/api/auth/login/verify', {
            userId: state.userId,
            otp: (els.otp.value || '').trim()
        }).then(function () {
            toast('Login successful. Redirecting...', 'success');
            window.location.href = '/enroll';
        }).catch(function (err) {
            toast(err.message, 'error');
        }).finally(function () {
            els.verifyBtn.disabled = false;
            hideLoader(els.verifyLoginLoader);
        });
    });

    els.backBtn.addEventListener('click', function () {
        showStep1();
        if (els.email) els.email.focus();
    });
})();

