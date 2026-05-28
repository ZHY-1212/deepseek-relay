registerRoute('#/admin', (container) => {
    let adminData = null;
    let currentTab = 'users';

    async function load() {
        try {
            adminData = await api.get('/admin/dashboard');
        } catch (e) {
            container.innerHTML = `<p style="color:var(--danger)">加载失败：${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const s = adminData.stats;
        container.innerHTML = `
            <h2>管理后台</h2>
            <div class="stats-grid">
                <div class="stat-card"><div class="label">用户总数</div><div class="value">${adminData.total_users}</div></div>
                <div class="stat-card"><div class="label">累计 Token</div><div class="value">${s.total_tokens.toLocaleString()}</div></div>
                <div class="stat-card"><div class="label">累计请求</div><div class="value">${s.total_requests.toLocaleString()}</div></div>
                <div class="stat-card"><div class="label">今日 Token</div><div class="value">${s.today_tokens.toLocaleString()}</div></div>
                <div class="stat-card"><div class="label">今日请求</div><div class="value">${s.today_requests}</div></div>
                <div class="stat-card"><div class="label">活跃用户</div><div class="value">${s.unique_users}</div></div>
            </div>

            <div class="tabs" style="margin:1.5rem 0;display:inline-flex">
                <button id="tab-users" class="${currentTab==='users'?'active':''}">用户管理</button>
                <button id="tab-tiers" class="${currentTab==='tiers'?'active':''}">套餐配置</button>
            </div>

            <div id="admin-content-area"></div>
        `;

        document.getElementById('tab-users').addEventListener('click', () => { currentTab='users'; renderContent(); });
        document.getElementById('tab-tiers').addEventListener('click', () => { currentTab='tiers'; renderContent(); });

        // Style tabs
        document.querySelectorAll('#tab-users, #tab-tiers').forEach(btn => {
            btn.style.cssText = 'padding:0.5rem 1rem;border:none;background:' + (btn.classList.contains('active') ? 'var(--primary-bg)' : 'transparent') + ';color:' + (btn.classList.contains('active') ? 'var(--primary)' : 'var(--text-muted)') + ';cursor:pointer;border-radius:8px;font-weight:500;font-size:0.9rem';
        });

        renderContent();
    }

    function renderContent() {
        const area = document.getElementById('admin-content-area');
        if (currentTab === 'users') {
            area.innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>用户</th><th>邮箱</th><th>套餐</th><th>余额</th><th>API Key</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>${adminData.users.map(u => `
                        <tr class="${u.is_banned ? 'banned-row' : ''}">
                            <td>${u.username} ${u.is_admin ? '⭐' : ''}</td>
                            <td>${u.email}</td>
                            <td><span class="badge badge-${u.tier}">${u.tier}</span></td>
                            <td>${u.balance_tokens.toLocaleString()}</td>
                            <td><code style="font-size:0.8rem">${u.api_key_prefix}</code></td>
                            <td>${u.is_banned ? '<span style="color:var(--danger)">已封禁</span>' : '<span style="color:var(--success)">正常</span>'}</td>
                            <td>
                                ${!u.is_admin ? `
                                <button class="btn-sm btn-ban" data-id="${u.id}" data-banned="${u.is_banned}">
                                    ${u.is_banned ? '解封' : '封禁'}
                                </button>
                                <select class="tier-select" data-id="${u.id}" style="margin-left:4px">
                                    <option value="free" ${u.tier==='free'?'selected':''}>免费版</option>
                                    <option value="pro" ${u.tier==='pro'?'selected':''}>专业版</option>
                                    <option value="vip" ${u.tier==='vip'?'selected':''}>至尊版</option>
                                </select>` : ''}
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            `;

            document.querySelectorAll('.btn-ban').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    try {
                        await api.put(`/admin/users/${id}/ban`);
                        showToast('用户状态已更新', 'success');
                        await load();
                    } catch(e) { showToast(e.message, 'error'); }
                });
            });

            document.querySelectorAll('.tier-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const id = sel.dataset.id;
                    try {
                        await api.put(`/admin/users/${id}/tier`, { tier: sel.value });
                        showToast('套餐已更新', 'success');
                        await load();
                    } catch(e) { showToast(e.message, 'error'); }
                });
            });

        } else if (currentTab === 'tiers') {
            const tiers = adminData.tiers;
            const tierNames = { free: '免费版', pro: '专业版', vip: '至尊版' };
            area.innerHTML = `
                <div class="stats-grid">
                    ${Object.entries(tiers).map(([key, t]) => `
                    <div class="stat-card">
                        <div class="label">${tierNames[key]} (${key})</div>
                        <div class="value" style="font-size:1.4rem">${t.tokens_per_month.toLocaleString()} <span style="font-size:0.85rem;color:var(--text-muted);font-weight:400">Token/月</span></div>
                        <div style="color:var(--text-muted);font-size:0.85rem">
                            ${t.requests_per_day ? t.requests_per_day.toLocaleString() + ' 请求/天' : '请求无限制'} &middot; ¥${(t.price * 7.2).toFixed(0)}/月
                        </div>
                    </div>
                    `).join('')}
                </div>
            `;
        }
    }

    load();
    return { unmount() {} };
});
