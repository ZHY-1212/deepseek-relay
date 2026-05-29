const routes = {};
let currentPage = null;

function registerRoute(hash, renderFn) {
    routes[hash] = renderFn;
}

function navigate() {
    const hash = window.location.hash || '#/login';
    const token = api.getToken();
    const isPublic = hash === '#/login';

    if (!token && !isPublic) { window.location.hash = '#/login'; return; }
    if (token && isPublic) { window.location.hash = '#/dashboard'; return; }

    const layout = document.getElementById('app-layout');
    const app = document.getElementById('app');

    if (token && !isPublic) {
        layout.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else {
        layout.style.display = 'none';
    }

    // Nav highlight
    document.querySelectorAll('.sidebar-nav a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    // Cleanup previous page
    if (currentPage && currentPage.unmount) {
        try { currentPage.unmount(); } catch(e) {}
    }

    var renderFn = routes[hash];
    app.innerHTML = '';

    if (renderFn) {
        try {
            currentPage = renderFn(app);
        } catch(e) {
            app.innerHTML = '<p style="color:var(--red);padding:40px">页面加载出错：' + e.message + '</p>';
            console.error('Route error:', e);
        }
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
