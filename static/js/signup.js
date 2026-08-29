(function () {
    'use strict';

    var form = document.getElementById('signupForm');
    if (!form) return;

    var state = {
        userId: null,
        emailVerified: false,
        completing: false,
        accountType: 'INDIVIDUAL',
    };

    var FREE_EMAIL_DOMAINS = [
        'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
        'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com',
        'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'mail.com', 'gmx.com',
        'rediffmail.com', 'yandex.com', 'yandex.ru', 'zoho.com'
    ];

    function isFreeEmailDomain(email) {
        var at = (email || '').lastIndexOf('@');
        if (at < 0) return true;
        var domain = email.slice(at + 1).trim().toLowerCase();
        return FREE_EMAIL_DOMAINS.indexOf(domain) !== -1;
    }

    function el(id) { return document.getElementById(id); }

    var els = {
        step1:            el('signupStep1'),
        step2:            el('signupStep2'),
        firstName:        el('firstName'),
        lastName:         el('lastName'),
        email:            el('email'),
        startBtn:         el('startSignupBtn'),
        message:          el('signupMessage'),
        step1Loader:      el('step1Loader'),
        emailBadge:       el('signupEmailBadge'),
        emailOtpCard:     el('emailOtpCard'),
        verifyEmailBtn:   el('verifySignupEmailBtn'),
        resendEmailBtn:   el('resendSignupEmailBtn'),
        emailOtpLoader:   el('emailOtpLoader'),
        resendEmailLoader:  el('resendEmailLoader'),
        goToLoginBtn:     el('goToLoginBtn'),
        backToSignupBtn:  el('backToSignupBtn'),
        message2:         el('signupMessage2'),
        acctTypeIndividual: el('acctTypeIndividual'),
        acctTypeBusiness:   el('acctTypeBusiness'),
        companyNameField:   el('companyNameField'),
        companyName:        el('companyName'),
    };

    // ── Account type toggle ──────────────────────────────────────
    function setAccountType(type) {
        state.accountType = type;
        var isBusiness = type === 'BUSINESS';
        if (els.acctTypeIndividual) {
            els.acctTypeIndividual.classList.toggle('is-active', !isBusiness);
            els.acctTypeIndividual.setAttribute('aria-checked', String(!isBusiness));
        }
        if (els.acctTypeBusiness) {
            els.acctTypeBusiness.classList.toggle('is-active', isBusiness);
            els.acctTypeBusiness.setAttribute('aria-checked', String(isBusiness));
        }
        if (els.companyNameField) els.companyNameField.hidden = !isBusiness;
    }

    if (els.acctTypeIndividual) {
        els.acctTypeIndividual.addEventListener('click', function () { setAccountType('INDIVIDUAL'); });
    }
    if (els.acctTypeBusiness) {
        els.acctTypeBusiness.addEventListener('click', function () { setAccountType('BUSINESS'); });
    }

    // Pre-select Business when arriving from a business-focused link (e.g. /business "Start Free").
    if ((new URLSearchParams(window.location.search).get('type') || '').toUpperCase() === 'BUSINESS') {
        setAccountType('BUSINESS');
    }

    // ── OTP box helper ──────────────────────────────────────────
    function initOtpBoxes(containerId, onComplete) {
        var container = el(containerId);
        if (!container) return null;
        var boxes = Array.from(container.querySelectorAll('.otp-box'));

        function getValue() {
            return boxes.map(function (b) { return b.value; }).join('');
        }

        function reset() {
            boxes.forEach(function (b) {
                b.value = '';
                b.classList.remove('otp-verified', 'otp-error');
                b.disabled = false;
            });
        }

        function setVerified() {
            boxes.forEach(function (b) {
                b.classList.add('otp-verified');
                b.classList.remove('otp-error');
                b.disabled = true;
            });
        }

        function setError() {
            boxes.forEach(function (b) {
                b.classList.add('otp-error');
                b.classList.remove('otp-verified');
            });
            setTimeout(function () {
                boxes.forEach(function (b) {
                    b.value = '';
                    b.classList.remove('otp-error');
                    b.disabled = false;
                });
                if (boxes[0]) boxes[0].focus();
            }, 500);
        }

        function focusFirst() { if (boxes[0]) boxes[0].focus(); }

        boxes.forEach(function (box, i) {
            box.addEventListener('focus', function () { box.select(); });

            box.addEventListener('input', function () {
                var val = box.value.replace(/\D/g, '');
                box.value = val ? val.charAt(val.length - 1) : '';
                box.classList.remove('otp-verified', 'otp-error');
                if (box.value && i < boxes.length - 1) {
                    boxes[i + 1].focus();
                }
                var full = getValue();
                if (full.length === 6 && onComplete) {
                    onComplete(full);
                }
            });

            box.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace') {
                    if (box.value) {
                        box.value = '';
                    } else if (i > 0) {
                        boxes[i - 1].focus();
                        boxes[i - 1].value = '';
                    }
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft' && i > 0) {
                    boxes[i - 1].focus(); e.preventDefault();
                } else if (e.key === 'ArrowRight' && i < boxes.length - 1) {
                    boxes[i + 1].focus(); e.preventDefault();
                }
            });

            box.addEventListener('paste', function (e) {
                e.preventDefault();
                var text = (e.clipboardData || window.clipboardData).getData('text');
                var digits = text.replace(/\D/g, '').slice(0, 6);
                digits.split('').forEach(function (d, j) {
                    if (boxes[j]) boxes[j].value = d;
                });
                var idx = Math.min(digits.length, boxes.length - 1);
                if (boxes[idx]) boxes[idx].focus();
                if (digits.length === 6 && onComplete) onComplete(digits);
            });
        });

        return { getValue: getValue, reset: reset, setVerified: setVerified, setError: setError, focusFirst: focusFirst };
    }

    var emailOtpBoxes = initOtpBoxes('signupEmailOtpBoxes', function (otp) { if (!state.emailVerified) triggerVerifyEmail(otp); });

    // ── Toast ────────────────────────────────────────────────────
    var toastTimer = null;
    function toast(text, type, step) {
        var msgEl = step === 2 ? els.message2 : els.message;
        if (!msgEl) return;
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        if (!text) { msgEl.textContent = ''; msgEl.classList.remove('error', 'success', 'info', 'is-visible'); return; }
        msgEl.textContent = text;
        msgEl.classList.remove('error', 'success', 'info');
        msgEl.classList.add(type || 'info', 'is-visible');
        toastTimer = setTimeout(function () { msgEl.classList.remove('is-visible'); }, 5000);
    }

    // ── HTTP ─────────────────────────────────────────────────────
    function postJson(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) throw new Error(json.message || 'Request failed.');
                return json;
            });
        });
    }

    // ── Step navigation ──────────────────────────────────────────
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

    // ── Verification state ───────────────────────────────────────
    function updateVerificationState() {
        els.emailBadge.textContent  = state.emailVerified  ? 'Verified' : 'Pending';
        els.emailBadge.classList.toggle('verified',  state.emailVerified);
        if (els.emailOtpCard)  els.emailOtpCard.classList.toggle('verified',  state.emailVerified);
        els.verifyEmailBtn.disabled  = state.emailVerified;
        els.goToLoginBtn.disabled = !state.emailVerified;

        if (state.emailVerified && !state.completing) {
            state.completing = true;
            autoCompleteSignup();
        }
    }

    function autoCompleteSignup() {
        els.goToLoginBtn.disabled = true;
        var span = els.goToLoginBtn.querySelector('span');
        if (span) span.textContent = 'Completing…';

        postJson('/api/auth/signup/complete', { userId: state.userId })
            .then(function () {
                toast('Account created! Redirecting…', 'success', 2);
                var next = new URLSearchParams(window.location.search).get('next') || '';
                setTimeout(function () {
                    window.location.href = (next && next.charAt(0) === '/') ? next : '/';
                }, 1200);
            })
            .catch(function (err) {
                state.completing = false;
                els.goToLoginBtn.disabled = false;
                if (span) span.textContent = 'Continue';
                toast(err.message || 'Could not complete signup. Please try again.', 'error', 2);
            });
    }

    // ── Validation helpers ───────────────────────────────────────
    function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    // Keeps the visual invalid state (is-invalid) in sync with the ARIA state, so screen
    // readers announce the field as invalid and know the shared toast region explains why —
    // previously only the CSS class was set, so assistive tech had no signal at all.
    function markInvalid(input, invalid) {
        if (!input) return;
        input.classList.toggle('is-invalid', invalid);
        if (invalid) {
            input.setAttribute('aria-invalid', 'true');
            if (els.message) input.setAttribute('aria-describedby', els.message.id);
        } else {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        }
    }

    function clearValidation() {
        [els.firstName, els.lastName, els.email, els.companyName].forEach(function (e) {
            markInvalid(e, false);
        });
    }

    // ── Step 1: start signup ─────────────────────────────────────
    els.startBtn.addEventListener('click', function () {
        clearValidation();
        var firstName = (els.firstName.value || '').trim();
        var lastName  = (els.lastName.value  || '').trim();
        var email     = (els.email.value     || '').trim();
        var errors    = [];

        var companyName = els.companyName ? (els.companyName.value || '').trim() : '';

        if (!firstName) { markInvalid(els.firstName, true); errors.push('First name is required'); }
        if (!lastName)  { markInvalid(els.lastName, true);  errors.push('Last name is required'); }
        if (!email || !validateEmail(email)) { markInvalid(els.email, true); errors.push(email ? 'Enter a valid email address' : 'Email is required'); }

        if (state.accountType === 'BUSINESS') {
            if (!companyName) {
                markInvalid(els.companyName, true);
                errors.push('Company name is required for a business account');
            }
            if (email && validateEmail(email) && isFreeEmailDomain(email)) {
                markInvalid(els.email, true);
                errors.push('Business accounts need a work email — Gmail/Yahoo/Outlook etc. are not allowed');
            }
        }

        if (errors.length) { toast(errors[0], 'error', 1); return; }

        els.startBtn.disabled = true;
        if (els.step1Loader) els.step1Loader.hidden = false;

        postJson('/api/auth/signup/start', {
            firstName: firstName, lastName: lastName, email: email,
            accountType: state.accountType, companyName: companyName
        })
            .then(function (res) {
                state.userId       = res.userId;
                state.emailVerified  = false;
                state.completing     = false;
                if (emailOtpBoxes)  emailOtpBoxes.reset();
                updateVerificationState();
                showStep2();
                toast('OTP sent. Verify your email to continue.', 'success', 2);
                if (emailOtpBoxes) emailOtpBoxes.focusFirst();
            })
            .catch(function (err) { toast(err.message, 'error', 1); })
            .finally(function () {
                els.startBtn.disabled = false;
                if (els.step1Loader) els.step1Loader.hidden = true;
            });
    });

    // ── OTP verify helpers ───────────────────────────────────────
    function triggerVerifyEmail(otp) {
        if (!state.userId || state.emailVerified) return;
        els.verifyEmailBtn.disabled = true;
        if (els.emailOtpLoader) els.emailOtpLoader.hidden = false;
        postJson('/api/auth/signup/verify', { userId: state.userId, otp: otp })
            .then(function (res) {
                state.emailVerified  = !!res.verified;
                if (emailOtpBoxes) emailOtpBoxes.setVerified();
                updateVerificationState();
                toast('Email verified!', 'success', 2);
            })
            .catch(function (err) {
                if (emailOtpBoxes) emailOtpBoxes.setError();
                els.verifyEmailBtn.disabled = false;
                toast(err.message, 'error', 2);
            })
            .finally(function () {
                if (els.emailOtpLoader) els.emailOtpLoader.hidden = true;
            });
    }

    els.verifyEmailBtn.addEventListener('click', function () {
        if (emailOtpBoxes) triggerVerifyEmail(emailOtpBoxes.getValue());
    });

    // ── Resend OTP ──────────────────────────────────────────────
    els.resendEmailBtn.addEventListener('click', function () {
        if (!state.userId) { toast('Please start signup first.', 'error', 2); return; }
        els.resendEmailBtn.disabled = true;
        if (els.resendEmailLoader) els.resendEmailLoader.hidden = false;
        postJson('/api/auth/signup/resend', { userId: state.userId })
            .then(function () {
                if (emailOtpBoxes) emailOtpBoxes.reset();
                toast('Email OTP resent.', 'success', 2);
                if (emailOtpBoxes) emailOtpBoxes.focusFirst();
            })
            .catch(function (err) { toast(err.message, 'error', 2); })
            .finally(function () {
                els.resendEmailBtn.disabled = false;
                if (els.resendEmailLoader) els.resendEmailLoader.hidden = true;
            });
    });

    // ── Manual complete button (fallback if auto-complete failed) ─
    els.goToLoginBtn.addEventListener('click', function () {
        if (state.emailVerified && !state.completing) {
            state.completing = true;
            autoCompleteSignup();
        }
    });

    // ── Back button ──────────────────────────────────────────────
    els.backToSignupBtn.addEventListener('click', function () {
        if (emailOtpBoxes)  emailOtpBoxes.reset();
        toast('', '', 2);
        showStep1();
    });
})();
