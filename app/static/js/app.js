// App entry point
document.getElementById('btn-logout').addEventListener('click', () => {
    api.logout();
});

// Global toast helper
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Handle Enter key for chat input globally
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const chatInput = document.getElementById('chat-input');
        const chatForm = document.getElementById('chat-form');
        if (chatInput === document.activeElement && chatForm) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    }
});
