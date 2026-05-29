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
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = user.is_admin ? '' : 'none');
    } else {
        layout.style.display = 'none';
    }

    // Highlight nav
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    const renderFn = routes[hash];
    if (renderFn) {
        if (currentPage && currentPage.unmount) currentPage.unmount();
        app.innerHTML = '';
        currentPage = renderFn(app);
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
