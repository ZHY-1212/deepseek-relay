var routes = {};
var currentPage = null;

function registerRoute(hash, renderFn) { routes[hash] = renderFn; }

function navigate() {
    var hash = window.location.hash || '#/login';
    var token = api.getToken();
    var isPublic = hash === '#/login' || hash === '#/welcome';

    // Detect session mismatch (another tab logged in as different user)
    if (token) {
        var storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                var u = JSON.parse(storedUser);
                // Token should be for the stored user — if not, force logout
                if (!u.id) { api.clearToken(); window.location.hash = '#/login'; return; }
            } catch(e) { api.clearToken(); window.location.hash = '#/login'; return; }
        }
    }

    if (!token && !isPublic) { window.location.hash = '#/welcome'; return; }
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

    // Support parameterized routes
    var renderFn = routes[hash];
    if (!renderFn) {
        Object.keys(routes).forEach(function(key) {
            if (hash.indexOf(key) === 0 && key !== '#/login') renderFn = routes[key];
        });
    }

    // Show loading immediately
    app.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-tertiary);font-size:14px">加载中...</div>';

    if (renderFn) {
        // Use setTimeout to let the loading state render before heavy work
        setTimeout(function() {
            try { currentPage = renderFn(app); } catch(e) {
                app.innerHTML = '<p style="color:var(--red);padding:40px">加载出错：'+e.message+'</p>';
            }
        }, 10);
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
