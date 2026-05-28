const routes = {};
let currentPage = null;

function registerRoute(hash, renderFn) {
    routes[hash] = renderFn;
}

function navigate() {
    const hash = window.location.hash || '#/login';
    const token = api.getToken();
    const isPublic = hash === '#/login';

    if (!token && !isPublic) {
        window.location.hash = '#/login';
        return;
    }
    if (token && isPublic) {
        window.location.hash = '#/dashboard';
        return;
    }

    // Nav visibility
    const nav = document.getElementById('top-nav');
    const adminLinks = document.querySelectorAll('.admin-only');
    if (token && !isPublic) {
        nav.style.display = 'block';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        adminLinks.forEach(el => el.style.display = user.is_admin ? 'inline' : 'none');
    } else {
        nav.style.display = 'none';
    }

    const renderFn = routes[hash];
    const app = document.getElementById('app');
    if (renderFn) {
        if (currentPage && currentPage.unmount) currentPage.unmount();
        app.innerHTML = '';
        currentPage = renderFn(app);
    } else {
        app.innerHTML = '<h2>404 Not Found</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
