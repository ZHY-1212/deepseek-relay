registerRoute('#/login', (container) => {
    let tab = 'login';

    function render() {
        container.innerHTML = `
            <div style="max-width:420px;margin:3rem auto">
                <h1 style="text-align:center">DeepSeek Relay</h1>
                <p style="text-align:center;color:var(--pico-muted-color)">AI API Platform</p>
                <div role="group" style="margin-bottom:1.5rem">
                    <button id="tab-login" class="${tab === 'login' ? '' : 'outline'}">Login</button>
                    <button id="tab-register" class="${tab === 'register' ? '' : 'outline'}">Register</button>
                </div>
                <form id="auth-form">
                    ${tab === 'register' ? `
                    <label>Username
                        <input type="text" id="username" required autocomplete="username">
                    </label>` : ''}
                    <label>Email
                        <input type="email" id="email" required autocomplete="email">
                    </label>
                    <label>Password
                        <input type="password" id="password" required autocomplete="current-password">
                    </label>
                    <div id="form-error" style="color:#d63031;margin-bottom:0.5rem;display:none"></div>
                    <button type="submit" class="contrast" style="width:100%">
                        ${tab === 'login' ? 'Login' : 'Register'}
                    </button>
                </form>
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
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            if (tab === 'register') {
                const username = document.getElementById('username').value;
                const data = await api.post('/auth/register', { username, email, password });
                api.setToken(data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.api_key) {
                    localStorage.setItem('new_api_key', data.api_key);
                }
            } else {
                const data = await api.post('/auth/login', { email, password });
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
