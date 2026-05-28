registerRoute('#/login', (container) => {
    let tab = 'login';

    function render() {
        container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <h1>DeepSeek Relay</h1>
                    <p class="subtitle">AI API 服务平台</p>
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
