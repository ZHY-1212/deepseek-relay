document.getElementById('btn-logout').addEventListener('click', () => {
    api.logout();
});

// Global toast
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Enter key for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput === document.activeElement) {
            e.preventDefault();
            const chatForm = document.getElementById('chat-form');
            if (chatForm) chatForm.dispatchEvent(new Event('submit'));
        }
    }
});
