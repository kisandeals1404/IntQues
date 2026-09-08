/**
 * Click handler for the nav theme toggle(s). The actual theme is already applied before this
 * script even loads (see the inline no-flash script in layout/header.ftl) — this just handles
 * switching it and keeping every toggle button's icon in sync. Class-based (not a single ID) so
 * the desktop header button and the mobile drawer's own toggle can both exist on the page at once.
 */
(function () {
    'use strict';

    function currentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-bs-theme', theme);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#1a2332' : '#ffffff');
        try { localStorage.setItem('intques-theme', theme); } catch (e) { /* private mode — theme just won't persist across reloads */ }
        syncIcons(theme);
    }

    function syncIcons(theme) {
        document.querySelectorAll('.js-theme-toggle').forEach(function (btn) {
            var icon = btn.querySelector('i');
            if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            var label = btn.querySelector('.js-theme-toggle-label');
            if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        syncIcons(currentTheme());
        document.querySelectorAll('.js-theme-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
            });
        });
    });
})();
