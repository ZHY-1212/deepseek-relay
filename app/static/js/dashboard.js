registerRoute('#/dashboard', (container) => {
    let profile = null;
    let selectedTier = null;

    const tierNames = { free: 'Free', pro: 'Pro', vip: 'VIP' };
    const tierColors = { free: 'badge-free', pro: 'badge-pro', vip: 'badge-vip' };

    async function load() {
        try {
            profile = await api.get('/dashboard/profile');
            selectedTier = profile.user.tier;
            const user = profile.user;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {
            container.innerHTML = `<p>Error loading dashboard: ${e.message}</p>`;
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
            vip: { tokens: 10000000, reqs: 'Unlimited', price: 99 },
        };

        const currentTier = tierDefs[u.tier];
        const pct = currentTier.tokens > 0 ? Math.min(100, (u.balance_tokens / currentTier.tokens) * 100) : 0;
        const meterColor = pct > 60 ? '#00b894' : pct > 30 ? '#fdcb6e' : '#d63031';

        // Check for new API key from registration
        const newApiKey = localStorage.getItem('new_api_key');
        if (newApiKey) {
            setTimeout(() => {
                showToast('Your API key (shown once): ' + newApiKey, 'success');
                localStorage.removeItem('new_api_key');
            }, 500);
        }

        container.innerHTML = `
            <h2>Dashboard</h2>
            <div class="grid-3">
                <div class="card">
                    <div class="card-header"><strong>API Key</strong> <span class="badge ${tierColors[u.tier]}">${tierNames[u.tier]}</span></div>
                    <div id="api-key-display" title="Click to copy">${u.api_key_prefix}</div>
                    <small style="color:var(--pico-muted-color)">Full key shown only once at creation</small>
                    <button class="outline secondary" id="btn-reset-key" style="margin-top:0.5rem;width:100%">Regenerate</button>
                </div>
                <div class="card">
                    <div class="card-header"><strong>Balance</strong></div>
                    <h3 style="margin:0">${u.balance_tokens.toLocaleString()} <small>/ ${currentTier.tokens.toLocaleString()}</small></h3>
                    <div class="meter"><div class="meter-fill" style="width:${pct}%;background:${meterColor}"></div></div>
                    <small>Tokens remaining this month</small>
                </div>
                <div class="card">
                    <div class="card-header"><strong>Usage</strong></div>
                    <div style="display:flex;justify-content:space-between">
                        <div><h4 style="margin:0">${usage.today_requests}</h4><small>Requests Today</small></div>
                        <div><h4 style="margin:0">${usage.today_tokens.toLocaleString()}</h4><small>Tokens Today</small></div>
                        <div><h4 style="margin:0">${usage.total_requests}</h4><small>Total Requests</small></div>
                    </div>
                </div>
            </div>

            <h3 style="margin-top:2rem">Upgrade Plan</h3>
            <div class="grid-3">
                ${['free','pro','vip'].map(t => {
                    const d = tierDefs[t];
                    const active = selectedTier === t ? 'active' : '';
                    const isCurrent = u.tier === t;
                    return `
                    <div class="tier-card ${active}" id="tier-${t}">
                        <h3>${tierNames[t]}</h3>
                        <div class="price">${d.price === 0 ? 'Free' : '$' + d.price + '/mo'}</div>
                        <p>${d.tokens.toLocaleString()} tokens/mo</p>
                        <p>${d.reqs} reqs/day</p>
                        <button class="${isCurrent ? 'outline' : ''}" ${isCurrent ? 'disabled' : ''}>
                            ${isCurrent ? 'Current' : 'Upgrade'}
                        </button>
                    </div>`;
                }).join('')}
            </div>

            <h3 style="margin-top:2rem">Last 7 Days</h3>
            <table>
                <thead><tr><th>Date</th><th>Tokens</th><th>Requests</th></tr></thead>
                <tbody>
                    ${usage.last_7_days.map(d => `
                    <tr><td>${d.date}</td><td>${d.tokens.toLocaleString()}</td><td>${d.requests}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('api-key-display').addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => showToast('Prefix copied', 'success'));
        });
        document.getElementById('btn-reset-key').addEventListener('click', async () => {
            if (!confirm('Regenerate API key? Old key stops working immediately.')) return;
            try {
                const data = await api.post('/dashboard/reset-api-key');
                showToast('New API Key: ' + data.api_key, 'success');
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
                        showToast('Upgraded to ' + tierNames[t] + '!', 'success');
                        await load();
                    } catch(er) { showToast(er.message, 'error'); }
                });
            }
        });
    }

    load();
    return { unmount() {} };
});
