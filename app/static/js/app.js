// Theme toggle
const themeBtn = document.getElementById('btn-theme');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    api.logout();
});

// Toast
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .2s';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

// Enter for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            const form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
});
