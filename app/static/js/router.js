var routes = {};
var currentPage = null;

function registerRoute(hash, renderFn) { routes[hash] = renderFn; }

function navigate() {
    var hash = window.location.hash || '#/login';
    // Normalize parameterized routes (longest match first to avoid #/models matching #/models-intro)
    var bestKey = '';
    for (var k in routes) {
        if (hash.indexOf(k) === 0 && k.length > bestKey.length && k !== '#/login') { bestKey = k; }
    }
    if (bestKey) hash = bestKey;
    var token = api.getToken();
    var isPublic = hash === '#/login' || hash === '#/welcome';

    if (!token && !isPublic) { window.location.hash = '#/welcome'; return; }
    if (token && isPublic) { window.location.hash = '#/models'; return; }

    var topnav = document.getElementById('topnav');
    var app = document.getElementById('app');

    if (token && !isPublic) {
        topnav.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else { topnav.style.display = 'none'; }

    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    if (currentPage && currentPage.unmount) { try { currentPage.unmount(); } catch(e) {} }

    app.innerHTML = '<div style="text-align:center;padding:60px 0"><div style="width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div></div>';

    var renderFn = routes[hash];
    if (renderFn) {
        setTimeout(function() {
            try { currentPage = renderFn(app); } catch(e) {
                app.innerHTML = '<p style="color:var(--red);padding:40px">错误：'+e.message+'</p>';
            }
        }, 10);
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
