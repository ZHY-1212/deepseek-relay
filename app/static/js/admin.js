registerRoute('#/admin', (container) => {
    let adminData = null;
    let currentTab = 'users';

    async function load() {
        try {
            adminData = await api.get('/admin/dashboard');
        } catch (e) {
            container.innerHTML = `<p>Error: ${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const s = adminData.stats;
        container.innerHTML = `
            <h2>Admin Panel</h2>
            <div class="grid-3">
                <div class="card"><h4>Total Users</h4><h2>${adminData.total_users}</h2></div>
                <div class="card"><h4>Total Tokens</h4><h2>${s.total_tokens.toLocaleString()}</h2></div>
                <div class="card"><h4>Total Requests</h4><h2>${s.total_requests.toLocaleString()}</h2></div>
            </div>
            <div class="grid-3">
                <div class="card"><h4>Today Tokens</h4><h2>${s.today_tokens.toLocaleString()}</h2></div>
                <div class="card"><h4>Today Requests</h4><h2>${s.today_requests}</h2></div>
                <div class="card"><h4>Active Users</h4><h2>${s.unique_users}</h2></div>
            </div>

            <div role="group" style="margin:1.5rem 0">
                <button id="tab-users" class="${currentTab==='users'?'':'outline'}">Users</button>
                <button id="tab-tiers" class="${currentTab==='tiers'?'':'outline'}">Tier Config</button>
            </div>

            <div id="admin-content-area"></div>
        `;

        document.getElementById('tab-users').addEventListener('click', () => { currentTab='users'; renderContent(); });
        document.getElementById('tab-tiers').addEventListener('click', () => { currentTab='tiers'; renderContent(); });
        renderContent();
    }

    function renderContent() {
        const area = document.getElementById('admin-content-area');
        if (currentTab === 'users') {
            area.innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>User</th><th>Email</th><th>Tier</th><th>Balance</th><th>API Key</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>${adminData.users.map(u => `
                        <tr class="${u.is_banned ? 'banned-row' : ''}">
                            <td>${u.username} ${u.is_admin ? '⭐' : ''}</td>
                            <td>${u.email}</td>
                            <td><span class="badge badge-${u.tier}">${u.tier}</span></td>
                            <td>${u.balance_tokens.toLocaleString()}</td>
                            <td><code>${u.api_key_prefix}</code></td>
                            <td>${u.is_banned ? 'BANNED' : 'Active'}</td>
                            <td>
                                ${!u.is_admin ? `
                                <button class="outline btn-ban" data-id="${u.id}" data-banned="${u.is_banned}">
                                    ${u.is_banned ? 'Unban' : 'Ban'}
                                </button>
                                <select class="tier-select" data-id="${u.id}" style="width:auto;display:inline;margin-left:4px">
                                    <option value="free" ${u.tier==='free'?'selected':''}>Free</option>
                                    <option value="pro" ${u.tier==='pro'?'selected':''}>Pro</option>
                                    <option value="vip" ${u.tier==='vip'?'selected':''}>VIP</option>
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
                        showToast('User ban status toggled', 'success');
                        await load();
                    } catch(e) { showToast(e.message, 'error'); }
                });
            });

            document.querySelectorAll('.tier-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const id = sel.dataset.id;
                    try {
                        await api.put(`/admin/users/${id}/tier`, { tier: sel.value });
                        showToast('Tier updated', 'success');
                        await load();
                    } catch(e) { showToast(e.message, 'error'); }
                });
            });

        } else if (currentTab === 'tiers') {
            const tiers = adminData.tiers;
            area.innerHTML = Object.entries(tiers).map(([key, t]) => `
                <div class="card">
                    <h4>${t.name} (${key})</h4>
                    <p>Tokens/month: ${t.tokens_per_month.toLocaleString()}</p>
                    <p>Requests/day: ${t.requests_per_day ?? 'Unlimited'}</p>
                    <p>Price: $${t.price}/mo</p>
                </div>
            `).join('');
        }
    }

    load();
    return { unmount() {} };
});
