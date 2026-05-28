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
            free: { tokens: 100000, reqs: 100, price: 0 },
            pro: { tokens: 1000000, reqs: 1000, price: 29 },
            vip: { tokens: 10000000, reqs: '无限制', price: 99 },
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
                        <div class="price">${d.price === 0 ? '免费' : '¥' + (d.price * 7.2).toFixed(0) + '/月'}</div>
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
                        await api.post('/dashboard/upgrade', { tier: t });
                        showToast('已升级至 ' + tierNames[t] + '！', 'success');
                        await load();
                    } catch(er) { showToast(er.message, 'error'); }
                });
            }
        });
    }

    load();
    return { unmount() {} };
});
