(function () {
    'use strict';

    var form = document.getElementById('loginForm');
    if (!form) return;

    var state = { userId: null, email: '', hasPassword: false, otpSent: false };

    var els = {
        // Step 1
        step1:          document.getElementById('ls1'),
        emailInput:     document.getElementById('lsEmail'),
        continueBtn:    document.getElementById('lsContinueBtn'),
        continueLoader: document.getElementById('lsContinueLoader'),

        // Step 2 header
        step2:          document.getElementById('ls2'),
        emailDisplay:   document.getElementById('lsEmailDisplay'),
        changeBtn:      document.getElementById('lsChangeBtn'),
        methodTabs:     document.getElementById('lsMethodTabs'),
        tabOtp:         document.getElementById('lsTabOtp'),
        tabPwd:         document.getElementById('lsTabPwd'),

        // OTP panel
        otpPanel:       document.getElementById('lsOtpPanel'),
        otpSendState:   document.getElementById('lsOtpSendState'),
        otpTargetEmail: document.getElementById('lsOtpTargetEmail'),
        sendOtpBtn:     document.getElementById('lsSendOtpBtn'),
        sendOtpLoader:  document.getElementById('lsSendOtpLoader'),

        otpVerifyState: document.getElementById('lsOtpVerifyState'),
        otpSentEmail:   document.getElementById('lsOtpSentEmail'),
        otpInput:       document.getElementById('lsOtp'),
        verifyOtpBtn:   document.getElementById('lsVerifyOtpBtn'),
        verifyOtpLoader:document.getElementById('lsVerifyOtpLoader'),
        resendOtpBtn:   document.getElementById('lsResendOtpBtn'),

        // Password panel
        pwdPanel:       document.getElementById('lsPwdPanel'),
        pwdInput:       document.getElementById('lsPassword'),
        togglePwd:      document.getElementById('lsTogglePwd'),
        loginPwdBtn:    document.getElementById('lsLoginPwdBtn'),
        loginPwdLoader: document.getElementById('lsLoginPwdLoader'),
        useOtpInstead:  document.getElementById('lsUseOtpInstead'),

        message:        document.getElementById('lsMessage')
    };

    var toastTimer = null;

    function toast(text, type) {
        if (!els.message) return;
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        if (!text) { els.message.textContent = ''; els.message.className = 'enroll-message'; return; }
        els.message.textContent = text;
        els.message.className = 'enroll-message is-visible ' + (type || 'info');
        toastTimer = setTimeout(function () { els.message.classList.remove('is-visible'); }, 6000);
    }

    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

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

    // ── Navigation ────────────────────────────────────────────

    function showStep1() {
        els.step1.hidden = false;
        els.step2.hidden = true;
        toast('');
    }

    function showStep2() {
        els.step1.hidden = true;
        els.step2.hidden = false;
        els.emailDisplay.textContent = state.email;
        els.otpTargetEmail.textContent = state.email;
        els.otpSentEmail.textContent   = state.email;
        els.methodTabs.hidden = !state.hasPassword;
        showOtpTab();
    }

    function showOtpTab() {
        if (els.tabOtp) {
            els.tabOtp.classList.add('login-method-tab--active');
            els.tabOtp.setAttribute('aria-selected', 'true');
        }
        if (els.tabPwd) {
            els.tabPwd.classList.remove('login-method-tab--active');
            els.tabPwd.setAttribute('aria-selected', 'false');
        }
        els.otpPanel.hidden = false;
        els.pwdPanel.hidden = true;
        if (state.otpSent) {
            showOtpVerifyState();
        } else {
            showOtpSendState();
        }
    }

    function showPwdTab() {
        if (els.tabOtp) {
            els.tabOtp.classList.remove('login-method-tab--active');
            els.tabOtp.setAttribute('aria-selected', 'false');
        }
        if (els.tabPwd) {
            els.tabPwd.classList.add('login-method-tab--active');
            els.tabPwd.setAttribute('aria-selected', 'true');
        }
        els.otpPanel.hidden = true;
        els.pwdPanel.hidden = false;
        if (els.pwdInput) els.pwdInput.focus();
    }

    function showOtpSendState() {
        els.otpSendState.hidden   = false;
        els.otpVerifyState.hidden = true;
    }

    function showOtpVerifyState() {
        els.otpSendState.hidden   = true;
        els.otpVerifyState.hidden = false;
        if (els.otpInput) els.otpInput.focus();
    }

    function handleLoginSuccess() {
        toast('Login successful. Redirecting…', 'success');
        var next = new URLSearchParams(window.location.search).get('next') || '';
        window.location.href = (next && next.charAt(0) === '/') ? next : '/';
    }

    // ── Step 1: Continue ──────────────────────────────────────

    els.continueBtn.addEventListener('click', function () {
        var email = (els.emailInput.value || '').trim();
        if (!email || !isValidEmail(email)) {
            els.emailInput.classList.add('is-invalid');
            toast('Please enter a valid email address.', 'error');
            els.emailInput.focus();
            return;
        }
        els.emailInput.classList.remove('is-invalid');
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

    // ── Change email ─────────────────────────────────────────

    els.changeBtn.addEventListener('click', function () {
        state.userId = null;
        state.otpSent = false;
        showStep1();
        if (els.emailInput) els.emailInput.focus();
    });

    // ── Method tabs ──────────────────────────────────────────

    if (els.tabOtp) els.tabOtp.addEventListener('click', showOtpTab);
    if (els.tabPwd) els.tabPwd.addEventListener('click', showPwdTab);

    // ── Send OTP ─────────────────────────────────────────────

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

    // ── Resend OTP ───────────────────────────────────────────

    if (els.resendOtpBtn) {
        els.resendOtpBtn.addEventListener('click', function () {
            els.resendOtpBtn.disabled = true;
            postJson('/api/auth/login/start', { email: state.email })
                .then(function (res) {
                    state.userId = res.userId;
                    if (els.otpInput) els.otpInput.value = '';
                    toast('A new OTP has been sent to ' + state.email + '.', 'success');
                    setTimeout(function () { els.resendOtpBtn.disabled = false; }, 30000);
                })
                .catch(function (err) {
                    toast(err.message, 'error');
                    els.resendOtpBtn.disabled = false;
                });
        });
    }

    // ── Verify OTP ───────────────────────────────────────────

    els.verifyOtpBtn.addEventListener('click', function () {
        if (!state.userId) { toast('Please request an OTP first.', 'error'); return; }
        setLoading(els.verifyOtpBtn, els.verifyOtpLoader, true);
        postJson('/api/auth/login/verify', {
            userId: state.userId,
            otp: (els.otpInput ? els.otpInput.value : '').trim()
        })
        .then(handleLoginSuccess)
        .catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setLoading(els.verifyOtpBtn, els.verifyOtpLoader, false); });
    });

    if (els.otpInput) {
        els.otpInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') els.verifyOtpBtn.click();
        });
    }

    // ── Login with password ──────────────────────────────────

    els.loginPwdBtn.addEventListener('click', function () {
        var pwd = els.pwdInput ? els.pwdInput.value : '';
        if (!pwd) { toast('Please enter your password.', 'error'); if (els.pwdInput) els.pwdInput.focus(); return; }
        setLoading(els.loginPwdBtn, els.loginPwdLoader, true);
        postJson('/api/auth/login/password', {
            userId: state.userId,
            password: pwd
        })
        .then(handleLoginSuccess)
        .catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setLoading(els.loginPwdBtn, els.loginPwdLoader, false); });
    });

    if (els.pwdInput) {
        els.pwdInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') els.loginPwdBtn.click();
        });
    }

    // ── Password show/hide toggle ────────────────────────────

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

    // ── "Use OTP instead" (from password panel) ──────────────

    if (els.useOtpInstead) {
        els.useOtpInstead.addEventListener('click', function () {
            showOtpTab();
        });
    }

})();
