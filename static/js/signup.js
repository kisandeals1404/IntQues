(function () {
    'use strict';

    var form = document.getElementById('signupForm');
    if (!form) return;

    var state = {
        userId: null,
        emailVerified: false,
        mobileVerified: false,
    };

    var els = {
        // Step 1 elements
        step1: document.getElementById('signupStep1'),
        step2: document.getElementById('signupStep2'),
        firstName: document.getElementById('firstName'),
        lastName: document.getElementById('lastName'),
        email: document.getElementById('email'),
        mobile: document.getElementById('mobile'),
        startBtn: document.getElementById('startSignupBtn'),
        message: document.getElementById('signupMessage'),
        step1Loader: document.getElementById('step1Loader'),
        // Step 2 elements
        emailOtp: document.getElementById('signupEmailOtp'),
        mobileOtp: document.getElementById('signupMobileOtp'),
        verifyEmailBtn: document.getElementById('verifySignupEmailBtn'),
        verifyMobileBtn: document.getElementById('verifySignupMobileBtn'),
        resendEmailBtn: document.getElementById('resendSignupEmailBtn'),
        resendMobileBtn: document.getElementById('resendSignupMobileBtn'),
        emailBadge: document.getElementById('signupEmailBadge'),
        mobileBadge: document.getElementById('signupMobileBadge'),
        goToLoginBtn: document.getElementById('goToLoginBtn'),
        backToSignupBtn: document.getElementById('backToSignupBtn'),
        message2: document.getElementById('signupMessage2'),
        // Loaders
        emailOtpLoader: document.getElementById('emailOtpLoader'),
        mobileOtpLoader: document.getElementById('mobileOtpLoader'),
        resendEmailLoader: document.getElementById('resendEmailLoader'),
        resendMobileLoader: document.getElementById('resendMobileLoader')
    };

    var toastTimer = null;

    function toast(text, type, step) {
        var msgEl = step === 2 ? els.message2 : els.message;
        if (!msgEl) return;
        if (toastTimer) {
            window.clearTimeout(toastTimer);
            toastTimer = null;
        }
        if (!text) {
            msgEl.textContent = '';
            msgEl.classList.remove('error', 'success', 'info', 'is-visible');
            return;
        }
        msgEl.textContent = text;
        msgEl.classList.remove('error', 'success', 'info');
        msgEl.classList.add(type || 'info');
        msgEl.classList.add('is-visible');
        toastTimer = window.setTimeout(function () {
            msgEl.classList.remove('is-visible');
        }, 5000);
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

    function updateVerificationState() {
        els.emailBadge.textContent = state.emailVerified ? 'Verified' : 'Pending';
        els.mobileBadge.textContent = state.mobileVerified ? 'Verified' : 'Pending';
        els.emailBadge.classList.toggle('verified', state.emailVerified);
        els.mobileBadge.classList.toggle('verified', state.mobileVerified);
        els.verifyEmailBtn.disabled = state.emailVerified;
        els.verifyMobileBtn.disabled = state.mobileVerified;
        els.goToLoginBtn.disabled = !(state.emailVerified && state.mobileVerified);
    }

    function clearValidation() {
        [els.firstName, els.lastName, els.email, els.mobile].forEach(function (el) {
            el.classList.remove('is-invalid');
        });
    }

    function validateEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validateMobile(mobile) {
        var re = /^\d{10}$/;
        return re.test(mobile);
    }

    function requiredPayload() {
        return {
            firstName: (els.firstName.value || '').trim(),
            lastName: (els.lastName.value || '').trim(),
            email: (els.email.value || '').trim(),
            mobile: (els.mobile.value || '').trim()
        };
    }

    function showStep1() {
        els.step1.hidden = false;
        els.step2.hidden = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showStep2() {
        els.step1.hidden = true;
        els.step2.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = false;
    }

    function hideLoader(loaderEl) {
        if (loaderEl) loaderEl.hidden = true;
    }

    els.startBtn.addEventListener('click', function () {
        clearValidation();
        var payload = requiredPayload();
        var errors = [];

        if (!payload.firstName) {
            els.firstName.classList.add('is-invalid');
            errors.push('First name is required');
        }
        if (!payload.lastName) {
            els.lastName.classList.add('is-invalid');
            errors.push('Last name is required');
        }
        if (!payload.email) {
            els.email.classList.add('is-invalid');
            errors.push('Email is required');
        } else if (!validateEmail(payload.email)) {
            els.email.classList.add('is-invalid');
            errors.push('Please enter a valid email address');
        }
        if (!payload.mobile) {
            els.mobile.classList.add('is-invalid');
            errors.push('Mobile number is required');
        } else if (!validateMobile(payload.mobile)) {
            els.mobile.classList.add('is-invalid');
            errors.push('Mobile number must be 10 digits');
        }

        if (errors.length > 0) {
            toast(errors[0], 'error', 1);
            return;
        }

        els.startBtn.disabled = true;
        showLoader(els.step1Loader);
        postJson('/api/auth/signup/start', payload)
            .then(function (res) {
                state.userId = res.userId;
                state.emailVerified = false;
                state.mobileVerified = false;
                updateVerificationState();
                showStep2();
                toast('Signup OTPs sent. Verify both email and mobile.', 'success', 2);
            })
            .catch(function (err) {
                toast(err.message, 'error', 1);
            })
            .finally(function () {
                els.startBtn.disabled = false;
                hideLoader(els.step1Loader);
            });
    });

    els.verifyEmailBtn.addEventListener('click', function () {
        if (!state.userId) {
            toast('Please start signup first.', 'error', 2);
            return;
        }
        els.verifyEmailBtn.disabled = true;
        showLoader(els.emailOtpLoader);
        postJson('/api/auth/signup/verify', {
            userId: state.userId,
            channel: 'email',
            otp: (els.emailOtp.value || '').trim()
        }).then(function (res) {
            state.emailVerified = !!res.emailVerified;
            state.mobileVerified = !!res.mobileVerified;
            updateVerificationState();
            toast('Email verified successfully.', 'success', 2);
        }).catch(function (err) {
            toast(err.message, 'error', 2);
        }).finally(function () {
            els.verifyEmailBtn.disabled = false;
            hideLoader(els.emailOtpLoader);
        });
    });

    els.verifyMobileBtn.addEventListener('click', function () {
        if (!state.userId) {
            toast('Please start signup first.', 'error', 2);
            return;
        }
        els.verifyMobileBtn.disabled = true;
        showLoader(els.mobileOtpLoader);
        postJson('/api/auth/signup/verify', {
            userId: state.userId,
            channel: 'mobile',
            otp: (els.mobileOtp.value || '').trim()
        }).then(function (res) {
            state.emailVerified = !!res.emailVerified;
            state.mobileVerified = !!res.mobileVerified;
            updateVerificationState();
            toast('Mobile verified successfully.', 'success', 2);
        }).catch(function (err) {
            toast(err.message, 'error', 2);
        }).finally(function () {
            els.verifyMobileBtn.disabled = false;
            hideLoader(els.mobileOtpLoader);
        });
    });

    els.resendEmailBtn.addEventListener('click', function () {
        if (!state.userId) {
            toast('Please start signup first.', 'error', 2);
            return;
        }

        els.resendEmailBtn.disabled = true;
        showLoader(els.resendEmailLoader);
        postJson('/api/auth/signup/resend', {
            userId: state.userId,
            channel: 'email'
        }).then(function () {
            toast('Email OTP resent.', 'success', 2);
        }).catch(function (err) {
            toast(err.message, 'error', 2);
        }).finally(function () {
            els.resendEmailBtn.disabled = false;
            hideLoader(els.resendEmailLoader);
        });
    });

    els.resendMobileBtn.addEventListener('click', function () {
        if (!state.userId) {
            toast('Please start signup first.', 'error', 2);
            return;
        }

        els.resendMobileBtn.disabled = true;
        showLoader(els.resendMobileLoader);
        postJson('/api/auth/signup/resend', {
            userId: state.userId,
            channel: 'mobile'
        }).then(function () {
            toast('Mobile OTP resent.', 'success', 2);
        }).catch(function (err) {
            toast(err.message, 'error', 2);
        }).finally(function () {
            els.resendMobileBtn.disabled = false;
            hideLoader(els.resendMobileLoader);
        });
    });

    els.goToLoginBtn.addEventListener('click', function () {
        window.location.href = '/login';
    });

    els.backToSignupBtn.addEventListener('click', function () {
        // Clear OTP inputs when going back
        els.emailOtp.value = '';
        els.mobileOtp.value = '';
        toast('', '', 2);
        showStep1();
    });
})();

