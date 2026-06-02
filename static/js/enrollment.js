(function () {
    'use strict';

    // ── Mobile confirm bar (existing IDs) ──────────────────────
    var selectedId    = null;
    var confirmBar    = document.getElementById('enrollConfirmBar');
    var confirmName   = document.getElementById('enrollConfirmName');
    var confirmPrice  = document.getElementById('enrollConfirmPrice');
    var submitBtn     = document.getElementById('submitEnrollmentBtn');   // mobile pay
    var cancelBtn     = document.getElementById('cancelSelectionBtn');    // mobile change
    var enrollLoader  = document.getElementById('enrollmentLoader');      // mobile loader
    var messageEl     = document.getElementById('enrollMessage');
    var mainEl        = document.getElementById('main-content');
    var metaEl        = document.getElementById('enrollmentMeta');
    var toastTimer      = null;
    var isFiltered      = false;   // true when showing a single pre-selected offering
    var subtitleEl      = document.getElementById('enrollSubtitle');
    var subtitleDefault = subtitleEl ? subtitleEl.textContent : '';

    // ── Desktop sidebar (new IDs) ──────────────────────────────
    var esbPayBtn    = document.getElementById('esbPayBtn');
    var esbCancelBtn = document.getElementById('esbCancelBtn');
    var esbLoader    = document.getElementById('esbLoader');
    var esbName      = document.getElementById('esbName');
    var esbPrice     = document.getElementById('esbPrice');
    var esbEmpty     = document.getElementById('esbEmpty');
    var esbSelected  = document.getElementById('esbSelected');

    var rows = document.querySelectorAll('.offering-row');
    if (!rows.length) return;

    // ── Card selection ─────────────────────────────────────────
    rows.forEach(function (row) {
        row.addEventListener('click', function () {
            if (row.classList.contains('selected')) {
                clearSelection();
            } else {
                selectRow(row);
            }
        });
        row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (row.classList.contains('selected')) {
                    clearSelection();
                } else {
                    selectRow(row);
                }
            }
        });
    });

    function selectRow(row) {
        rows.forEach(function (r) {
            r.classList.remove('selected');
            r.setAttribute('aria-checked', 'false');
        });
        row.classList.add('selected');
        row.setAttribute('aria-checked', 'true');
        selectedId = row.dataset.id;

        var name  = row.dataset.name  || '';
        var price = row.dataset.price || '';

        // Update mobile confirm bar
        if (confirmName)  confirmName.textContent  = name;
        if (confirmPrice) confirmPrice.textContent = price;
        if (confirmBar) {
            confirmBar.hidden = false;
            if (mainEl) mainEl.classList.add('has-confirm-bar');
        }

        // Update desktop sidebar
        if (esbName)     esbName.textContent     = name;
        if (esbPrice)    esbPrice.textContent     = price;
        if (esbEmpty)    esbEmpty.hidden          = true;
        if (esbSelected) esbSelected.hidden       = false;
        if (esbPayBtn)   esbPayBtn.disabled       = false;
        if (esbCancelBtn) esbCancelBtn.hidden     = false;
    }

    // ── Cancel / clear selection ───────────────────────────────
    function clearSelection() {
        rows.forEach(function (r) {
            r.classList.remove('selected');
            r.setAttribute('aria-checked', 'false');
            // If we were showing only one offering, reveal all on clear
            if (isFiltered) r.style.display = '';
        });
        selectedId = null;
        isFiltered = false;
        if (subtitleEl) subtitleEl.textContent = subtitleDefault;

        // Reset mobile bar
        if (confirmBar) confirmBar.hidden = true;
        if (mainEl)     mainEl.classList.remove('has-confirm-bar');

        // Reset sidebar
        if (esbEmpty)    esbEmpty.hidden    = false;
        if (esbSelected) esbSelected.hidden = true;
        if (esbPayBtn)   esbPayBtn.disabled = true;
        if (esbCancelBtn) esbCancelBtn.hidden = true;
    }

    if (cancelBtn)    cancelBtn.addEventListener('click',    clearSelection);
    if (esbCancelBtn) esbCancelBtn.addEventListener('click', clearSelection);

    // ── Preselect offering from URL param ──────────────────────
    var preselectedId = metaEl ? metaEl.dataset.preselected : '';
    if (preselectedId) {
        var preRow = document.querySelector('.offering-row[data-id="' + preselectedId + '"]');
        if (preRow) {
            // Hide every other row — only show the selected one
            rows.forEach(function (r) {
                if (r.dataset.id !== preselectedId) {
                    r.style.display = 'none';
                }
            });
            isFiltered = true;
            if (subtitleEl) subtitleEl.textContent = 'Clear selection to browse all sessions';
            selectRow(preRow);
        }
    }

    // ── Pay button (both desktop and mobile) ───────────────────
    function handlePay() {
        if (!selectedId) {
            showMessage('Please select a session to continue.', 'error');
            return;
        }

        if (typeof Razorpay === 'undefined') {
            showMessage('Payment service could not be loaded. Please refresh and try again.', 'error');
            return;
        }

        setLoading(true);
        showMessage('Preparing payment…', 'info');

        postJson('/api/payments/create-order', { courseOfferingId: selectedId })
            .then(function (orderData) {
                setLoading(false);
                openRazorpay(orderData);
            })
            .catch(function (err) {
                showMessage(err.message, 'error');
                setLoading(false);
            });
    }

    if (submitBtn)  submitBtn.addEventListener('click',  handlePay);
    if (esbPayBtn)  esbPayBtn.addEventListener('click',  handlePay);

    // ── Razorpay popup ─────────────────────────────────────────
    function openRazorpay(orderData) {
        var userName  = metaEl ? metaEl.dataset.userName   : '';
        var userEmail = metaEl ? metaEl.dataset.userEmail  : '';
        var userPhone = metaEl ? metaEl.dataset.userMobile : '';

        var options = {
            key:         orderData.keyId,
            amount:      orderData.amount,
            currency:    orderData.currency || 'INR',
            name:        'IntQues',
            description: orderData.offeringName || 'Workshop / Course',
            order_id:    orderData.orderId,
            prefill:     { name: userName, email: userEmail, contact: userPhone },
            theme:       { color: '#ff6a00' },
            handler: function (response) {
                verifyAndEnroll(
                    response.razorpay_payment_id,
                    response.razorpay_order_id,
                    response.razorpay_signature,
                    orderData.offeringId || selectedId
                );
            },
            modal: {
                ondismiss: function () {
                    showMessage('Payment was cancelled. Your selection is saved — tap "Pay & Enroll" to try again.', 'info');
                    setLoading(false);
                }
            }
        };

        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            var desc = (response.error && response.error.description) || 'Payment failed. Please try again.';
            showMessage(desc, 'error');
            setLoading(false);
        });
        rzp.open();
    }

    // ── Verify + enroll ────────────────────────────────────────
    function verifyAndEnroll(paymentId, orderId, signature, offeringId) {
        showMessage('Verifying payment…', 'info');
        setLoading(true);

        postJson('/api/payments/verify', {
            razorpayPaymentId:  paymentId,
            razorpayOrderId:    orderId,
            razorpaySignature:  signature,
            courseOfferingId:   offeringId
        })
            .then(function () {
                showMessage('Enrollment confirmed! Redirecting…', 'success');
                window.location.href = '/enrollment-success';
            })
            .catch(function (err) {
                showMessage(err.message, 'error');
                setLoading(false);
            });
    }

    // ── Helpers ────────────────────────────────────────────────
    function setLoading(loading) {
        // Mobile bar
        if (submitBtn)    submitBtn.disabled    = loading;
        if (enrollLoader) enrollLoader.hidden   = !loading;

        // Desktop sidebar
        if (esbPayBtn) esbPayBtn.disabled = loading;
        if (esbLoader) esbLoader.hidden   = !loading;
    }

    function postJson(url, body) {
        return fetch(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok) throw new Error(json.message || 'Request failed. Please try again.');
                return json;
            });
        });
    }

    function showMessage(text, type) {
        if (!messageEl) return;
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

        if (!text) {
            messageEl.textContent = '';
            messageEl.classList.remove('error', 'success', 'info', 'is-visible');
            return;
        }

        messageEl.textContent = text;
        messageEl.classList.remove('error', 'success', 'info');
        messageEl.classList.add(type || 'info', 'is-visible');

        toastTimer = setTimeout(function () {
            messageEl.classList.remove('is-visible');
            setTimeout(function () {
                messageEl.textContent = '';
                messageEl.classList.remove('error', 'success', 'info');
            }, 220);
        }, 6000);
    }
})();