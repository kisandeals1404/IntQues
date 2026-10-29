document.addEventListener('DOMContentLoaded', function () {
    var navbar = document.querySelector('.navbar');
    var navbarCollapse = document.getElementById('navbarNav');
    var navbarToggler = document.querySelector('.navbar-toggler');

    // Add shadow when scrolled
    if (navbar) {
        var onScroll = function () {
            navbar.classList.toggle('scrolled', window.scrollY > 12);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // On-screen keyboard open (touch, text field focused): flag <html> so CSS can hide the fixed
    // bottom tab bar — otherwise it rides up above the keyboard and covers search suggestions.
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        var isTextField = function (el) {
            if (!el || !el.tagName) return false;
            if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
            if (el.tagName !== 'INPUT') return false;
            return !/^(button|checkbox|radio|range|submit|reset|file|image|color|hidden)$/i.test(el.type || '');
        };
        document.addEventListener('focusin', function (e) {
            if (isTextField(e.target)) document.documentElement.classList.add('kb-open');
        });
        document.addEventListener('focusout', function () {
            // Defer so focus moving straight to another field doesn't flash the bar back in.
            setTimeout(function () {
                if (!isTextField(document.activeElement)) document.documentElement.classList.remove('kb-open');
            }, 50);
        });
    }

    // "Explore" mega menu opens on hover for mouse users (click and keyboard still work).
    var mega = document.querySelector('.nav-mega-wrap');
    if (mega && typeof bootstrap !== 'undefined' && window.matchMedia('(hover: hover) and (min-width: 992px)').matches) {
        var megaToggle = mega.querySelector('[data-bs-toggle="dropdown"]');
        var megaDrop = bootstrap.Dropdown.getOrCreateInstance(megaToggle);
        var megaTimer = null, hoverOpenedAt = 0;
        mega.addEventListener('mouseenter', function () {
            clearTimeout(megaTimer);
            if (!megaToggle.classList.contains('show')) { hoverOpenedAt = Date.now(); megaDrop.show(); }
        });
        // The click that usually follows the hover must not close what the hover just opened.
        // (Bootstrap handles toggle clicks in the capture phase on document, so this listens on window first.)
        window.addEventListener('click', function (e) {
            if (!megaToggle.contains(e.target)) return;
            if (Date.now() - hoverOpenedAt < 800 && megaToggle.classList.contains('show')) {
                e.preventDefault(); e.stopPropagation();
            }
        }, true);
        mega.addEventListener('mouseleave', function () { megaTimer = setTimeout(function () { megaDrop.hide(); }, 180); });
    }

    if (!navbarCollapse || !navbarToggler || typeof bootstrap === 'undefined') {
        return;
    }

    // Close mobile menu when a non-dropdown nav-link is clicked
    var navLinks = navbarCollapse.querySelectorAll('.nav-link:not(.nav-dropdown-toggle)');
    navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            var isMobileToggleVisible = window.getComputedStyle(navbarToggler).display !== 'none';
            var isExpanded = navbarCollapse.classList.contains('show');
            if (isMobileToggleVisible && isExpanded) {
                bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
            }
        });
    });
});

