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

