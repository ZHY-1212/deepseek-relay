registerRoute('#/profile', (container) => {
    let currentTab = 'info';

    const tierNames = { free: '免费版', pro: '专业版', vip: '至尊版' };

    function render() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const created = user.created_at ? user.created_at.slice(0, 10) : '-';
        const now = new Date();

        container.innerHTML = `
            <div class="page-header">
                <h2>个人设置</h2>
                <p>管理你的账户信息和安全设置</p>
            </div>

            <div class="inline-tabs">
                <button id="tab-info" class="${currentTab==='info'?'active':''}">账户信息</button>
                <button id="tab-password" class="${currentTab==='password'?'active':''}">修改密码</button>
            </div>

            <div id="profile-content"></div>
        `;

        document.getElementById('tab-info').addEventListener('click', () => { currentTab='info'; render(); });
        document.getElementById('tab-password').addEventListener('click', () => { currentTab='password'; render(); });
        renderContent();
    }

    function renderContent() {
        const area = document.getElementById('profile-content');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const created = user.created_at ? user.created_at.slice(0, 10) : '-';

        if (currentTab === 'info') {
            area.innerHTML = `
                <div class="profile-section">
                    <h3>基本信息</h3>
                    <div class="card">
                        <div class="profile-field">
                            <span class="field-label">用户名</span>
                            <span class="field-value">${user.username}</span>
                        </div>
                        <div class="profile-field">
                            <span class="field-label">邮箱</span>
                            <span class="field-value">${user.email}</span>
                        </div>
                        <div class="profile-field">
                            <span class="field-label">套餐</span>
                            <span class="field-value"><span class="badge badge-${user.tier}">${tierNames[user.tier]}</span></span>
                        </div>
                        <div class="profile-field">
                            <span class="field-label">注册时间</span>
                            <span class="field-value">${created}</span>
                        </div>
                        <div class="profile-field">
                            <span class="field-label">身份</span>
                            <span class="field-value">${user.is_admin ? '管理员' : '普通用户'}</span>
                        </div>
                    </div>
                </div>

                <div class="profile-section">
                    <h3>API Key</h3>
                    <div class="card">
                        <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:12px">用于调用 API 的密钥，请妥善保管</p>
                        <div class="api-key-display" title="点击复制">${user.api_key_prefix}</div>
                        <div class="copy-hint">点击复制，完整 Key 仅在创建时显示</div>
                        <button class="btn-outline" id="btn-reset-key" style="margin-top:14px">重新生成 Key</button>
                        <span id="key-msg" class="inline-msg"></span>
                    </div>
                </div>
            `;

            const keyDisplay = area.querySelector('.api-key-display');
            keyDisplay.addEventListener('click', () => {
                navigator.clipboard.writeText(keyDisplay.textContent).then(() => showToast('已复制', 'success'));
            });
            area.querySelector('#btn-reset-key').addEventListener('click', async () => {
                if (!confirm('重新生成后旧 Key 立即失效，确认？')) return;
                try {
                    const data = await api.post('/dashboard/reset-api-key');
                    showToast('新 Key：' + data.api_key, 'success');
                    // Refresh user data
                    const profile = await api.get('/dashboard/profile');
                    localStorage.setItem('user', JSON.stringify(profile.user));
                    render();
                } catch(e) { showToast(e.message, 'error'); }
            });

        } else if (currentTab === 'password') {
            area.innerHTML = `
                <div class="profile-section">
                    <h3>修改密码</h3>
                    <div class="card" style="max-width:420px">
                        <label style="display:block;font-size:13px;font-weight:550;margin-bottom:5px">原密码</label>
                        <input type="password" id="old-pw" placeholder="输入当前密码" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--font);margin-bottom:14px;outline:none;background:var(--bg)">
                        <label style="display:block;font-size:13px;font-weight:550;margin-bottom:5px">新密码</label>
                        <input type="password" id="new-pw" placeholder="8位以上，包含字母和数字" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--font);margin-bottom:14px;outline:none;background:var(--bg)">
                        <button class="btn-primary" id="btn-change-pw" style="width:100%">修改密码</button>
                        <div id="pw-msg" class="inline-msg"></div>
                    </div>
                </div>
            `;

            area.querySelector('#btn-change-pw').addEventListener('click', async () => {
                const msg = area.querySelector('#pw-msg');
                const oldPw = area.querySelector('#old-pw').value;
                const newPw = area.querySelector('#new-pw').value;
                if (!oldPw || !newPw) { msg.className='inline-msg error'; msg.textContent='请填写所有字段'; return; }
                try {
                    await api.post('/auth/change-password', { old_password: oldPw, new_password: newPw });
                    msg.className = 'inline-msg success';
                    msg.textContent = '密码修改成功';
                    area.querySelector('#old-pw').value = '';
                    area.querySelector('#new-pw').value = '';
                } catch(e) {
                    msg.className = 'inline-msg error';
                    msg.textContent = e.message;
                }
            });
        }
    }

    render();
    return { unmount() {} };
});
