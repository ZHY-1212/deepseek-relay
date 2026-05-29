registerRoute('#/dashboard', (container) => {
    let profile = null;

    const tierNames = { free: '免费版', pro: '专业版', vip: '至尊版' };
    const tierIcons = { free: '◯', pro: '◉', vip: '◆' };

    async function load() {
        try {
            profile = await api.get('/dashboard/profile');
            localStorage.setItem('user', JSON.stringify(profile.user));
        } catch (e) {
            container.innerHTML = `<p style="color:var(--red)">加载失败：${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const u = profile.user;
        const usage = profile.usage;
        const tierDefs = {
            free: { tokens: 100000, reqs: 50, price: 0, icon: '◯', desc: '试用体验' },
            pro: { tokens: 2000000, reqs: 500, price: 19.9, icon: '◉', desc: '个人开发者' },
            vip: { tokens: 10000000, reqs: '无限制', price: 49.9, icon: '◆', desc: '企业级用户' },
        };
        const currentTier = tierDefs[u.tier];
        const pct = Math.min(100, (u.balance_tokens / currentTier.tokens) * 100);
        const meterColor = pct > 60 ? 'var(--green)' : pct > 30 ? 'var(--amber)' : 'var(--red)';

        const newApiKey = localStorage.getItem('new_api_key');
        if (newApiKey) {
            setTimeout(() => { showToast('API Key（仅显示一次）：' + newApiKey, 'success'); localStorage.removeItem('new_api_key'); }, 500);
        }

        container.innerHTML = `
            <div class="page-header">
                <h2>仪表盘</h2>
                <p>欢迎回来，${u.username}</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">⚡</div>
                    <div class="stat-label">Token 余额</div>
                    <div class="stat-value">${(u.balance_tokens / 1000).toFixed(1)}<span style="font-size:14px;font-weight:500;color:var(--text-secondary)">k</span></div>
                    <div class="meter"><div class="meter-fill" style="width:${pct}%;background:${meterColor}"></div></div>
                    <div class="stat-sub">本月额度 / ${(currentTier.tokens/1000).toFixed(0)}k</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-label">今日请求</div>
                    <div class="stat-value">${usage.today_requests}</div>
                    <div class="stat-sub">今日 Token：${usage.today_tokens.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-label">累计请求</div>
                    <div class="stat-value">${usage.total_requests}</div>
                    <div class="stat-sub">累计 Token：${usage.total_tokens.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${tierIcons[u.tier]}</div>
                    <div class="stat-label">当前套餐</div>
                    <div class="stat-value" style="font-size:20px">${tierNames[u.tier]}</div>
                    <div class="stat-sub">${currentTier.desc}</div>
                </div>
            </div>

            <div class="section-title">📉 近 7 天用量趋势</div>
            <div class="card">
                ${buildChart(usage.last_7_days)}
                <div class="chart-labels">${usage.last_7_days.map(d => `<span>${d.date.slice(5)}</span>`).join('')}</div>
            </div>

            <div class="section-title">${tierIcons[u.tier]} 升级套餐</div>
            <div class="tier-grid">
                ${['free','pro','vip'].map(t => {
                    const d = tierDefs[t];
                    const isCurrent = u.tier === t;
                    return `
                    <div class="tier-card ${isCurrent ? 'active' : ''}" id="tier-${t}">
                        <div class="tier-icon">${d.icon}</div>
                        <h3>${tierNames[t]}</h3>
                        <div class="price">${d.price === 0 ? '免费' : '¥' + d.price}<span>/月</span></div>
                        <div class="features">
                            <div>◆ ${d.tokens.toLocaleString()} Token</div>
                            <div>◆ ${typeof d.reqs === 'number' ? d.reqs.toLocaleString() : d.reqs} 请求/天</div>
                            <div>◆ ${d.desc}</div>
                        </div>
                        <button ${isCurrent ? 'disabled' : ''} id="btn-upgrade-${t}">
                            ${isCurrent ? '当前套餐' : '立即升级'}
                        </button>
                    </div>`;
                }).join('')}
            </div>

            <div class="section-title">🔑 API Key
                <span class="badge badge-${u.tier}" style="margin-left:8px">${tierNames[u.tier]}</span>
            </div>
            <div class="card">
                <div class="api-key-display" title="点击复制">${u.api_key_prefix}</div>
                <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
                    <span style="font-size:12px;color:var(--text-tertiary)">完整 Key 仅在创建时显示一次</span>
                    <button class="btn-sm" id="btn-reset-key" style="margin-left:auto">重新生成</button>
                </div>
            </div>
        `;

        // Chart bars hover
        document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.addEventListener('mouseenter', function() { this.style.opacity = '1'; });
            bar.addEventListener('mouseleave', function() { this.style.opacity = ''; });
        });

        // API key click
        document.querySelector('.api-key-display')?.addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => showToast('已复制', 'success'));
        });

        // Reset key
        document.getElementById('btn-reset-key')?.addEventListener('click', async () => {
            if (!confirm('重新生成后旧 Key 立即失效，确认？')) return;
            try {
                const data = await api.post('/dashboard/reset-api-key');
                showToast('新 Key：' + data.api_key, 'success');
                await load();
            } catch(e) { showToast(e.message, 'error'); }
        });

        // Upgrade buttons
        ['free','pro','vip'].forEach(t => {
            const btn = document.getElementById('btn-upgrade-' + t);
            if (btn && !btn.disabled) {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        const order = await api.post('/payment/create-order', { tier: t });
                        showPaymentModal(order, tierNames[t], tierDefs[t].price);
                    } catch(er) { showToast(er.message, 'error'); }
                });
            }
        });
    }

    function buildChart(days) {
        const maxVal = Math.max(1, ...days.map(d => d.tokens));
        return '<div class="chart-bars">' + days.map(d => {
            const h = Math.max(4, (d.tokens / maxVal) * 100);
            return `<div class="chart-bar" style="height:${h}%;background:${d.tokens > 0 ? 'var(--accent)' : 'var(--border)'};opacity:${d.tokens > 0 ? '.65' : '.4'}"><span class="bar-tip">${d.tokens.toLocaleString()}</span></div>`;
        }).join('') + '</div>';
    }

    load();
    return { unmount() {} };
});

// Payment modal (shared)
function showPaymentModal(order, tierName, price) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-header"><h3>升级至 ${tierName}</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body" style="text-align:center">
                <div style="font-size:2.5rem;font-weight:700;margin-bottom:4px">¥${price}</div>
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">订单号：${order.order_id.slice(0,8)}…</p>
                <div style="background:var(--bg-hover);border-radius:var(--radius);padding:16px;margin-bottom:16px;font-size:13px;color:var(--text-secondary);text-align:left;line-height:1.8">
                    <strong style="color:var(--text)">📋 付款说明</strong><br>
                    1. 联系管理员获取收款码<br>
                    2. 付款时备注订单号<br>
                    3. 管理员确认后自动升级
                </div>
                <p style="font-size:12px;color:var(--text-tertiary)">支付后请联系管理员确认</p>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
