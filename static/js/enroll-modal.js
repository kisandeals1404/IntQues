/**
 * IntQues — Enroll Modal
 *
 * Flow:
 *  1. User clicks any [data-offering-id] enroll button → modal opens.
 *  2. If logged in   → show user row + "Pay & Enroll" → Razorpay.
 *  3. If guest       → save offering to sessionStorage, redirect to
 *                      /login?next=<current page>.
 *  4. After login    → user lands back on this page → modal auto-opens
 *                      using the sessionStorage data (then cleared).
 */
(function () {
    'use strict';

    var PENDING_KEY = 'intques.pendingEnroll';

    var modal    = document.getElementById('enroll-modal');
    if (!modal) return;

    var backdrop  = document.getElementById('em-backdrop');
    var closeBtn  = document.getElementById('em-close');
    var payBtn    = document.getElementById('em-pay-btn');
    var loader    = document.getElementById('em-loader');
    var msgEl     = document.getElementById('em-message');

    var sChecking = document.getElementById('em-s-checking');
    var sAuth     = document.getElementById('em-s-auth');
    var sGuest    = document.getElementById('em-s-guest');

    var elBadges    = document.getElementById('em-badges');
    var elTitle     = document.getElementById('em-title');
    var elDetails   = document.getElementById('em-details');
    var elPrice     = document.getElementById('em-price');
    var elAvatar    = document.getElementById('em-avatar');
    var elUserName  = document.getElementById('em-user-name');
    var elUserEmail = document.getElementById('em-user-email');
    var elLoginLink = document.getElementById('em-login-link');

    var currentOfferingId = null;
    var currentOffering   = null;   // full {id,name,price,type,batch,mode}
    var cachedUser        = null;   // null=unknown  false=guest  object=user
    var msgTimer          = null;
    var lastFocused       = null;

    /* ── Open modal from a DOM trigger ──────────────── */
    function openModal(trigger) {
        var id    = trigger.dataset.offeringId;
        if (!id) return;

        openModalFromData({
            id:    id,
            name:  trigger.dataset.offeringName  || '',
            price: trigger.dataset.offeringPrice || '',
            type:  trigger.dataset.offeringType  || '',
            batch: trigger.dataset.offeringBatch || '',
            mode:  trigger.dataset.offeringMode  || ''
        });
    }

    /* ── Open modal from a plain data object ────────── */
    function openModalFromData(offer) {
        currentOfferingId = offer.id;
        currentOffering   = offer;

        populateBadges(offer.type, offer.mode);
        elTitle.textContent = offer.name;
        elPrice.textContent = '₹' + offer.price;   // ₹
        populateDetails(offer.batch);
        clearMsg();
        setLoading(false);

        lastFocused = document.activeElement;
        document.body.style.overflow = 'hidden';
        modal.removeAttribute('aria-hidden');
        modal.classList.add('is-open');
        closeBtn.focus();

        // If user already resolved, skip the fetch
        if (cachedUser !== null) {
            applyUserState(cachedUser);
            return;
        }
        showState('checking');
        resolveUser();
    }

    /* ── Close ──────────────────────────────────────── */
    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentOfferingId = null;
        currentOffering   = null;
        clearMsg();
        if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    /* ── Badges & details ───────────────────────────── */
    function populateBadges(type, mode) {
        elBadges.innerHTML = '';
        var b = document.createElement('span');
        b.className = 'em-badge ' + (type === 'LIVE_COURSE' ? 'em-badge-live' : 'em-badge-workshop');
        b.textContent = type === 'LIVE_COURSE' ? 'Live Course' : 'Workshop';
        elBadges.appendChild(b);

        if (mode) {
            var m = document.createElement('span');
            m.className = 'em-badge em-badge-mode';
            m.textContent = mode === 'ZOOM'  ? 'Online · Zoom'
                          : mode === 'GMEET' ? 'Online · Meet'
                          : 'In-Person';
            elBadges.appendChild(m);
        }
    }

    function populateDetails(batch) {
        elDetails.innerHTML = '';
        if (batch) {
            var c = document.createElement('span');
            c.className = 'em-offer-detail';
            c.innerHTML = '<i class="fa-regular fa-calendar" aria-hidden="true"></i> ' + escHtml(batch);
            elDetails.appendChild(c);
        }
    }

    /* ── Auth resolution ────────────────────────────── */
    function resolveUser() {
        fetch('/api/auth/me', { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) { cachedUser = false; applyUserState(false); return null; }
                return res.json();
            })
            .then(function (data) {
                if (!data) return;
                cachedUser = data;
                applyUserState(data);
            })
            .catch(function () {
                cachedUser = false;
                applyUserState(false);
            });
    }

    function applyUserState(user) {
        if (!user) {
            // Wire up login link → current page (not /enroll)
            if (elLoginLink) {
                var returnPath = window.location.pathname + window.location.search;
                elLoginLink.href = '/login?next=' + encodeURIComponent(returnPath);

                // Save offering to sessionStorage only when user actually clicks login
                elLoginLink.onclick = function () {
                    if (currentOffering) {
                        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(currentOffering)); } catch (e) {}
                    }
                };
            }
            showState('guest');
        } else {
            var fullName = ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
            if (elAvatar)    elAvatar.textContent    = (user.firstName || '?').charAt(0).toUpperCase();
            if (elUserName)  elUserName.textContent  = fullName || 'Account';
            if (elUserEmail) elUserEmail.textContent = user.email || '';
            showState('auth');
        }
    }

    function showState(state) {
        if (sChecking) sChecking.hidden = state !== 'checking';
        if (sAuth)     sAuth.hidden     = state !== 'auth';
        if (sGuest)    sGuest.hidden    = state !== 'guest';
    }

    /* ── Payment flow ───────────────────────────────── */
    function handlePay() {
        if (!currentOfferingId) return;
        setLoading(true);
        showMsg('Preparing payment…', 'info');

        loadRazorpay(function () {
            postJson('/api/payments/create-order', { courseOfferingId: currentOfferingId })
                .then(function (orderData) {
                    setLoading(false);
                    clearMsg();
                    openRazorpay(orderData);
                })
                .catch(function (err) {
                    setLoading(false);
                    if (err.status === 401) {
                        cachedUser = false;
                        applyUserState(false);
                        showMsg('Session expired. Please log in again.', 'error');
                    } else {
                        showMsg(err.message || 'Something went wrong. Please try again.', 'error');
                    }
                });
        });
    }

    function openRazorpay(orderData) {
        var user     = (cachedUser && typeof cachedUser === 'object') ? cachedUser : {};
        var fullName = ((user.firstName || '') + ' ' + (user.lastName || '')).trim();

        var opts = {
            key:         orderData.keyId,
            amount:      orderData.amount,
            currency:    orderData.currency || 'INR',
            name:        'IntQues',
            description: orderData.offeringName || '',
            order_id:    orderData.orderId,
            prefill:     { name: fullName, email: user.email || '', contact: user.mobile || '' },
            theme:       { color: '#ff6a00' },
            handler: function (resp) {
                closeModal();
                verifyAndEnroll(
                    resp.razorpay_payment_id,
                    resp.razorpay_order_id,
                    resp.razorpay_signature,
                    orderData.offeringId || currentOfferingId
                );
            },
            modal: {
                ondismiss: function () {
                    showMsg('Payment cancelled. Tap "Pay & Enroll" to try again.', 'info');
                    setLoading(false);
                }
            }
        };

        var rzp = new Razorpay(opts);
        rzp.on('payment.failed', function (resp) {
            var desc = (resp.error && resp.error.description) || 'Payment failed. Please try again.';
            showMsg(desc, 'error');
            setLoading(false);
        });
        rzp.open();
    }

    function verifyAndEnroll(paymentId, orderId, signature, offeringId) {
        showMsg('Verifying payment…', 'info');
        postJson('/api/payments/verify', {
            razorpayPaymentId: paymentId,
            razorpayOrderId:   orderId,
            razorpaySignature: signature,
            courseOfferingId:  offeringId
        })
        .then(function () { window.location.href = '/enrollment-success'; })
        .catch(function (err) {
            showMsg(err.message || 'Verification failed. Contact support@intques.com.', 'error');
            setLoading(false);
        });
    }

    /* ── Helpers ────────────────────────────────────── */
    function setLoading(on) {
        if (payBtn) payBtn.disabled = on;
        if (loader) loader.hidden   = !on;
    }

    function showMsg(text, type) {
        if (!msgEl) return;
        if (msgTimer) clearTimeout(msgTimer);
        msgEl.textContent = text;
        msgEl.className   = 'em-msg is-' + (type || 'info');
        msgTimer = setTimeout(function () { clearMsg(); }, 7000);
    }

    function clearMsg() {
        if (!msgEl) return;
        msgEl.textContent = '';
        msgEl.className   = 'em-msg';
        if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; }
    }

    function loadRazorpay(cb) {
        if (typeof Razorpay !== 'undefined') { cb(); return; }
        var s = document.createElement('script');
        s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload  = cb;
        s.onerror = function () {
            showMsg('Payment service unavailable. Please refresh and try again.', 'error');
            setLoading(false);
        };
        document.head.appendChild(s);
    }

    function postJson(url, body) {
        return fetch(url, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body:        JSON.stringify(body)
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) {
                    var err = new Error(json.message || 'Request failed. Please try again.');
                    err.status = res.status;
                    throw err;
                }
                return json;
            });
        });
    }

    function escHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ── Event listeners ────────────────────────────── */
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (payBtn)   payBtn.addEventListener('click',   handlePay);

    document.addEventListener('keydown', function (e) {
        if (modal.classList.contains('is-open') && e.key === 'Escape') closeModal();
    });

    // Intercept enroll links / buttons that carry data-offering-id
    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-offering-id]');
        if (!trigger) return;
        var tag  = trigger.tagName;
        var href = trigger.getAttribute('href') || '';
        if (href.indexOf('/enroll') === -1 && tag !== 'BUTTON') return;
        e.preventDefault();
        openModal(trigger);
    });

    /* ── Auto-open after login redirect ─────────────── */
    (function checkPendingEnroll() {
        var path = window.location.pathname;
        // Skip on auth pages themselves
        if (path === '/login' || path === '/signup' || path === '/enroll') return;

        var stored;
        try { stored = sessionStorage.getItem(PENDING_KEY); } catch (e) {}
        if (!stored) return;

        // Remove immediately — prevent re-trigger on refresh
        try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}

        var offer;
        try { offer = JSON.parse(stored); } catch (e) { return; }
        if (!offer || !offer.id) return;

        // Verify session is active before auto-opening
        fetch('/api/auth/me', { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) return null;
                return res.json();
            })
            .then(function (user) {
                if (!user) return;   // not logged in — nothing to do
                cachedUser = user;
                openModalFromData(offer);
            })
            .catch(function () {});
    })();
})();
