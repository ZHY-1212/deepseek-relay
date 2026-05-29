function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Theme toggle
var themeBtn = document.getElementById('btn-theme');
var savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeBtn) themeBtn.addEventListener('click', function() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// Logout
var logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) logoutBtn.addEventListener('click', function() { api.logout(); });

// Toast
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity .2s'; setTimeout(function() { toast.remove(); }, 200); }, 3500);
}

// Enter key for chat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        var el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            var form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
});
