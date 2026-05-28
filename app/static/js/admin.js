registerRoute('#/admin', (container) => {
    let adminData = null;
    let currentTab = 'users';
    let orders = [];

    async function load() {
        try {
            adminData = await api.get('/admin/dashboard');
            orders = await api.get('/payment/orders');
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
                <button id="tab-orders" class="${currentTab==='orders'?'active':''}">订单管理 ${orders.filter(o => o.status === 'pending').length ? '<span style="background:var(--red);color:#fff;border-radius:10px;padding:0 6px;font-size:0.7rem;margin-left:4px">'+orders.filter(o => o.status === 'pending').length+'</span>' : ''}</button>
                <button id="tab-tiers" class="${currentTab==='tiers'?'active':''}">套餐配置</button>
            </div>

            <div id="admin-content-area"></div>
        `;

        document.getElementById('tab-users').addEventListener('click', () => { currentTab='users'; renderContent(); });
        document.getElementById('tab-orders').addEventListener('click', () => { currentTab='orders'; renderContent(); });
        document.getElementById('tab-tiers').addEventListener('click', () => { currentTab='tiers'; renderContent(); });

        // Style tabs
        document.querySelectorAll('#tab-users, #tab-orders, #tab-tiers').forEach(btn => {
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

        } else if (currentTab === 'orders') {
            const tierNames = { free: '免费版', pro: '专业版', vip: '至尊版' };
            const statusNames = { pending: '待处理', paid: '已支付', cancelled: '已取消' };
            const statusColors = { pending: 'var(--orange)', paid: 'var(--green)', cancelled: 'var(--text-secondary)' };
            area.innerHTML = orders.length === 0
                ? '<p style="color:var(--text-secondary);padding:2rem;text-align:center">暂无订单</p>'
                : `
                <table class="admin-table">
                    <thead><tr><th>订单号</th><th>用户</th><th>套餐</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
                    <tbody>${orders.map(o => `
                        <tr>
                            <td><code style="font-size:0.75rem">${o.id.slice(0,8)}</code></td>
                            <td>${o.username}</td>
                            <td>${tierNames[o.tier] || o.tier}</td>
                            <td>¥${o.amount}</td>
                            <td><span style="color:${statusColors[o.status]};font-weight:600">${statusNames[o.status]}</span></td>
                            <td style="font-size:0.8rem;color:var(--text-secondary)">${o.created_at ? o.created_at.slice(0,16).replace('T',' ') : ''}</td>
                            <td>
                                ${o.status === 'pending' ? `
                                <button class="btn-sm btn-confirm" data-id="${o.id}" style="color:var(--green);border-color:var(--green);margin-right:4px">确认</button>
                                <button class="btn-sm btn-cancel-order" data-id="${o.id}" style="color:var(--red);border-color:var(--red)">取消</button>
                                ` : '-'}
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            `;

            document.querySelectorAll('.btn-confirm').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await api.put(`/payment/orders/${btn.dataset.id}/confirm`);
                        showToast('订单已确认，用户已升级', 'success');
                        await load();
                    } catch(e) { showToast(e.message, 'error'); }
                });
            });
            document.querySelectorAll('.btn-cancel-order').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await api.put(`/payment/orders/${btn.dataset.id}/cancel`);
                        showToast('订单已取消', 'success');
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
                            ${t.requests_per_day ? t.requests_per_day.toLocaleString() + ' 请求/天' : '请求无限制'} &middot; ¥${t.price}/月
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
