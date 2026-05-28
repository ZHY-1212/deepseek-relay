registerRoute('#/dashboard', (container) => {
    let profile = null;
    let selectedTier = null;

    const tierNames = { free: '免费版', pro: '专业版', vip: '至尊版' };
    const tierColors = { free: 'badge-free', pro: 'badge-pro', vip: 'badge-vip' };

    async function load() {
        try {
            profile = await api.get('/dashboard/profile');
            selectedTier = profile.user.tier;
            localStorage.setItem('user', JSON.stringify(profile.user));
        } catch (e) {
            container.innerHTML = `<p style="color:var(--danger)">加载失败：${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const u = profile.user;
        const usage = profile.usage;
        const tierDefs = {
            free: { tokens: 100000, reqs: 50, price: 0 },
            pro: { tokens: 2000000, reqs: 500, price: 19.9 },
            vip: { tokens: 10000000, reqs: '无限制', price: 49.9 },
        };

        const currentTier = tierDefs[u.tier];
        const pct = currentTier.tokens > 0 ? Math.min(100, (u.balance_tokens / currentTier.tokens) * 100) : 0;
        const meterColor = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444';

        const newApiKey = localStorage.getItem('new_api_key');
        if (newApiKey) {
            setTimeout(() => {
                showToast('你的 API Key（仅显示一次）：' + newApiKey, 'success');
                localStorage.removeItem('new_api_key');
            }, 500);
        }

        container.innerHTML = `
            <h2>仪表盘</h2>
            <div class="stats-grid">
                <div class="card">
                    <div class="card-header"><strong>API Key</strong> <span class="badge ${tierColors[u.tier]}">${tierNames[u.tier]}</span></div>
                    <div class="api-key-display" title="点击复制">${u.api_key_prefix}</div>
                    <div class="copy-hint">完整 Key 仅在创建时显示一次</div>
                    <button class="btn-outline" id="btn-reset-key" style="margin-top:0.5rem;width:100%">重新生成</button>
                </div>
                <div class="card">
                    <div class="card-header"><strong>Token 余额</strong></div>
                    <div class="stat-card" style="box-shadow:none;border:none;padding:0;margin:0">
                        <div class="value">${u.balance_tokens.toLocaleString()} <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">/ ${currentTier.tokens.toLocaleString()}</span></div>
                    </div>
                    <div class="meter"><div class="meter-fill" style="width:${pct}%;background:${meterColor}"></div></div>
                    <small style="color:var(--text-muted)">本月剩余 Token</small>
                </div>
                <div class="card">
                    <div class="card-header"><strong>使用统计</strong></div>
                    <div style="display:flex;justify-content:space-between;margin-top:0.5rem">
                        <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700">${usage.today_requests}</div><small style="color:var(--text-muted)">今日请求</small></div>
                        <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700">${usage.today_tokens.toLocaleString()}</div><small style="color:var(--text-muted)">今日 Token</small></div>
                        <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700">${usage.total_requests}</div><small style="color:var(--text-muted)">总计请求</small></div>
                    </div>
                </div>
            </div>

            <div class="section-title">升级套餐</div>
            <div class="tier-grid">
                ${['free','pro','vip'].map(t => {
                    const d = tierDefs[t];
                    const active = selectedTier === t ? 'active' : '';
                    const isCurrent = u.tier === t;
                    return `
                    <div class="tier-card ${active}" id="tier-${t}">
                        <h3>${tierNames[t]}</h3>
                        <div class="price">${d.price === 0 ? '免费' : '¥' + d.price + '/月'}</div>
                        <p>${d.tokens.toLocaleString()} Token/月</p>
                        <p>${typeof d.reqs === 'number' ? d.reqs.toLocaleString() : d.reqs} 请求/天</p>
                        <button ${isCurrent ? 'disabled' : ''}>${isCurrent ? '当前套餐' : '立即升级'}</button>
                    </div>`;
                }).join('')}
            </div>

            <div class="section-title">近 7 天用量</div>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
                <thead><tr style="color:var(--text-muted)"><th style="text-align:left;padding:0.5rem">日期</th><th style="text-align:right;padding:0.5rem">Token</th><th style="text-align:right;padding:0.5rem">请求数</th></tr></thead>
                <tbody>
                    ${usage.last_7_days.map(d => `
                    <tr style="border-bottom:1px solid var(--border)"><td style="padding:0.5rem">${d.date}</td><td style="text-align:right;padding:0.5rem">${d.tokens.toLocaleString()}</td><td style="text-align:right;padding:0.5rem">${d.requests}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelector('.api-key-display').addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => showToast('已复制', 'success'));
        });
        document.getElementById('btn-reset-key').addEventListener('click', async () => {
            if (!confirm('重新生成 API Key？旧 Key 将立即失效。')) return;
            try {
                const data = await api.post('/dashboard/reset-api-key');
                showToast('新 API Key：' + data.api_key, 'success');
                await load();
            } catch(e) { showToast(e.message, 'error'); }
        });

        ['free','pro','vip'].forEach(t => {
            document.getElementById('tier-' + t).addEventListener('click', () => { selectedTier = t; render(); });
            const btn = document.querySelector('#tier-' + t + ' button');
            if (btn && !btn.disabled && t !== u.tier) {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        // Create order
                        const order = await api.post('/payment/create-order', { tier: t });
                        const tierDef = tierDefs[t];
                        showPaymentModal(order, tierNames[t], tierDef.price);
                    } catch(er) { showToast(er.message, 'error'); }
                });
            }
        });
    }

    load();
    return { unmount() {} };
});

// Payment modal - shared across dashboard
function showPaymentModal(order, tierName, price) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>升级至 ${tierName}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;margin-bottom:1.5rem">
                    <div style="font-size:2.5rem;font-weight:800;color:var(--blue);letter-spacing:-0.03em">¥${price}</div>
                    <div style="color:var(--text-secondary);font-size:0.85rem">订单号：${order.order_id.slice(0,8)}...</div>
                </div>
                <div style="background:rgba(0,0,0,0.02);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
                    <div style="font-weight:600;margin-bottom:0.5rem">付款方式</div>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin:0">
                        请使用支付宝或微信扫描下方二维码付款，<br>付款后在备注中填写订单号。
                    </p>
                </div>
                <div style="text-align:center;padding:1rem;background:#fff;border-radius:var(--radius);border:1px solid rgba(0,0,0,0.06)">
                    <div style="font-size:6rem;margin-bottom:0.5rem">💳</div>
                    <p style="font-size:0.85rem;color:var(--text-secondary)">
                        请联系管理员获取收款码<br>
                        或等待管理员手动确认升级
                    </p>
                </div>
                <p style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin-top:1rem">
                    付款后请联系管理员确认，或等待自动确认
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

