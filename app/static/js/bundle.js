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
var routes = {};
var currentPage = null;

function registerRoute(hash, renderFn) { routes[hash] = renderFn; }

function navigate() {
    var hash = window.location.hash || '#/login';
    var token = api.getToken();
    var isPublic = hash === '#/login';

    if (!token && !isPublic) { window.location.hash = '#/login'; return; }
    if (token && isPublic) { window.location.hash = '#/models'; return; }

    var topnav = document.getElementById('topnav');
    var app = document.getElementById('app');

    if (token && !isPublic) {
        topnav.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else {
        topnav.style.display = 'none';
    }

    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    if (currentPage && currentPage.unmount) { try { currentPage.unmount(); } catch(e) {} }

    var renderFn = routes[hash];
    app.innerHTML = '';
    app.removeAttribute('style');

    if (renderFn) {
        try { currentPage = renderFn(app); } catch(e) {
            app.innerHTML = '<p style="color:var(--red);padding:40px">加载出错：' + e.message + '</p>';
        }
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">404</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
registerRoute('#/login', function(container) {
    var tab = 'login';
    function render() {
        container.innerHTML = '<div class="auth-page"><div class="auth-card">' +
            '<div class="auth-icon"><svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#6366f1"/><path d="M24 8c-7 0-13 6-14 12-1 3-1 8 2 11 3 3 8 3 12 2 5-1 10-5 13-10 3-5 2-9-1-12-3-3-8-3-12-3z" fill="#fff" opacity=".25"/><circle cx="17" cy="20" r="2.5" fill="#fff"/><path d="M26 18c2-2 7-4 9-4" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></div>' +
            '<h1>DS Relay</h1><p class="subtitle">多模型 AI API 聚合平台<br>一个 Key 调用所有主流大模型</p>' +
            '<div class="tabs"><button id="tab-login" class="'+(tab==='login'?'active':'')+'">登录</button><button id="tab-register" class="'+(tab==='register'?'active':'')+'">注册</button></div>' +
            '<form id="auth-form">' +
            (tab==='register' ?
                '<div class="input-group"><label>用户名</label><input type="text" id="username" placeholder="你的用户名" required autocomplete="username"></div>' +
                '<div class="input-group"><label>邮箱</label><input type="email" id="email" placeholder="your@email.com" required autocomplete="email"></div>' :
                '<div class="input-group"><label>账户</label><input type="text" id="account" placeholder="用户名或邮箱" required autocomplete="username"></div>') +
            '<div class="input-group"><label>密码</label><input type="password" id="password" placeholder="输入密码" required autocomplete="current-password"></div>' +
            '<div id="form-error" class="error"></div>' +
            '<button type="submit" class="btn-submit">'+(tab==='login'?'登 录':'创建账户')+'</button>' +
            '</form>' +
            '<p class="footer-note">'+(tab==='login'?'还没有账户？点击「注册」':'已有账户？点击「登录」')+'<br>注册即表示同意 <a href="#/pricing" style="color:var(--accent)">服务条款</a> · 首个注册用户自动成为 <span>管理员</span></p>' +
            '</div></div>';
        document.getElementById('tab-login').addEventListener('click',function(){tab='login';render()});
        document.getElementById('tab-register').addEventListener('click',function(){tab='register';render()});
        document.getElementById('auth-form').addEventListener('submit',handleSubmit);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        var errEl=document.getElementById('form-error');
        errEl.style.display='none';
        var pw=document.getElementById('password').value;
        try {
            var data;
            if(tab==='register') {
                data=await api.post('/auth/register',{username:document.getElementById('username').value,email:document.getElementById('email').value,password:pw});
            } else {
                data=await api.post('/auth/login',{account:document.getElementById('account').value,password:pw});
            }
            api.setToken(data.access_token);
            localStorage.setItem('user',JSON.stringify(data.user));
            if(data.api_key) localStorage.setItem('new_api_key',data.api_key);
            window.location.hash='#/models';
        } catch(err) { errEl.textContent=err.message; errEl.style.display='block'; }
    }
    render();
    return {unmount:function(){}};
});
registerRoute('#/models', function(container) {
    var providers = [
        { id:'deepseek', name:'DeepSeek 官方', desc:'代码能力国产第一，综合最均衡', color:'#4f46e5', icon:'DS', models:[
            {id:'deepseek-chat',name:'DeepSeek Chat',desc:'通用旗舰 · 支持图片识别 · 128K 上下文',tags:['多模态','128K','对话']},
            {id:'deepseek-reasoner',name:'DeepSeek Reasoner',desc:'深度推理 · 复杂逻辑 · 数学编程',tags:['推理','128K','逻辑']}
        ]},
        { id:'siliconflow', name:'硅基流动', desc:'100+ 开源模型聚合，国内直连低延迟', color:'#7c3aed', icon:'SF', models:[
            {id:'deepseek-ai/DeepSeek-V3',name:'DeepSeek V3 (托管)',desc:'硅基托管 DeepSeek · 更快响应 · 开源',tags:['多模态','128K','托管']},
            {id:'deepseek-ai/DeepSeek-R1',name:'DeepSeek R1 (托管)',desc:'硅基托管推理模型 · 思考过程可见',tags:['推理','128K','托管']},
            {id:'Qwen/Qwen2.5-72B-Instruct',name:'Qwen2.5 72B',desc:'阿里通义千问旗舰 · 中文理解优秀',tags:['中文优化','128K','72B']},
            {id:'zai-org/GLM-4.6',name:'GLM-4.6',desc:'智谱最新 · 响应速度快 · 均衡表现',tags:['速度快','128K','最新']}
        ]},
        { id:'dashscope', name:'阿里百炼', desc:'通义千问系列 · 中文能力第一', color:'#f97316', icon:'QW', models:[
            {id:'qwen-plus',name:'通义千问 Plus',desc:'性价比之选 · 日常对话 · 均衡性能',tags:['中文优化','128K','均衡']},
            {id:'qwen-max',name:'通义千问 Max',desc:'旗舰能力 · 复杂任务 · 深度理解',tags:['中文最强','128K','旗舰']}
        ]},
        { id:'zhipu', name:'智谱 AI', desc:'GLM 系列 · 响应速度第一', color:'#2563eb', icon:'GL', models:[
            {id:'glm-4-plus',name:'GLM-4 Plus',desc:'高精度旗舰 · 复杂推理 · 长文本',tags:['高精度','128K','旗舰']},
            {id:'glm-4-flash',name:'GLM-4 Flash',desc:'轻量极速 · 免费额度 · 日常使用',tags:['极速','128K','轻量']}
        ]},
        { id:'volcengine', name:'火山方舟', desc:'字节豆包系列 · 速度与中文兼优', color:'#3370ff', icon:'DB', models:[
            {id:'doubao-pro-256k',name:'豆包 Pro 256K',desc:'字节旗舰 · 超长上下文 · 中文优化',tags:['256K','旗舰','中文优化']},
            {id:'doubao-lite-128k',name:'豆包 Lite 128K',desc:'轻量快速 · 免费额度 · 日常对话',tags:['极速','128K','轻量']}
        ]},
        { id:'moonshot', name:'月之暗面', desc:'Kimi 系列 · 长文本处理专家', color:'#6d28d9', icon:'KM', models:[
            {id:'moonshot-v1-128k',name:'Kimi 128K',desc:'超长上下文 · 文档分析 · 深度阅读',tags:['128K','长文本','阅读']}
        ]}
    ];

    var html = '<div class="page-header"><h2>模型广场</h2><p>聚合 6 大平台 · ' + providers.reduce(function(s,p){return s+p.models.length},0) + ' 款模型 · 统一 API 接入</p></div>';

    providers.forEach(function(prov) {
        html += '<div class="section-title"><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:'+prov.color+';color:#fff;text-align:center;line-height:24px;font-size:11px;font-weight:700;margin-right:8px">'+prov.icon+'</span>'+prov.name+' <span style="font-weight:400;font-size:12px;color:var(--text-tertiary);margin-left:8px">'+prov.desc+'</span></div>';
        html += '<div class="model-grid">';
        prov.models.forEach(function(m) {
            html += '<div class="model-card" onclick="localStorage.setItem(\'chat_model\',\''+m.id+'\');window.location.hash=\'#/chat\'">'+
                '<div class="mc-icon" style="background:'+prov.color+'15;color:'+prov.color+'">'+prov.icon+'</div>'+
                '<div class="mc-info"><div class="mc-provider">'+prov.name+'</div><div class="mc-name">'+m.name+'</div><div class="mc-desc">'+m.desc+'</div>'+
                '<div class="mc-tags">'+m.tags.map(function(t){return '<span class="mc-tag">'+t+'</span>'}).join('')+'</div></div></div>';
        });
        html += '</div>';
    });

    container.innerHTML = html;
    return {unmount:function(){}};
});
registerRoute('#/dashboard', function(container) {
    var profile = null;
    var tierNames = {free:'免费版',pro:'专业版',vip:'至尊版'};

    async function load() {
        try { profile = await api.get('/dashboard/profile'); localStorage.setItem('user',JSON.stringify(profile.user)); }
        catch(e) { container.innerHTML = '<p style="color:var(--red);padding:40px">加载失败：'+e.message+'</p>'; return; }
        render();
    }

    function render() {
        var u = profile.user;
        var usage = profile.usage;
        var tierDefs = {
            free: {tokens:100000,reqs:50,price:0,icon:'◯',desc:'试用体验'},
            pro: {tokens:2000000,reqs:500,price:19.9,icon:'◉',desc:'个人开发者'},
            vip: {tokens:10000000,reqs:'∞',price:49.9,icon:'◆',desc:'企业级用户'}
        };
        var ct = tierDefs[u.tier];
        var pct = ct.tokens>0?Math.min(100,(u.balance_tokens/ct.tokens)*100):0;
        var mc = pct>60?'var(--green)':pct>30?'var(--amber)':'var(--red)';
        var days = usage.last_7_days || [];

        var newKey = localStorage.getItem('new_api_key');
        if(newKey){setTimeout(function(){showToast('API Key（仅显示一次）：'+newKey,'success');localStorage.removeItem('new_api_key')},500)}

        container.innerHTML =
            '<div class="page-header"><h2>控制台</h2><p>用量统计 · Token 消耗 · 套餐管理</p></div>'+

            // Summary cards - DeepSeek style
            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-label">本月已用 Token</div><div class="stat-value">'+(usage.total_tokens||0).toLocaleString()+'</div><div class="meter"><div class="meter-fill" style="width:'+pct+'%;background:'+mc+'"></div></div><span style="font-size:12px;color:var(--text-tertiary)">剩余 '+u.balance_tokens.toLocaleString()+' / '+(ct.tokens).toLocaleString()+'</span></div>'+
            '<div class="stat-card"><div class="stat-label">输入 Token</div><div class="stat-value">'+(usage.today_tokens_in||0).toLocaleString()+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_tokens_in||0).toLocaleString()+' · 今日</span></div>'+
            '<div class="stat-card"><div class="stat-label">输出 Token</div><div class="stat-value">'+(usage.today_tokens_out||0).toLocaleString()+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_tokens_out||0).toLocaleString()+' · 今日</span></div>'+
            '<div class="stat-card"><div class="stat-label">请求次数</div><div class="stat-value">'+(usage.today_requests||0)+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_requests||0)+' · 今日</span></div>'+
            '</div>'+

            // Usage trend chart - grouped input/output
            '<div class="card"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px">Token 用量趋势（近 7 天）</h3>'+
            '<div style="display:flex;gap:16px;align-items:center;margin-bottom:10px;font-size:12px;color:var(--text-secondary)">'+
            '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--blue);margin-right:4px"></span>输入</span>'+
            '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);margin-right:4px"></span>输出</span>'+
            '</div>'+
            '<div class="chart-row"><div style="min-height:160px">'+
            buildGroupedChart(days)+
            '<div class="chart-labels" style="margin-top:8px">'+days.map(function(d){return '<span>'+d.date.slice(5)+'</span>'}).join('')+'</div>'+
            '</div></div></div>'+

            // Tier cards
            '<div class="section-title">套餐</div><div class="tier-grid">'+
            ['free','pro','vip'].map(function(t){
                var d=tierDefs[t]; var isC=u.tier===t;
                return '<div class="tier-card'+(isC?' active':'')+'"><div class="tier-icon">'+d.icon+'</div><h3>'+tierNames[t]+'</h3><div class="price">'+(d.price===0?'免费':'¥'+d.price)+'<span>/月</span></div><div class="features"><div>◆ '+d.tokens.toLocaleString()+' Token/月</div><div>◆ '+(typeof d.reqs==='number'?d.reqs.toLocaleString():d.reqs)+' 请求/天</div><div>◆ '+d.desc+'</div></div><button '+(isC?'disabled':'id="btn-up-'+t+'"')+'>'+(isC?'当前套餐':'立即升级')+'</button></div>';
            }).join('')+'</div>'+

            // API Key
            '<div class="section-title">API Key</div><div class="card"><div class="api-key-display">'+u.api_key_prefix+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><span style="font-size:12px;color:var(--text-tertiary)">完整 Key 仅创建时显示一次</span><button class="btn-sm" id="btn-reset-key">重新生成</button></div></div>';

        // Upgrade buttons
        ['free','pro','vip'].forEach(function(t){
            var btn=document.getElementById('btn-up-'+t);
            if(btn) btn.addEventListener('click',function(e){e.stopPropagation();
                api.post('/payment/create-order',{tier:t}).then(function(o){showPaymentModal(o,tierNames[t],tierDefs[t].price)}).catch(function(e){showToast(e.message,'error')});
            });
        });

        var kd=container.querySelector('.api-key-display');
        if(kd) kd.addEventListener('click',function(){navigator.clipboard.writeText(this.textContent).then(function(){showToast('已复制','success')})});

        var rb=document.getElementById('btn-reset-key');
        if(rb) rb.addEventListener('click',function(){if(!confirm('重新生成后旧 Key 立即失效，确认？'))return;
            api.post('/dashboard/reset-api-key').then(function(d){showToast('新 Key：'+d.api_key,'success');load()}).catch(function(e){showToast(e.message,'error')});
        });
    }

    function buildGroupedChart(days) {
        // Grouped input/output bars
        var allVals = [];
        days.forEach(function(d){ allVals.push(d.tokens_in||0); allVals.push(d.tokens_out||0); });
        var maxVal = Math.max(1, Math.max.apply(null, allVals));
        var html = '<div style="display:flex;align-items:flex-end;gap:2px;height:120px">';
        days.forEach(function(d){
            var inH = Math.max(2, ((d.tokens_in||0)/maxVal)*100);
            var outH = Math.max(2, ((d.tokens_out||0)/maxVal)*100);
            html += '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;position:relative">'+
                '<div class="chart-bar" style="height:'+outH+'%;background:var(--accent);opacity:.75" title="输出 '+ (d.tokens_out||0).toLocaleString() +'"></div>'+
                '<div class="chart-bar" style="height:'+inH+'%;background:var(--blue);opacity:.75" title="输入 '+ (d.tokens_in||0).toLocaleString() +'"></div>'+
                '</div>';
        });
        html += '</div>';
        return html;
    }

    load();
    return {unmount:function(){}};
});
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
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) messages = JSON.parse(raw);
        } catch(e) { messages = []; }
    }

    function scrollToBottom() {
        var md = document.getElementById('chat-messages');
        if (md) requestAnimationFrame(function() { md.scrollTop = md.scrollHeight; });
    }

    function appendLastToDom() {
        var md = document.getElementById('chat-messages');
        if (!md) return;
        var m = messages[messages.length - 1];
        if (!m) return;
        var div = document.createElement('div');
        div.innerHTML = renderMessage(m, messages.length - 1);
        var el = div.firstElementChild;
        md.appendChild(el);
        // Bind actions for this message
        bindMessageActions(el, messages.length - 1);
        scrollToBottom();
    }

    function bindMessageActions(el, idx) {
        el.querySelectorAll('.btn-copy-msg').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                navigator.clipboard.writeText(btn.dataset.content).then(function() { showToast('已复制', 'success'); });
            });
        });
        el.querySelectorAll('.btn-quote-msg').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var input = document.getElementById('chat-input');
                input.value = '> ' + btn.dataset.content.split('\n').join('\n> ') + '\n\n';
                input.focus();
                showToast('已引用', 'success');
            });
        });
        el.querySelectorAll('.btn-retry-msg').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (idx >= 0 && idx < messages.length && messages[idx].role === 'assistant') {
                    messages.splice(idx, 1);
                    var lastUser = messages.slice().reverse().find(function(m) { return m.role === 'user'; });
                    if (lastUser) {
                        saveMessages();
                        var model = lastUser._model || 'deepseek-chat';
                        var img = lastUser.image ? {dataUrl: lastUser.image} : null;
                        // Remove from DOM
                        var parent = el.parentNode;
                        while (el.previousElementSibling && el.previousElementSibling.classList.contains('chat-msg')) {
                            parent.removeChild(el.previousElementSibling);
                        }
                        parent.removeChild(el);
                        if (document.getElementById('stream-toggle').checked) handleStream(model, img);
                        else handleNormal(model, img);
                        saveMessages();
                    }
                }
            });
        });
        el.querySelectorAll('.thinking-header').forEach(function(h) {
            h.addEventListener('click', function() {
                var content = h.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                h.classList.toggle('collapsed');
            });
        });
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
        // Preserve scroll position
        var msgDiv = document.getElementById('chat-messages');
        var scrollTop = msgDiv ? msgDiv.scrollTop : 0;
        var wasAtBottom = msgDiv ? (msgDiv.scrollTop + msgDiv.clientHeight >= msgDiv.scrollHeight - 40) : true;

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
                        <div class="chat-toolbar">
                            <button type="button" id="btn-upload" title="上传图片">🖼</button>
                            <button type="button" id="btn-link" title="粘贴链接">🔗</button>
                        </div>
                        <input type="file" id="file-input" accept="image/*" style="display:none">
                        <button type="submit" id="btn-send">发送</button>
                    </div>
                    <div class="chat-options">
                        <label><input type="checkbox" id="stream-toggle"> 流式</label>
                        <label>模型 <select id="model-select">
                            <optgroup label="DeepSeek 官方">
                                <option value="deepseek-chat" ${selectedModel==='deepseek-chat'?'selected':''}>deepseek-chat</option>
                                <option value="deepseek-reasoner" ${selectedModel==='deepseek-reasoner'?'selected':''}>deepseek-reasoner</option>
                            </optgroup>
                            <optgroup label="硅基流动">
                                <option value="deepseek-ai/DeepSeek-V3" ${selectedModel==='deepseek-ai/DeepSeek-V3'?'selected':''}>DeepSeek-V3</option>
                                <option value="deepseek-ai/DeepSeek-R1" ${selectedModel==='deepseek-ai/DeepSeek-R1'?'selected':''}>DeepSeek-R1</option>
                                <option value="Qwen/Qwen2.5-72B-Instruct" ${selectedModel==='Qwen/Qwen2.5-72B-Instruct'?'selected':''}>Qwen2.5-72B</option>
                                <option value="zai-org/GLM-4.6" ${selectedModel==='zai-org/GLM-4.6'?'selected':''}>GLM-4.6</option>
                            </optgroup>
                            <optgroup label="阿里百炼">
                                <option value="qwen-plus" ${selectedModel==='qwen-plus'?'selected':''}>通义千问-Plus</option>
                                <option value="qwen-max" ${selectedModel==='qwen-max'?'selected':''}>通义千问-Max</option>
                            </optgroup>
                            <optgroup label="智谱AI">
                                <option value="glm-4-plus" ${selectedModel==='glm-4-plus'?'selected':''}>GLM-4-Plus</option>
                                <option value="glm-4-flash" ${selectedModel==='glm-4-flash'?'selected':''}>GLM-4-Flash</option>
                            </optgroup>
                            <optgroup label="豆包/火山方舟">
                                <option value="doubao-pro-256k" ${selectedModel==='doubao-pro-256k'?'selected':''}>豆包-Pro</option>
                                <option value="doubao-lite-128k" ${selectedModel==='doubao-lite-128k'?'selected':''}>豆包-Lite</option>
                            </optgroup>
                            <optgroup label="月之暗面Kimi">
                                <option value="moonshot-v1-128k" ${selectedModel==='moonshot-v1-128k'?'selected':''}>Kimi-128K</option>
                            </optgroup>
                        </select></label>
                    </div>
                </form>
            </div>
        `;

        // Restore scroll position after render
        setTimeout(function() {
            var md = document.getElementById('chat-messages');
            if (md) {
                if (wasAtBottom) md.scrollTop = md.scrollHeight;
                else md.scrollTop = Math.min(scrollTop, md.scrollHeight);
            }
            document.getElementById('chat-input')?.focus();
        }, 20);

        // Persist model selection
        document.getElementById('model-select').addEventListener('change', function() {
            selectedModel = this.value;
            localStorage.setItem('chat_model', selectedModel);
        });

        document.getElementById('chat-form').addEventListener('submit', handleSend);
        document.getElementById('btn-upload').addEventListener('click', function() { document.getElementById('file-input').click(); });
        document.getElementById('btn-link').addEventListener('click', function() {
            var url = prompt('粘贴图片链接：');
            if (url && url.trim()) {
                pendingImage = { dataUrl: url.trim(), filename: 'link' };
                render();
                showToast('图片链接已添加', 'success');
            }
        });
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
        appendLastToDom();

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
        // Don't re-render - messages already appended to DOM
        scrollToBottom();
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
            appendLastToDom();
        } catch (err) {
            messages.push({ role: 'assistant', model: model, content: '错误：' + err.message, tokens: 0, ts: Date.now() });
            appendLastToDom();
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
        appendLastToDom();
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
registerRoute('#/pricing', function(container) {
    container.innerHTML = '<div class="page-header"><h2>计费规则</h2><p>透明定价，按量计费。以下价格为平台售价，已包含服务溢价</p></div>'+

    '<div class="section-title">月费套餐</div>'+
    '<div class="tier-grid">'+
    '<div class="tier-card"><div class="tier-icon">◯</div><h3>免费版</h3><div class="price">免费</div><div class="features"><div>◆ 10万 Token/月</div><div>◆ 50 请求/天</div><div>◆ 基础模型支持</div><div>◆ 社区支持</div></div></div>'+
    '<div class="tier-card"><div class="tier-icon">◉</div><h3>专业版</h3><div class="price">¥19.9<span>/月</span></div><div class="features"><div>◆ 200万 Token/月</div><div>◆ 500 请求/天</div><div>◆ 全部模型可用</div><div>◆ 优先技术支持</div></div></div>'+
    '<div class="tier-card"><div class="tier-icon">◆</div><h3>至尊版</h3><div class="price">¥49.9<span>/月</span></div><div class="features"><div>◆ 1000万 Token/月</div><div>◆ 请求无限制</div><div>◆ 全部模型可用</div><div>◆ 专属客服通道</div></div></div>'+
    '</div>'+

    '<div class="section-title">各模型 Token 价格 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（输入 / 输出，单位：元/百万 Token）</span></div>'+
    '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>平台</th><th>模型</th><th>输入价格</th><th>输出价格</th><th>特点</th></tr></thead><tbody>'+
    '<tr><td><strong>DeepSeek 官方</strong></td><td>deepseek-chat</td><td class="price-cell">¥3.0</td><td class="price-cell">¥12.0</td><td>代码能力强，通用对话</td></tr>'+
    '<tr><td>DeepSeek 官方</td><td>deepseek-reasoner</td><td class="price-cell">¥6.0</td><td class="price-cell">¥24.0</td><td>深度推理，复杂逻辑</td></tr>'+
    '<tr><td><strong>硅基流动</strong></td><td>DeepSeek-V3 / R1</td><td class="price-cell">¥3.0</td><td class="price-cell">¥12.0</td><td>开源模型托管，国内直连</td></tr>'+
    '<tr><td>硅基流动</td><td>Qwen2.5-72B</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>阿里通义千问，中文优化</td></tr>'+
    '<tr><td>硅基流动</td><td>GLM-4.6</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>智谱对话模型，速度快</td></tr>'+
    '<tr><td><strong>阿里百炼</strong></td><td>通义千问 Plus/Max</td><td class="price-cell">¥6.0</td><td class="price-cell">¥18.0</td><td>中文理解最强</td></tr>'+
    '<tr><td><strong>智谱 AI</strong></td><td>GLM-4 Plus/Flash</td><td class="price-cell">¥6.0</td><td class="price-cell">¥18.0</td><td>极速响应，免费额度</td></tr>'+
    '<tr><td><strong>火山方舟</strong></td><td>豆包 Pro/Lite</td><td class="price-cell">¥4.0</td><td class="price-cell">¥9.0</td><td>字节跳动，超快速度</td></tr>'+
    '<tr><td><strong>Kimi</strong></td><td>Kimi 128K</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>超长上下文，文档分析</td></tr>'+
    '</tbody></table></div>'+

    '<div class="section-title">使用规则</div>'+
    '<div class="card"><div style="line-height:2;font-size:14px;color:var(--text-secondary)">'+
    '<p><strong>1. 计费方式：</strong>按实际消耗 Token 计费，输入和输出分别计算。1 Token ≈ 1 个中文字或 0.75 个英文单词。</p>'+
    '<p><strong>2. 月费套餐：</strong>购买月费套餐后，在额度内不限模型使用。超出部分按量计费或等待下月重置。</p>'+
    '<p><strong>3. API Key：</strong>每个账户拥有唯一 API Key，请妥善保管，泄露造成的损失由用户自行承担。</p>'+
    '<p><strong>4. 调用限制：</strong>免费版每日 50 次请求，专业版 500 次。至尊版无限制。</p>'+
    '<p><strong>5. 禁止用途：</strong>禁止用于生成违法、暴力、色情等违规内容。违者封禁账户不予退款。</p>'+
    '<p><strong>6. 服务保障：</strong>我们会尽力保证服务可用性，但不对因第三方模型供应商故障导致的服务中断承担责任。</p>'+
    '<p><strong>7. 退款政策：</strong>月费套餐购买后不支持退款。Token 余额不可提现。</p>'+
    '</div></div>';

    return {unmount:function(){}};
});
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Theme toggle
var themeBtn = document.getElementById('btn-theme');
var savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeBtn) themeBtn.addEventListener('click', function() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// Logout
var logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) logoutBtn.addEventListener('click', function() { api.logout(); });

// Toast
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity .2s'; setTimeout(function() { toast.remove(); }, 200); }, 3500);
}

// Enter key for chat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        var el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            var form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
});
// Desktop Pet - Whale Mascot
(function() {
    var messages = [
        '你好！有什么可以帮你？',
        '试试模型广场，有好多模型哦~',
        'DeepSeek 代码能力国产第一！',
        '记得去控制台看用量~',
        '流式输出更丝滑！',
        '点击我可以拖拽移动~',
        '双击我试试看！',
        '累了就切换深色主题吧',
    ];

    var pet = document.createElement('div');
    pet.id = 'desktop-pet';
    pet.innerHTML = '<div class="pet-body"><svg width="52" height="52" viewBox="0 0 64 64"><ellipse cx="32" cy="36" rx="24" ry="18" fill="#6366f1"/><ellipse cx="32" cy="34" rx="22" ry="16" fill="#818cf8"/><circle cx="20" cy="32" r="4" fill="#fff"/><circle cx="21" cy="31" r="2" fill="#1e1b4b"/><circle cx="40" cy="32" r="4" fill="#fff"/><circle cx="41" cy="31" r="2" fill="#1e1b4b"/><path d="M28 38 Q32 42 36 38" stroke="#4f46e5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 28 Q6 22 8 16 Q14 18 16 24" fill="#818cf8" opacity="0.8"/><path d="M52 28 Q58 22 56 16 Q50 18 48 24" fill="#818cf8" opacity="0.8"/><ellipse cx="14" cy="18" rx="6" ry="3" fill="#c7d2fe" opacity="0.6"/></svg></div><div class="pet-bubble"></div>';

    document.body.appendChild(pet);

    var bubble = pet.querySelector('.pet-bubble');
    var isDragging = false;
    var startX, startY, petX, petY;
    var bubbleTimer;
    var idleTimer;
    var clickCount = 0;

    // Position
    pet.style.position = 'fixed';
    pet.style.bottom = '20px';
    pet.style.right = '20px';
    pet.style.zIndex = '9998';
    pet.style.cursor = 'grab';
    pet.style.userSelect = 'none';
    pet.style.transition = 'transform .3s ease';

    // Bubble style
    bubble.style.cssText = 'position:absolute;bottom:70px;right:0;background:var(--bg-card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:8px 14px;font-size:12.5px;color:var(--text,#0f172a);white-space:nowrap;opacity:0;transform:translateY(8px);transition:all .25s ease;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.1);font-family:var(--font);max-width:200px;white-space:normal';

    function showBubble(msg) {
        bubble.textContent = msg;
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function() {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(8px)';
        }, 4000);
    }

    function randomMessage() {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Idle animation
    function idleAnim() {
        pet.style.transform = 'translateY(-6px)';
        setTimeout(function() { pet.style.transform = 'translateY(0)'; }, 1200);
        idleTimer = setTimeout(idleAnim, 3000 + Math.random() * 4000);
    }
    idleAnim();

    // Random speech
    function randomSpeak() {
        if (Math.random() > 0.5) showBubble(randomMessage());
        setTimeout(randomSpeak, 15000 + Math.random() * 30000);
    }
    setTimeout(randomSpeak, 8000);

    // Click
    pet.addEventListener('click', function(e) {
        if (isDragging) return;
        clickCount++;
        if (clickCount === 2) {
            // Double click
            pet.style.transform = 'scale(1.3) rotate(15deg)';
            setTimeout(function() { pet.style.transform = 'scale(1) rotate(0)'; }, 300);
            showBubble('哎呀！别戳我~');
            clickCount = 0;
        } else {
            pet.style.transform = 'translateY(-12px)';
            setTimeout(function() { pet.style.transform = 'translateY(0)'; }, 200);
            showBubble(randomMessage());
        }
        setTimeout(function() { clickCount = 0; }, 400);
    });

    // Drag
    pet.addEventListener('mousedown', function(e) {
        isDragging = true;
        pet.style.cursor = 'grabbing';
        pet.style.transition = 'none';
        startX = e.clientX;
        startY = e.clientY;
        var rect = pet.getBoundingClientRect();
        petX = rect.left;
        petY = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
        pet.style.left = (petX + dx) + 'px';
        pet.style.top = (petY + dy) + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        pet.style.cursor = 'grab';
        pet.style.transition = 'transform .3s ease';
    });

    // Touch drag
    pet.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        var rect = pet.getBoundingClientRect();
        petX = rect.left;
        petY = rect.top;
    });
    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
        pet.style.left = (petX + dx) + 'px';
        pet.style.top = (petY + dy) + 'px';
    });
    document.addEventListener('touchend', function() { isDragging = false; });

    // Hover scale
    pet.addEventListener('mouseenter', function() { if (!isDragging) pet.style.transform = 'scale(1.08)'; });
    pet.addEventListener('mouseleave', function() { if (!isDragging) pet.style.transform = 'scale(1)'; });
})();
