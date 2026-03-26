document.addEventListener('DOMContentLoaded', function () {
    var navbarCollapse = document.getElementById('navbarNav');
    var navbarToggler = document.querySelector('.navbar-toggler');

    if (!navbarCollapse || !navbarToggler || typeof bootstrap === 'undefined') {
        return;
    }

    var navLinks = navbarCollapse.querySelectorAll('.nav-link');

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

