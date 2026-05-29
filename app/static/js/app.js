function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// System dark mode detection
function applySystemTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) { document.documentElement.setAttribute('data-theme', saved); return; }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
applySystemTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (!localStorage.getItem('theme')) applySystemTheme();
});

// Theme toggle button
var themeBtn = document.getElementById('btn-theme');
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

// Sound effects
var audioCtx = null;
function playSound(freq, duration, type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}
function soundSuccess() { playSound(880, 0.3); }
function soundError() { playSound(220, 0.5, 'square'); }

// Dynamic page title with balance
setInterval(function() {
    try {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        var bal = user.balance_tokens || 0;
        var money = (bal / 1000000).toFixed(1);
        document.title = (bal > 0 ? '¥' + money + ' - ' : '') + 'DS Relay';
    } catch(e) {}
}, 5000);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key for chat
    if (e.key === 'Enter' && !e.shiftKey) {
        var el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            var form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
    // Ctrl+Enter anywhere in chat
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        var el2 = document.getElementById('chat-input');
        if (el2 && document.getElementById('chat-messages')) {
            e.preventDefault();
            var form2 = document.getElementById('chat-form');
            if (form2) form2.dispatchEvent(new Event('submit'));
        }
    }
    // Ctrl+K = go to models
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.location.hash = '#/models';
    }
});
