(function () {
    'use strict';

    var form = document.getElementById('loginForm');
    if (!form) return;

    var state = { userId: null, email: '', hasPassword: false, otpSent: false };

    function el(id) { return document.getElementById(id); }

    var els = {
        // Step 1
        step1:          el('ls1'),
        emailInput:     el('lsEmail'),
        continueBtn:    el('lsContinueBtn'),
        continueLoader: el('lsContinueLoader'),

        // Step 2 header
        step2:          el('ls2'),
        emailDisplay:   el('lsEmailDisplay'),
        changeBtn:      el('lsChangeBtn'),
        methodTabs:     el('lsMethodTabs'),
        tabOtp:         el('lsTabOtp'),
        tabPwd:         el('lsTabPwd'),

        // OTP panel
        otpPanel:        el('lsOtpPanel'),
        otpSendState:    el('lsOtpSendState'),
        otpTargetEmail:  el('lsOtpTargetEmail'),
        sendOtpBtn:      el('lsSendOtpBtn'),
        sendOtpLoader:   el('lsSendOtpLoader'),
        otpVerifyState:  el('lsOtpVerifyState'),
        otpSentEmail:    el('lsOtpSentEmail'),
        verifyOtpBtn:    el('lsVerifyOtpBtn'),
        verifyOtpLoader: el('lsVerifyOtpLoader'),
        resendOtpBtn:    el('lsResendOtpBtn'),

        // Password panel
        pwdPanel:        el('lsPwdPanel'),
        pwdInput:        el('lsPassword'),
        togglePwd:       el('lsTogglePwd'),
        loginPwdBtn:     el('lsLoginPwdBtn'),
        loginPwdLoader:  el('lsLoginPwdLoader'),
        useOtpInstead:   el('lsUseOtpInstead'),
        forgotPwdBtn:    el('lsForgotPwdBtn'),

        // Reset password panel
        resetPanel:        el('lsResetPanel'),
        resetTargetEmail:  el('lsResetTargetEmail'),
        resetSendState:    el('lsResetSendState'),
        resetSendBtn:      el('lsResetSendBtn'),
        resetSendLoader:   el('lsResetSendLoader'),
        resetVerifyState:  el('lsResetVerifyState'),
        resetSentEmail:    el('lsResetSentEmail'),
        resetNewPwd:       el('lsResetNewPwd'),
        resetTogglePwd:    el('lsResetTogglePwd'),
        resetConfirmPwd:   el('lsResetConfirmPwd'),
        resetSubmitBtn:    el('lsResetSubmitBtn'),
        resetSubmitLoader: el('lsResetSubmitLoader'),
        resetResendBtn:    el('lsResetResendBtn'),
        resetBackBtn:      el('lsResetBackBtn'),

        message:         el('lsMessage')
    };

    // Bail out if the core step-1 elements are missing (old bundle vs new template mismatch)
    if (!els.step1 || !els.emailInput || !els.continueBtn) return;

    // ── OTP boxes factory (used for both login OTP and password-reset OTP) ──
    function makeOtpBoxes(containerId, onComplete) {
        var container = el(containerId);
        if (!container) return null;
        var boxes = Array.from(container.querySelectorAll('.otp-box'));

        function getValue() { return boxes.map(function (b) { return b.value; }).join(''); }

        function reset() {
            boxes.forEach(function (b) {
                b.value = '';
                b.classList.remove('otp-verified', 'otp-error');
                b.disabled = false;
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
                if (full.length === 6 && onComplete) onComplete();
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
                digits.split('').forEach(function (d, j) { if (boxes[j]) boxes[j].value = d; });
                var idx = Math.min(digits.length, boxes.length - 1);
                if (boxes[idx]) boxes[idx].focus();
                if (digits.length === 6 && onComplete) onComplete();
            });
        });

        return { getValue: getValue, reset: reset, setError: setError, focusFirst: focusFirst };
    }

    var loginOtpBoxes = makeOtpBoxes('loginOtpBoxes', function () {
        if (els.verifyOtpBtn && !els.verifyOtpBtn.disabled) els.verifyOtpBtn.click();
    });
    // Reset OTP auto-completion doesn't auto-submit — the new-password fields still need filling in.
    var resetOtpBoxes = makeOtpBoxes('resetOtpBoxes', null);

    var toastTimer = null;

    function toast(text, type) {
        if (!els.message) return;
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        if (!text) { els.message.textContent = ''; els.message.className = 'auth-message'; return; }
        els.message.textContent = text;
        els.message.className = 'auth-message is-visible ' + (type || 'info');
        toastTimer = setTimeout(function () { els.message.classList.remove('is-visible'); }, 6000);
    }

    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

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

    function postJson(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) throw new Error(json.message || 'Request failed. Please try again.');
                return json;
            });
        });
    }

    function setLoading(btn, loader, on) {
        if (btn)    btn.disabled = on;
        if (loader) loader.hidden = !on;
    }

    // Disabling a resend button with no explanation reads as a dead control — this shows the
    // remaining wait so it reads as "resend in 30s" instead.
    function startResendCountdown(btn, seconds) {
        if (!btn) return;
        var originalLabel = btn.dataset.originalLabel || btn.textContent;
        btn.dataset.originalLabel = originalLabel;
        btn.disabled = true;
        var remaining = seconds;
        btn.textContent = 'Resend in ' + remaining + 's';
        var interval = setInterval(function () {
            remaining--;
            if (remaining <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.textContent = originalLabel;
            } else {
                btn.textContent = 'Resend in ' + remaining + 's';
            }
        }, 1000);
    }

    // ── Navigation ──────────────────────────────────────────────

    function showStep1() {
        if (els.step1) els.step1.hidden = false;
        if (els.step2) els.step2.hidden = true;
        toast('');
    }

    function showStep2() {
        if (els.step1) els.step1.hidden = true;
        if (els.step2) els.step2.hidden = false;
        if (els.emailDisplay)  els.emailDisplay.textContent  = state.email;
        if (els.otpTargetEmail) els.otpTargetEmail.textContent = state.email;
        if (els.otpSentEmail)  els.otpSentEmail.textContent  = state.email;
        if (els.methodTabs)    els.methodTabs.hidden = !state.hasPassword;
        showOtpTab();
    }

    function showOtpTab() {
        if (els.resetPanel) els.resetPanel.hidden = true;
        if (els.tabOtp) { els.tabOtp.classList.add('login-method-tab--active');    els.tabOtp.setAttribute('aria-selected', 'true'); }
        if (els.tabPwd) { els.tabPwd.classList.remove('login-method-tab--active'); els.tabPwd.setAttribute('aria-selected', 'false'); }
        if (els.otpPanel) els.otpPanel.hidden = false;
        if (els.pwdPanel) els.pwdPanel.hidden = true;
        if (state.otpSent) { showOtpVerifyState(); } else { showOtpSendState(); }
    }

    function showPwdTab() {
        if (els.resetPanel) els.resetPanel.hidden = true;
        if (els.tabOtp) { els.tabOtp.classList.remove('login-method-tab--active'); els.tabOtp.setAttribute('aria-selected', 'false'); }
        if (els.tabPwd) { els.tabPwd.classList.add('login-method-tab--active');    els.tabPwd.setAttribute('aria-selected', 'true'); }
        if (els.otpPanel) els.otpPanel.hidden = true;
        if (els.pwdPanel) els.pwdPanel.hidden = false;
        if (els.pwdInput) els.pwdInput.focus();
    }

    function showResetPanel() {
        if (els.otpPanel) els.otpPanel.hidden = true;
        if (els.pwdPanel) els.pwdPanel.hidden = true;
        if (els.resetPanel) els.resetPanel.hidden = false;
        if (els.resetTargetEmail) els.resetTargetEmail.textContent = state.email;
        if (els.resetSentEmail)   els.resetSentEmail.textContent   = state.email;
        showResetSendState();
    }

    function showResetSendState() {
        if (els.resetSendState)   els.resetSendState.hidden   = false;
        if (els.resetVerifyState) els.resetVerifyState.hidden = true;
    }

    function showResetVerifyState() {
        if (els.resetSendState)   els.resetSendState.hidden   = true;
        if (els.resetVerifyState) els.resetVerifyState.hidden = false;
        if (resetOtpBoxes) resetOtpBoxes.focusFirst();
    }

    function showOtpSendState() {
        if (els.otpSendState)   els.otpSendState.hidden   = false;
        if (els.otpVerifyState) els.otpVerifyState.hidden = true;
    }

    function showOtpVerifyState() {
        if (els.otpSendState)   els.otpSendState.hidden   = true;
        if (els.otpVerifyState) els.otpVerifyState.hidden = false;
        if (loginOtpBoxes) loginOtpBoxes.focusFirst();
    }

    function handleLoginSuccess() {
        toast('Login successful. Redirecting…', 'success');
        var next = new URLSearchParams(window.location.search).get('next') || '';
        window.location.href = (next && next.charAt(0) === '/') ? next : '/';
    }

    // ── Step 1: Continue ───────────────────────────────────────

    els.continueBtn.addEventListener('click', function () {
        var email = (els.emailInput.value || '').trim();
        if (!email || !isValidEmail(email)) {
            markInvalid(els.emailInput, true);
            toast('Please enter a valid email address.', 'error');
            els.emailInput.focus();
            return;
        }
        markInvalid(els.emailInput, false);
        setLoading(els.continueBtn, els.continueLoader, true);
        postJson('/api/auth/login/check', { email: email })
            .then(function (res) {
                state.userId      = res.userId;
                state.email       = email;
                state.hasPassword = !!res.hasPassword;
                state.otpSent     = false;
                showStep2();
            })
            .catch(function (err) { toast(err.message, 'error'); })
            .finally(function () { setLoading(els.continueBtn, els.continueLoader, false); });
    });

    els.emailInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') els.continueBtn.click();
    });

    // ── Change email ────────────────────────────────────────────

    if (els.changeBtn) {
        els.changeBtn.addEventListener('click', function () {
            state.userId  = null;
            state.otpSent = false;
            showStep1();
            els.emailInput.focus();
        });
    }

    // ── Method tabs ─────────────────────────────────────────────

    if (els.tabOtp) els.tabOtp.addEventListener('click', showOtpTab);
    if (els.tabPwd) els.tabPwd.addEventListener('click', showPwdTab);

    // ── Send OTP ────────────────────────────────────────────────

    if (els.sendOtpBtn) {
        els.sendOtpBtn.addEventListener('click', function () {
            setLoading(els.sendOtpBtn, els.sendOtpLoader, true);
            postJson('/api/auth/login/start', { email: state.email })
                .then(function (res) {
                    state.userId  = res.userId;
                    state.otpSent = true;
                    showOtpVerifyState();
                    toast('Login OTP sent to ' + state.email + '.', 'success');
                })
                .catch(function (err) { toast(err.message, 'error'); })
                .finally(function () { setLoading(els.sendOtpBtn, els.sendOtpLoader, false); });
        });
    }

    // ── Resend OTP ──────────────────────────────────────────────

    if (els.resendOtpBtn) {
        els.resendOtpBtn.addEventListener('click', function () {
            els.resendOtpBtn.disabled = true;
            postJson('/api/auth/login/start', { email: state.email })
                .then(function (res) {
                    state.userId = res.userId;
                    if (loginOtpBoxes) loginOtpBoxes.reset();
                    toast('A new OTP has been sent to ' + state.email + '.', 'success');
                    startResendCountdown(els.resendOtpBtn, 30);
                })
                .catch(function (err) {
                    toast(err.message, 'error');
                    els.resendOtpBtn.disabled = false;
                });
        });
    }

    // ── Verify OTP ──────────────────────────────────────────────

    if (els.verifyOtpBtn) {
        els.verifyOtpBtn.addEventListener('click', function () {
            if (!state.userId) { toast('Please request an OTP first.', 'error'); return; }
            setLoading(els.verifyOtpBtn, els.verifyOtpLoader, true);
            postJson('/api/auth/login/verify', {
                userId: state.userId,
                otp: loginOtpBoxes ? loginOtpBoxes.getValue() : ''
            })
            .then(handleLoginSuccess)
            .catch(function (err) {
                toast(err.message, 'error');
                if (loginOtpBoxes) loginOtpBoxes.setError();
            })
            .finally(function () { setLoading(els.verifyOtpBtn, els.verifyOtpLoader, false); });
        });
    }

    // ── Login with password ─────────────────────────────────────

    if (els.loginPwdBtn) {
        els.loginPwdBtn.addEventListener('click', function () {
            var pwd = els.pwdInput ? els.pwdInput.value : '';
            if (!pwd) { toast('Please enter your password.', 'error'); if (els.pwdInput) els.pwdInput.focus(); return; }
            setLoading(els.loginPwdBtn, els.loginPwdLoader, true);
            postJson('/api/auth/login/password', { userId: state.userId, password: pwd })
                .then(handleLoginSuccess)
                .catch(function (err) { toast(err.message, 'error'); })
                .finally(function () { setLoading(els.loginPwdBtn, els.loginPwdLoader, false); });
        });
    }

    if (els.pwdInput) {
        els.pwdInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && els.loginPwdBtn) els.loginPwdBtn.click();
        });
    }

    // ── Password show/hide ──────────────────────────────────────

    if (els.togglePwd && els.pwdInput) {
        els.togglePwd.addEventListener('click', function () {
            var isText = els.pwdInput.type === 'text';
            els.pwdInput.type = isText ? 'password' : 'text';
            els.togglePwd.innerHTML = isText
                ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>'
                : '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>';
            els.togglePwd.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
        });
    }

    // ── Use OTP instead ─────────────────────────────────────────

    if (els.useOtpInstead) {
        els.useOtpInstead.addEventListener('click', showOtpTab);
    }

    // ── Forgot password / reset flow ─────────────────────────────

    if (els.forgotPwdBtn) {
        els.forgotPwdBtn.addEventListener('click', showResetPanel);
    }

    if (els.resetBackBtn) {
        els.resetBackBtn.addEventListener('click', showPwdTab);
    }

    if (els.resetSendBtn) {
        els.resetSendBtn.addEventListener('click', function () {
            setLoading(els.resetSendBtn, els.resetSendLoader, true);
            postJson('/api/auth/password/forgot', { email: state.email })
                .then(function (res) {
                    state.userId = res.userId;
                    if (resetOtpBoxes) resetOtpBoxes.reset();
                    showResetVerifyState();
                    toast('A password reset code was sent to ' + state.email + '.', 'success');
                })
                .catch(function (err) { toast(err.message, 'error'); })
                .finally(function () { setLoading(els.resetSendBtn, els.resetSendLoader, false); });
        });
    }

    if (els.resetResendBtn) {
        els.resetResendBtn.addEventListener('click', function () {
            els.resetResendBtn.disabled = true;
            postJson('/api/auth/password/forgot', { email: state.email })
                .then(function (res) {
                    state.userId = res.userId;
                    if (resetOtpBoxes) resetOtpBoxes.reset();
                    toast('A new reset code has been sent to ' + state.email + '.', 'success');
                    startResendCountdown(els.resetResendBtn, 30);
                })
                .catch(function (err) {
                    toast(err.message, 'error');
                    els.resetResendBtn.disabled = false;
                });
        });
    }

    if (els.resetTogglePwd && els.resetNewPwd) {
        els.resetTogglePwd.addEventListener('click', function () {
            var isText = els.resetNewPwd.type === 'text';
            els.resetNewPwd.type = isText ? 'password' : 'text';
            els.resetTogglePwd.innerHTML = isText
                ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>'
                : '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>';
            els.resetTogglePwd.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
        });
    }

    if (els.resetSubmitBtn) {
        els.resetSubmitBtn.addEventListener('click', function () {
            var otp = resetOtpBoxes ? resetOtpBoxes.getValue() : '';
            var newPwd = els.resetNewPwd ? els.resetNewPwd.value : '';
            var confirmPwd = els.resetConfirmPwd ? els.resetConfirmPwd.value : '';

            if (otp.length !== 6) { toast('Please enter the 6-digit code.', 'error'); return; }
            if (!newPwd || newPwd.length < 8) {
                toast('Password must be at least 8 characters.', 'error');
                if (els.resetNewPwd) els.resetNewPwd.focus();
                return;
            }
            if (newPwd !== confirmPwd) {
                toast('Passwords do not match.', 'error');
                if (els.resetConfirmPwd) els.resetConfirmPwd.focus();
                return;
            }

            setLoading(els.resetSubmitBtn, els.resetSubmitLoader, true);
            postJson('/api/auth/password/reset', { userId: state.userId, otp: otp, newPassword: newPwd })
                .then(function () {
                    toast('Password reset. Please log in with your new password.', 'success');
                    if (resetOtpBoxes) resetOtpBoxes.reset();
                    if (els.resetNewPwd) els.resetNewPwd.value = '';
                    if (els.resetConfirmPwd) els.resetConfirmPwd.value = '';
                    if (els.pwdInput) els.pwdInput.value = '';
                    showPwdTab();
                })
                .catch(function (err) {
                    toast(err.message, 'error');
                    if (resetOtpBoxes) resetOtpBoxes.setError();
                })
                .finally(function () { setLoading(els.resetSubmitBtn, els.resetSubmitLoader, false); });
        });
    }

})();
