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
        otpInput:        el('lsOtp'),
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

        message:         el('lsMessage')
    };

    // Bail out if the core step-1 elements are missing (old bundle vs new template mismatch)
    if (!els.step1 || !els.emailInput || !els.continueBtn) return;

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
        if (els.tabOtp) { els.tabOtp.classList.add('login-method-tab--active');    els.tabOtp.setAttribute('aria-selected', 'true'); }
        if (els.tabPwd) { els.tabPwd.classList.remove('login-method-tab--active'); els.tabPwd.setAttribute('aria-selected', 'false'); }
        if (els.otpPanel) els.otpPanel.hidden = false;
        if (els.pwdPanel) els.pwdPanel.hidden = true;
        if (state.otpSent) { showOtpVerifyState(); } else { showOtpSendState(); }
    }

    function showPwdTab() {
        if (els.tabOtp) { els.tabOtp.classList.remove('login-method-tab--active'); els.tabOtp.setAttribute('aria-selected', 'false'); }
        if (els.tabPwd) { els.tabPwd.classList.add('login-method-tab--active');    els.tabPwd.setAttribute('aria-selected', 'true'); }
        if (els.otpPanel) els.otpPanel.hidden = true;
        if (els.pwdPanel) els.pwdPanel.hidden = false;
        if (els.pwdInput) els.pwdInput.focus();
    }

    function showOtpSendState() {
        if (els.otpSendState)   els.otpSendState.hidden   = false;
        if (els.otpVerifyState) els.otpVerifyState.hidden = true;
    }

    function showOtpVerifyState() {
        if (els.otpSendState)   els.otpSendState.hidden   = true;
        if (els.otpVerifyState) els.otpVerifyState.hidden = false;
        if (els.otpInput) els.otpInput.focus();
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
                    if (els.otpInput) els.otpInput.value = '';
                    toast('A new OTP has been sent to ' + state.email + '.', 'success');
                    setTimeout(function () { if (els.resendOtpBtn) els.resendOtpBtn.disabled = false; }, 30000);
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
                otp: (els.otpInput ? els.otpInput.value : '').trim()
            })
            .then(handleLoginSuccess)
            .catch(function (err) { toast(err.message, 'error'); })
            .finally(function () { setLoading(els.verifyOtpBtn, els.verifyOtpLoader, false); });
        });
    }

    if (els.otpInput) {
        els.otpInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && els.verifyOtpBtn) els.verifyOtpBtn.click();
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

})();
