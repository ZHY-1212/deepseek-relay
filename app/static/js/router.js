var routes = {};
var currentPage = null;

function registerRoute(hash, renderFn) { routes[hash] = renderFn; }

function navigate() {
    var hash = window.location.hash || '#/login';
    var token = api.getToken();
    var isPublic = hash === '#/login';

    if (!token && !isPublic) { window.location.hash = '#/login'; return; }
    if (token && isPublic) { window.location.hash = '#/models'; return; }

    var topnav = document.getElementById('topnav');
    var app = document.getElementById('app');

    if (token && !isPublic) {
        topnav.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else {
        topnav.style.display = 'none';
    }

    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    if (currentPage && currentPage.unmount) { try { currentPage.unmount(); } catch(e) {} }

    // Support parameterized routes like #/pay/10
    var renderFn = routes[hash];
    if (!renderFn) {
        // Try prefix match
        Object.keys(routes).forEach(function(key) {
            if (hash.indexOf(key) === 0 && key !== '#/login') renderFn = routes[key];
        });
    }
    app.innerHTML = '';
    app.removeAttribute('style');

    if (renderFn) {
        try { currentPage = renderFn(app); } catch(e) {
            app.innerHTML = '<p style="color:var(--red);padding:40px">加载出错：' + e.message + '</p>';
        }
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">404</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
