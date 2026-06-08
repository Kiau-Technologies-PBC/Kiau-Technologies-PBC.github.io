(function () {
    function getMainTarget() {
        return document.querySelector('main, [role="main"], #projects, .section, .mosaic, .tagline-block, .hero, .content, article');
    }

    function ensureSkipLink() {
        if (!document.body || document.querySelector('.skip-link')) {
            return;
        }

        var target = getMainTarget();
        if (!target) {
            return;
        }

        if (!target.id) {
            target.id = 'main-content';
        }
        if (!target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex', '-1');
        }

        var skipLink = document.createElement('a');
        skipLink.className = 'skip-link';
        skipLink.href = '#' + target.id;
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    function normalizeHomeLinks() {
        var links = document.querySelectorAll('a[href="#"]');
        links.forEach(function (link) {
            var className = link.className || '';
            var text = (link.textContent || '').trim().toLowerCase();
            var looksLikeHome = /nav-logo|hdr-logo|nav-wordmark/.test(className) || text === 'kiau technologies';

            if (looksLikeHome) {
                link.setAttribute('href', 'index.html');
                if (!link.getAttribute('aria-label')) {
                    link.setAttribute('aria-label', 'Go to home page');
                }
            }
        });
    }

    function improveActionLinks() {
        var actionLinks = document.querySelectorAll('a[href="#"][onclick]');
        actionLinks.forEach(function (link) {
            if (!link.hasAttribute('role')) {
                link.setAttribute('role', 'button');
            }
            if (!link.hasAttribute('aria-expanded')) {
                link.setAttribute('aria-expanded', 'false');
            }
            link.addEventListener('click', function () {
                window.requestAnimationFrame(function () {
                    var expanded = /see less/i.test(link.textContent || '');
                    link.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                });
            });
            link.addEventListener('keydown', function (event) {
                if (event.key === ' ' || event.key === 'Spacebar') {
                    event.preventDefault();
                    link.click();
                }
            });
        });
    }

    function labelNavs() {
        var navs = document.querySelectorAll('nav');
        navs.forEach(function (nav, index) {
            if (!nav.getAttribute('aria-label')) {
                nav.setAttribute('aria-label', index === 0 ? 'Primary navigation' : 'Navigation');
            }
        });
    }

    function init() {
        ensureSkipLink();
        normalizeHomeLinks();
        improveActionLinks();
        labelNavs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
