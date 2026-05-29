registerRoute('#/login', (container) => {
    let tab = 'login';

    function render() {
        container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <div style="text-align:center;margin-bottom:8px">
                        <svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4f46e5"/><path d="M16 6C11 6 7 10 6 14 5 16 5 19 7 21 9 23 12 23 15 22 18 21 21 19 23 16 25 13 24 10 22 8 20 6 17 6 16 6Z" fill="#fff" opacity=".3"/><circle cx="12" cy="13" r="2" fill="#fff"/><path d="M17 12c1.5-1.5 5-3 7-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </div>
                    <h1>DS Relay</h1>
                    <p class="subtitle">DeepSeek AI API 聚合平台</p>
                    <div class="tabs">
                        <button id="tab-login" class="${tab === 'login' ? 'active' : ''}">登录</button>
                        <button id="tab-register" class="${tab === 'register' ? 'active' : ''}">注册</button>
                    </div>
                    <form id="auth-form">
                        ${tab === 'register' ? `
                        <input type="text" id="username" placeholder="用户名" required autocomplete="username">
                        <input type="email" id="email" placeholder="邮箱" required autocomplete="email">
                        ` : `
                        <input type="text" id="account" placeholder="用户名或邮箱" required autocomplete="username">
                        `}
                        <input type="password" id="password" placeholder="密码" required autocomplete="current-password">
                        <div id="form-error" class="error"></div>
                        <button type="submit" class="btn-submit">
                            ${tab === 'login' ? '登 录' : '注 册'}
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('tab-login').addEventListener('click', () => { tab = 'login'; render(); });
        document.getElementById('tab-register').addEventListener('click', () => { tab = 'register'; render(); });
        document.getElementById('auth-form').addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errEl = document.getElementById('form-error');
        errEl.style.display = 'none';
        const password = document.getElementById('password').value;

        try {
            if (tab === 'register') {
                const username = document.getElementById('username').value;
                const email = document.getElementById('email').value;
                const data = await api.post('/auth/register', { username, email, password });
                api.setToken(data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.api_key) {
                    localStorage.setItem('new_api_key', data.api_key);
                }
            } else {
                const account = document.getElementById('account').value;
                const data = await api.post('/auth/login', { account, password });
                api.setToken(data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            window.location.hash = '#/dashboard';
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    }

    render();
    return { unmount() {} };
});
