const API_BASE = '';

const api = {
    getToken() {
        return localStorage.getItem('jwt_token');
    },

    setToken(token) {
        localStorage.setItem('jwt_token', token);
    },

    clearToken() {
        localStorage.removeItem('jwt_token');
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const opts = { method, headers };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        const resp = await fetch(API_BASE + path, opts);
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const msg = data.detail || data.message || `HTTP ${resp.status}`;
            throw new Error(msg);
        }
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },

    logout() {
        this.clearToken();
        window.location.hash = '#/login';
    }
};
const routes = {};
let currentPage = null;

function registerRoute(hash, renderFn) {
    routes[hash] = renderFn;
}

function navigate() {
    const hash = window.location.hash || '#/login';
    const token = api.getToken();
    const isPublic = hash === '#/login';

    if (!token && !isPublic) { window.location.hash = '#/login'; return; }
    if (token && isPublic) { window.location.hash = '#/dashboard'; return; }

    const layout = document.getElementById('app-layout');
    const app = document.getElementById('app');

    if (token && !isPublic) {
        layout.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else {
        layout.style.display = 'none';
    }

    // Nav highlight
    document.querySelectorAll('.sidebar-nav a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    // Cleanup previous page
    if (currentPage && currentPage.unmount) {
        try { currentPage.unmount(); } catch(e) {}
    }

    var renderFn = routes[hash];
    app.innerHTML = '';

    if (renderFn) {
        try {
            currentPage = renderFn(app);
        } catch(e) {
            app.innerHTML = '<p style="color:var(--red);padding:40px">页面加载出错：' + e.message + '</p>';
            console.error('Route error:', e);
        }
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
registerRoute('#/login', (container) => {
    let tab = 'login';

    function render() {
        container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <div style="text-align:center;margin-bottom:8px">
                        <svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4f46e5"/><path d="M16 6C11 6 7 10 6 14 5 16 5 19 7 21 9 23 12 23 15 22 18 21 21 19 23 16 25 13 24 10 22 8 20 6 17 6 16 6Z" fill="#fff" opacity=".3"/><circle cx="12" cy="13" r="2" fill="#fff"/><path d="M17 12c1.5-1.5 5-3 7-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </div>
                    <h1>DS Relay</h1>
                    <p class="subtitle">DeepSeek AI API 聚合平台</p>
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
registerRoute('#/chat', (container) => {
    let messages = [];
    let streaming = false;
    let pendingImage = null;
    let showHistory = false;
    let selectedModel = localStorage.getItem('chat_model') || 'deepseek-chat';

    const STORAGE_KEY = 'chat_messages';
    const H24 = 24 * 60 * 60 * 1000;
    // DeepSeek whale logo SVG
    const whaleIcon = '<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" style=\"vertical-align:middle\"><path d=\"M12 4C8 4 4 8 3 12C2 14 2 17 4 19C6 21 9 21 12 20C15 19 18 17 20 14C22 11 21 8 19 6C17 4 14 4 12 4Z\" fill=\"#4f46e5\" opacity=\"0.2\"/><circle cx=\"9\" cy=\"12\" r=\"1.5\" fill=\"#4f46e5\"/><path d=\"M14 11C15 10 18 9 20 9\" stroke=\"#4f46e5\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>';
    const modelIcons = { 'deepseek-chat': whaleIcon, 'deepseek-reasoner': whaleIcon };

    function saveMessages() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e) {}
    }

    function loadMessages() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) messages = JSON.parse(raw);
        } catch(e) { messages = []; }
    }

    function clearMessages() {
        messages = [];
        showHistory = false;
        saveMessages();
        render();
    }

    // Split messages by 24h
    function getSplitMessages() {
        const now = Date.now();
        const recent = [];
        const older = [];
        for (const m of messages) {
            if (m.ts && (now - m.ts) > H24) {
                older.push(m);
            } else {
                recent.push(m);
            }
        }
        return { recent, older };
    }

    function render() {
        const { recent, older } = getSplitMessages();
        const visible = showHistory ? messages : recent;
        const hiddenCount = messages.length - visible.length;

        container.innerHTML = `
            <h2>AI 对话</h2>
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span style="font-size:13px;color:var(--text-secondary)">
                        ${messages.length ? messages.length + ' 条消息' : ''}
                    </span>
                    <div style="display:flex;gap:6px">
                        ${messages.length ? '<button class="btn-sm" id="btn-clear" title="清空对话">清空</button>' : ''}
                    </div>
                </div>
                <div id="chat-messages">
                    ${messages.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding-top:160px">输入消息开始与 DeepSeek 对话<br><small style="font-size:12px;color:var(--text-tertiary)">支持图片识别 · 流式输出 · 思考推理 · 引用回复</small></p>' : ''}
                    ${hiddenCount > 0 && !showHistory ? `
                    <div style="text-align:center;margin:12px 0">
                        <button class="btn-sm" id="btn-load-history" style="font-size:13px;padding:8px 20px">
                            查看更早的消息（${hiddenCount} 条）
                        </button>
                    </div>` : ''}
                    ${showHistory && older.length > 0 ? `
                    <div style="text-align:center;margin:12px 0;font-size:12px;color:var(--text-tertiary);border-bottom:1px solid var(--border);padding-bottom:8px">
                        以下为 24 小时前的历史消息
                    </div>` : ''}
                    ${visible.map(m => renderMessage(m)).join('')}
                    <div id="streaming-msg" class="chat-msg assistant" style="display:none">
                        <div class="role">
                            <span class="model-icon" id="stream-model-icon">✦</span>
                            <span id="stream-model-name">deepseek-chat</span>
                            <span id="streaming-indicator"></span>
                        </div>
                        <div id="stream-thinking" class="thinking-block" style="display:none">
                            <div class="thinking-header" id="thinking-toggle">
                                <span>思考中</span><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
                            </div>
                            <div class="thinking-content" id="stream-thinking-content"></div>
                        </div>
                        <div class="bubble" id="streaming-content"></div>
                    </div>
                </div>
                <form id="chat-form">
                    ${pendingImage ? `
                    <div class="img-preview" id="img-preview">
                        <img src="${pendingImage.dataUrl}" alt="预览">
                        <button type="button" class="img-remove" id="img-remove">&times;</button>
                    </div>` : ''}
                    <div class="chat-input-row">
                        <input type="text" id="chat-input" placeholder="${pendingImage ? '描述这张图片...' : '输入消息，Enter 发送'}" autocomplete="off">
                        <button type="button" class="btn-upload" id="btn-upload" title="上传图片">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                        <input type="file" id="file-input" accept="image/*" style="display:none">
                        <button type="submit" id="btn-send">发送</button>
                    </div>
                    <div class="chat-options">
                        <label><input type="checkbox" id="stream-toggle" checked> 流式</label>
                        <label>模型 <select id="model-select">
                            <option value="deepseek-chat" ${selectedModel==='deepseek-chat'?'selected':''}>${modelIcons['deepseek-chat']} deepseek-chat</option>
                            <option value="deepseek-reasoner" ${selectedModel==='deepseek-reasoner'?'selected':''}>${modelIcons['deepseek-reasoner']} deepseek-reasoner</option>
                        </select></label>
                    </div>
                </form>
            </div>
        `;

        setTimeout(() => {
            const msgDiv = document.getElementById('chat-messages');
            if (msgDiv) msgDiv.scrollTo({ top: msgDiv.scrollHeight, behavior: 'smooth' });
            document.getElementById('chat-input')?.focus();
        }, 100);

        // Persist model selection
        document.getElementById('model-select').addEventListener('change', function() {
            selectedModel = this.value;
            localStorage.setItem('chat_model', selectedModel);
        });

        document.getElementById('chat-form').addEventListener('submit', handleSend);
        document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        if (pendingImage) document.getElementById('img-remove').addEventListener('click', handleRemoveImage);

        // Load history button
        const loadBtn = document.getElementById('btn-load-history');
        if (loadBtn) loadBtn.addEventListener('click', () => { showHistory = true; render(); });

        // Clear button
        const clearBtn = document.getElementById('btn-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => {
            if (confirm('确认清空所有对话记录？')) clearMessages();
        });

        // Copy + Quote buttons
        document.querySelectorAll('.btn-copy-msg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = btn.dataset.content;
                navigator.clipboard.writeText(content).then(() => showToast('已复制', 'success'));
            });
        });
        document.querySelectorAll('.btn-quote-msg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = btn.dataset.content;
                const input = document.getElementById('chat-input');
                input.value = '> ' + content.split('\n').join('\n> ') + '\n\n';
                input.focus();
                showToast('已引用，输入你的问题后发送', 'success');
            });
        });
        document.querySelectorAll('.btn-retry-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                // Remove last assistant message and resend
                if (idx >= 0 && idx < messages.length && messages[idx].role === 'assistant') {
                    messages.splice(idx, 1);
                    const lastUser = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUser) {
                        saveMessages();
                        const model = lastUser._model || 'deepseek-chat';
                        const image = lastUser.image ? { dataUrl: lastUser.image } : null;
                        if (document.getElementById('stream-toggle').checked) {
                            await handleStream(model, image);
                        } else {
                            await handleNormal(model, image);
                        }
                        saveMessages();
                        render();
                    }
                }
            });
        });

        // Thinking toggle
        document.querySelectorAll('.thinking-header').forEach(h => {
            h.addEventListener('click', () => {
                const content = h.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                h.classList.toggle('collapsed');
            });
        });
    }

    function renderMessage(m, idx) {
        const ts = m.ts ? formatTime(m.ts) : '';
        const actualIdx = idx !== undefined ? idx : messages.indexOf(m);

        if (m.role === 'user') {
            return `
            <div class="chat-msg user">
                <div class="role">你 <span class="msg-time">${ts}</span></div>
                ${m.image ? `<img src="${m.image}" class="chat-img" style="max-width:240px;max-height:240px;border-radius:10px;margin-bottom:4px">` : ''}
                <div class="bubble">${escapeHtml(m.content)}</div>
            </div>`;
        }

        const icon = modelIcons[m.model] || '✦';
        const modelName = m.model || 'assistant';
        let html = `
        <div class="chat-msg assistant">
            <div class="role">
                <span class="model-icon">${icon}</span> ${modelName}
                <span class="msg-time">${ts}</span>
                ${m.tokens ? '<span class="tokens">' + m.tokens + ' tokens</span>' : ''}
            </div>
            <div class="msg-actions">
                <button class="btn-copy-msg" data-content="${escapeAttr(m.content)}" title="复制">📋</button>
                <button class="btn-quote-msg" data-content="${escapeAttr(m.content)}" title="引用回复">💬</button>
                <button class="btn-retry-msg" data-idx="${actualIdx}" title="重新生成">🔄</button>
            </div>`;

        if (m.reasoning) {
            html += `
            <div class="thinking-block done" style="margin-top:4px">
                <div class="thinking-header collapsed"><span>思考过程</span></div>
                <div class="thinking-content" style="display:none">${escapeHtml(m.reasoning)}</div>
            </div>`;
        }
        html += `<div class="bubble">${escapeHtml(m.content)}</div></div>`;
        return html;
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const h = d.getHours().toString().padStart(2,'0');
        const m = d.getMinutes().toString().padStart(2,'0');
        if (isToday) return h + ':' + m;
        return (d.getMonth()+1) + '/' + d.getDate() + ' ' + h + ':' + m;
    }

    function escapeAttr(s) {
        return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
        if (file.size > 20 * 1024 * 1024) { showToast('图片不能超过 20MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = () => { pendingImage = { dataUrl: reader.result, filename: file.name }; render(); };
        reader.readAsDataURL(file);
    }

    function handleRemoveImage() {
        pendingImage = null;
        document.getElementById('file-input').value = '';
        render();
    }

    async function handleSend(e) {
        e.preventDefault();
        if (streaming) return;
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content && !pendingImage) return;

        input.value = '';
        const useStream = document.getElementById('stream-toggle').checked;
        const model = selectedModel;
        const image = pendingImage;
        const displayText = content || '描述这张图片';
        pendingImage = null;
        document.getElementById('file-input').value = '';

        if (image) {
            messages.push({ role: 'user', content: displayText, tokens: 0, image: image.dataUrl, ts: Date.now(), _model: model });
        } else {
            messages.push({ role: 'user', content: displayText, tokens: 0, ts: Date.now(), _model: model });
        }
        saveMessages();
        render();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.api_key_prefix) {
            messages.push({ role: 'assistant', model: model, content: '未找到 API Key，请前往仪表盘获取。', tokens: 0, ts: Date.now() });
            saveMessages();
            render();
            return;
        }

        if (useStream) { await handleStream(model, image); }
        else { await handleNormal(model, image); }
        saveMessages();
        render();
    }

    function buildMessages(image) {
        const history = messages.filter(m => m.tokens !== undefined);
        const msgs = [];
        for (const m of history) {
            if (m.role === 'user' && m.image) {
                const parts = [{ type: 'text', text: m.content }];
                parts.unshift({ type: 'image_url', image_url: { url: m.image } });
                msgs.push({ role: 'user', content: parts });
            } else {
                msgs.push({ role: m.role, content: m.content });
            }
        }
        return msgs;
    }

    async function handleNormal(model, image) {
        const msgs = buildMessages(image);
        try {
            const data = await api.post('/v1/chat/completions', { model, messages: msgs });
            const msg = data.choices[0].message;
            const reply = msg.content || '';
            const reasoning = msg.reasoning_content || '';
            const tokens = data.usage ? data.usage.total_tokens : 0;
            messages.push({ role: 'assistant', model: model, content: reply, reasoning: reasoning, tokens: tokens, ts: Date.now() });
        } catch (err) {
            messages.push({ role: 'assistant', model: model, content: '错误：' + err.message, tokens: 0, ts: Date.now() });
        }
    }

    async function handleStream(model, image) {
        streaming = true;
        const streamMsg = document.getElementById('streaming-msg');
        const streamContent = document.getElementById('streaming-content');
        const streamModelIcon = document.getElementById('stream-model-icon');
        const streamModelName = document.getElementById('stream-model-name');
        const streamThinking = document.getElementById('stream-thinking');
        const streamThinkingContent = document.getElementById('stream-thinking-content');
        const thinkingToggle = document.getElementById('thinking-toggle');

        streamMsg.style.display = 'flex';
        streamModelIcon.textContent = modelIcons[model] || '✦';
        streamModelName.textContent = model;
        streamContent.textContent = '';
        streamThinking.style.display = 'block';
        streamThinkingContent.textContent = '';
        thinkingToggle.classList.remove('collapsed');

        const msgs = buildMessages(image);
        let fullContent = '';
        let fullReasoning = '';
        let hasContent = false;

        try {
            const resp = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.getToken()}` },
                body: JSON.stringify({ model, messages: msgs, stream: true }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${resp.status}`);
            }
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                for (const line of text.split('\n')) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const obj = JSON.parse(line.slice(6));
                            const delta = obj.choices?.[0]?.delta || {};
                            const chunk = delta.content || '';
                            const reasoningChunk = delta.reasoning_content || '';

                            if (reasoningChunk) {
                                fullReasoning += reasoningChunk;
                                streamThinkingContent.textContent = fullReasoning;
                                streamThinkingContent.scrollTop = streamThinkingContent.scrollHeight;
                            }
                            if (chunk) {
                                if (!hasContent) {
                                    hasContent = true;
                                    thinkingToggle.classList.add('collapsed');
                                    streamThinkingContent.style.display = 'none';
                                }
                                fullContent += chunk;
                                streamContent.textContent = fullContent;
                            }
                            const msgDiv = document.getElementById('chat-messages');
                            const atBottom = msgDiv.scrollTop + msgDiv.clientHeight >= msgDiv.scrollHeight - 60;
                            msgDiv.scrollTop = msgDiv.scrollHeight;
                        } catch(e) {}
                    }
                }
            }
        } catch (err) {
            fullContent = '错误：' + err.message;
            showToast(err.message, 'error');
        }

        streaming = false;
        streamMsg.style.display = 'none';
        if (!hasContent) thinkingToggle.classList.add('collapsed');
        messages.push({
            role: 'assistant', model: model,
            content: fullContent || '（无响应）',
            reasoning: fullReasoning || '',
            tokens: 0, ts: Date.now(),
        });
    }

    loadMessages();
    render();
    return { unmount() {} };
});
registerRoute('#/history', (container) => {
    let data = null;
    let filters = { page: 1, size: 15, model: '', search: '' };

    async function load() {
        try {
            const params = new URLSearchParams({ page: filters.page, size: filters.size, model: filters.model, search: filters.search });
            data = await api.get('/dashboard/history?' + params);
        } catch (e) {
            container.innerHTML = `<p style="color:var(--red)">加载失败：${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const records = data.records || [];
        container.innerHTML = `
            <div class="page-header">
                <h2>调用记录</h2>
                <p>查看所有 API 调用历史与 Token 消耗明细</p>
            </div>

            <div class="filter-row">
                <div class="search-box" style="flex:1;min-width:180px">
                    <span style="color:var(--text-tertiary);font-size:14px">⌕</span>
                    <input type="text" id="search-input" placeholder="搜索模型或接口..." value="${escapeHtml(filters.search)}">
                </div>
                <select id="model-filter" class="styled">
                    <option value="">所有模型</option>
                    <option value="deepseek-chat" ${filters.model==='deepseek-chat'?'selected':''}>deepseek-chat</option>
                    <option value="deepseek-reasoner" ${filters.model==='deepseek-reasoner'?'selected':''}>deepseek-reasoner</option>
                </select>
                <button class="btn-outline btn" onclick="document.getElementById('search-input').value='';document.getElementById('model-filter').value='';filters.search='';filters.model='';filters.page=1;load()">重置</button>
            </div>

            <div class="card" style="padding:0;overflow:hidden">
                ${records.length === 0 ? '<p style="text-align:center;padding:60px;color:var(--text-tertiary)">暂无调用记录</p>' : `
                <table class="data-table">
                    <thead><tr><th>时间</th><th>模型</th><th>Token</th><th>接口</th><th>状态</th></tr></thead>
                    <tbody>${records.map(r => `
                        <tr class="${!r.success ? 'banned' : ''}">
                            <td style="font-size:12.5px;color:var(--text-secondary)">${r.timestamp ? r.timestamp.slice(0,19).replace('T',' ') : '-'}</td>
                            <td><span style="font-weight:550">${r.model}</span></td>
                            <td>${r.tokens_consumed.toLocaleString()}</td>
                            <td style="font-size:12.5px;color:var(--text-secondary);font-family:var(--mono)">${r.endpoint}</td>
                            <td>${r.success ? '<span style="color:var(--green);font-weight:550">成功</span>' : '<span style="color:var(--red);font-weight:550">失败</span>'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`}
            </div>

            ${data.total_pages > 1 ? buildPagination() : ''}
        `;

        document.getElementById('search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { filters.search = e.target.value; filters.page = 1; load(); }
        });
        document.getElementById('model-filter')?.addEventListener('change', (e) => {
            filters.model = e.target.value; filters.page = 1; load();
        });
    }

    function buildPagination() {
        let html = '<div class="pagination">';
        html += `<button ${filters.page <= 1 ? 'disabled' : ''} onclick="void(0)" data-pg="${filters.page-1}">◀</button>`;
        const start = Math.max(1, filters.page - 2);
        const end = Math.min(data.total_pages, filters.page + 2);
        if (start > 1) html += `<button data-pg="1">1</button><span class="page-info">…</span>`;
        for (let i = start; i <= end; i++) {
            html += `<button class="${i === filters.page ? 'active' : ''}" data-pg="${i}">${i}</button>`;
        }
        if (end < data.total_pages) html += `<span class="page-info">…</span><button data-pg="${data.total_pages}">${data.total_pages}</button>`;
        html += `<button ${filters.page >= data.total_pages ? 'disabled' : ''} data-pg="${filters.page+1}">▶</button>`;
        html += `<span class="page-info">${data.total} 条</span>`;
        html += '</div>';

        setTimeout(() => {
            document.querySelectorAll('.pagination button[data-pg]').forEach(btn => {
                btn.addEventListener('click', () => { filters.page = parseInt(btn.dataset.pg); load(); });
            });
        }, 50);
        return html;
    }

    load();
    return { unmount() {} };
});
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
registerRoute('#/docs', (container) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const apiKeyPrefix = user.api_key_prefix || 'sk-relay-xxxx';
    const baseUrl = window.location.origin;

    container.innerHTML = `
        <h2>API 文档</h2>
        <p style="color:var(--text-secondary);margin-bottom:2rem">兼容 OpenAI SDK，密钥在<a href="#/dashboard" style="color:var(--blue)">仪表盘</a>获取</p>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.5rem">快速开始</h3>
            <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary);width:100px">接口地址</td><td><code>${baseUrl}/v1/chat/completions</code></td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">认证方式</td><td>Bearer Token（API Key）</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">支持模型</td><td>deepseek-chat（支持图片）、deepseek-reasoner</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">图片限制</td><td>最大 20MB，支持 PNG/JPEG/GIF/WebP</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">流式输出</td><td>支持 SSE（stream: true）</td></tr>
            </table>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">cURL</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyPrefix}" \\
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">Python</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import requests

url = "${baseUrl}/v1/chat/completions"
headers = {
    "Authorization": "Bearer ${apiKeyPrefix}",
    "Content-Type": "application/json"
}
data = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
}

resp = requests.post(url, json=data, headers=headers)
print(resp.json()["choices"][0]["message"]["content"])</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">OpenAI SDK（兼容模式）</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>from openai import OpenAI

client = OpenAI(
    api_key="${apiKeyPrefix}",
    base_url="${baseUrl}/v1"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">图片识别</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import base64, requests

with open("photo.jpg", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

data = {
    "model": "deepseek-chat",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "描述这张图片"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
        ]
    }]
}

resp = requests.post(
    "${baseUrl}/v1/chat/completions",
    json=data,
    headers={"Authorization": "Bearer ${apiKeyPrefix}"}
)
print(resp.json()["choices"][0]["message"]["content"])</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">流式输出</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import requests

data = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "写一首诗"}],
    "stream": True
}

resp = requests.post(
    "${baseUrl}/v1/chat/completions",
    json=data,
    headers={"Authorization": "Bearer ${apiKeyPrefix}"},
    stream=True
)

for line in resp.iter_lines():
    if line:
        text = line.decode()
        if text.startswith("data: ") and "[DONE]" not in text:
            import json
            chunk = json.loads(text[6:])
            content = chunk["choices"][0]["delta"].get("content", "")
            print(content, end="", flush=True)</code></pre>
        </div>
    `;

    return { unmount() {} };
});
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
// Shared utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Theme toggle
const themeBtn = document.getElementById('btn-theme');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    api.logout();
});

// Toast
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .2s';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

// Enter for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            const form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
});
