const routes = {};
var currentPage = null;
var currentContainer = null;

function registerRoute(hash, renderFn) {
    routes[hash] = renderFn;
}

function navigate() {
    var hash = window.location.hash || '#/login';
    var token = api.getToken();
    var isPublic = hash === '#/login';

    if (!token && !isPublic) { window.location.hash = '#/login'; return; }
    if (token && isPublic) { window.location.hash = '#/dashboard'; return; }

    var layout = document.getElementById('app-layout');
    var appPublic = document.getElementById('app');       // for auth pages
    var appMain = document.getElementById('app-main');    // for logged-in pages

    if (token && !isPublic) {
        layout.style.display = 'flex';
        appPublic.style.display = 'none';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
        currentContainer = appMain;
    } else {
        layout.style.display = 'none';
        appPublic.style.display = 'block';
        currentContainer = appPublic;
    }

    // Nav highlight
    document.querySelectorAll('.sidebar-nav a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    // Cleanup
    if (currentPage && currentPage.unmount) {
        try { currentPage.unmount(); } catch(e) {}
    }

    var renderFn = routes[hash];
    currentContainer.innerHTML = '';

    if (renderFn) {
        try {
            currentPage = renderFn(currentContainer);
        } catch(e) {
            currentContainer.innerHTML = '<p style="color:var(--red);padding:40px">页面加载出错：' + e.message + '</p>';
            console.error(e);
        }
    } else {
        currentContainer.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
