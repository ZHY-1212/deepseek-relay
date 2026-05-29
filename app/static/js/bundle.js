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
            if (resp.status === 401) {
                this.clearToken();
                window.location.hash = '#/login';
                throw new Error('登录已过期，请重新登录');
            }
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
    // Normalize parameterized routes (longest match first to avoid #/models matching #/models-intro)
    var bestKey = '';
    for (var k in routes) {
        if (hash.indexOf(k) === 0 && k.length > bestKey.length && k !== '#/login') { bestKey = k; }
    }
    if (bestKey) hash = bestKey;
    var token = api.getToken();
    var isPublic = hash === '#/login' || hash === '#/welcome';

    if (!token && !isPublic) { window.location.hash = '#/welcome'; return; }
    if (token && isPublic) { window.location.hash = '#/models'; return; }

    var topnav = document.getElementById('topnav');
    var app = document.getElementById('app');

    if (token && !isPublic) {
        topnav.style.display = 'flex';
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = user.is_admin ? '' : 'none'; });
    } else { topnav.style.display = 'none'; }

    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    if (currentPage && currentPage.unmount) { try { currentPage.unmount(); } catch(e) {} }

    app.innerHTML = '<div style="text-align:center;padding:60px 0"><div style="width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div></div>';

    var renderFn = routes[hash];
    if (renderFn) {
        setTimeout(function() {
            try { currentPage = renderFn(app); } catch(e) {
                app.innerHTML = '<p style="color:var(--red);padding:40px">错误：'+e.message+'</p>';
            }
        }, 10);
    } else {
        app.innerHTML = '<h2 style="text-align:center;padding:80px;color:var(--text-secondary)">页面不存在</h2>';
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
registerRoute('#/login', function(container) {
    var tab = 'login';
    function render() {
        container.innerHTML = '<div class="auth-page">'+
            '<div class="geo geo-1"></div><div class="geo geo-2"></div><div class="geo geo-3"></div><div class="geo geo-4"></div><div class="geo geo-5"></div>'+
            '<div class="auth-card" style="position:relative;z-index:1">' +
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
            '<p class="footer-note">'+(tab==='login'?'还没有账户？点击「注册」':'已有账户？点击「登录」')+'<br>注册即表示同意 <a href="#/pricing" style="color:var(--accent)">服务条款</a></p>' +
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
registerRoute('#/welcome', function(container) {
    container.innerHTML =
        '<div style="min-height:100vh;background:linear-gradient(180deg,#f8fafc 0%,#f0f4ff 100%)">'+
        // Hero
        '<div style="max-width:900px;margin:0 auto;padding:60px 24px 40px;text-align:center">'+
        '<div style="font-size:42px;font-weight:800;letter-spacing:-.04em;line-height:1.2;margin-bottom:16px">一个 Key 调用<br>所有主流大模型</div>'+
        '<p style="font-size:17px;color:var(--text-secondary);line-height:1.7;max-width:560px;margin:0 auto 28px">聚合 DeepSeek、通义千问、智谱、豆包、Kimi 等 6 大平台 15+ 模型。无需分别注册，统一计费，国内直连。</p>'+
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'+
        '<a href="#/login" style="display:inline-block;padding:13px 32px;background:var(--accent);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">免费注册</a>'+
        '<a href="#/login" style="display:inline-block;padding:13px 32px;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:var(--text);font-weight:500;font-size:15px">登录</a></div>'+
        '<p style="font-size:12px;color:var(--text-tertiary);margin-top:14px">注册即送 200 万 Token 免费试用</p>'+
        '</div>'+

        // Features
        '<div style="max-width:900px;margin:0 auto;padding:20px 24px 60px">'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">'+
        feat('🌐','多模型聚合','一个 API Key 调用 DeepSeek、通义千问、GLM、豆包、Kimi 等所有主流模型，无需逐个平台注册。')+
        feat('💰','按量付费','用多少花多少，充值余额永不过期。不同模型透明定价，输入输出分别计费。')+
        feat('⚡','国内直连','服务器部署在亚洲，国内访问低延迟。无需科学上网即可调用全球大模型。')+
        feat('🔌','OpenAI 兼容','完全兼容 OpenAI SDK，修改 base_url 即可用。支持流式输出、图片识别、深度推理。')+
        feat('📊','用量可视化','实时 Token 消耗图表，输入/输出分开统计。7 天趋势、单次调用明细一目了然。')+
        feat('🛡️','安全可靠','API Key 加密存储，HTTPS 传输。请求日志可追溯，异常调用自动告警。')+
        '</div>'+

        // Platforms
        '<div class="section-title" style="text-align:center;margin-top:40px">支持平台</div>'+
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:40px">'+
        plat('DS','DeepSeek','#4f46e5')+
        plat('QW','通义千问','#f97316')+
        plat('GL','智谱 GLM','#2563eb')+
        plat('DB','豆包','#3370ff')+
        plat('KM','Kimi','#6d28d9')+
        plat('SF','硅基流动','#7c3aed')+
        '</div>'+

        // CTA
        '<div style="text-align:center;padding:40px 0">'+
        '<p style="font-size:19px;font-weight:650;margin-bottom:16px">注册即送 200 万 Token 免费试用</p>'+
        '<a href="#/login" style="display:inline-block;padding:14px 40px;background:var(--accent);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px">免费开始使用</a>'+
        '</div></div></div>';

    return {unmount:function(){}};

    function feat(icon,title,desc) {
        return '<div class="card" style="text-align:center"><div style="font-size:28px;margin-bottom:10px">'+icon+'</div><h3 style="font-size:15px;font-weight:650;margin-bottom:6px">'+title+'</h3><p style="font-size:13px;color:var(--text-secondary);line-height:1.6">'+desc+'</p></div>';
    }
    function plat(icon,name,color) {
        return '<div style="text-align:center;padding:12px 16px"><div style="width:36px;height:36px;border-radius:8px;background:'+color+';color:#fff;text-align:center;line-height:36px;font-weight:700;font-size:12px;margin:0 auto 6px">'+icon+'</div><div style="font-size:11px;color:var(--text-secondary)">'+name+'</div></div>';
    }
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
registerRoute('#/models-intro', function(container) {
    var providers = [
        {name:'DeepSeek 官方',url:'deepseek.com',color:'#4f46e5',icon:'DS',
            desc:'DeepSeek 由深度求索公司开发，专注于通用人工智能。代码能力国产第一，全球开源模型排名前三。V3 系列支持 128K 上下文和多模态识别。',
            models:[
                {name:'deepseek-chat',desc:'通用旗舰模型，支持文本对话和图片识别。128K 上下文窗口，可一次处理整本小说。擅长代码生成、翻译、创意写作。适用场景：日常对话、编程助手、内容创作。',best:'代码生成、通用对话'},
                {name:'deepseek-reasoner',desc:'深度推理模型，在数学、逻辑、编程竞赛中表现优异。会先进行内部推理再给出答案，思考过程可见。适用场景：数学题解、复杂逻辑、算法设计。',best:'数学推理、复杂逻辑'}
            ]},
        {name:'硅基流动 SiliconFlow',url:'siliconflow.cn',color:'#7c3aed',icon:'SF',
            desc:'国内领先的 AI 模型聚合平台，托管 100+ 开源模型。提供国内直连低延迟服务，注册送 2000 万 Token。支持 OpenAI 兼容 API。',
            models:[
                {name:'DeepSeek V3/R1 (托管)',desc:'硅基流动托管的 DeepSeek 模型，性能与官方一致但延迟更低。适合需要国内高速访问的场景。',best:'国内低延迟'},
                {name:'Qwen2.5 72B',desc:'阿里通义千问旗舰开源模型，720 亿参数。中文能力突出，在 C-Eval 中文评测中名列前茅。支持 128K 超长上下文。',best:'中文对话、长文本'},
                {name:'GLM-4.6',desc:'智谱 AI 最新对话模型，响应速度极快。在通用对话和工具调用方面表现均衡，是综合性价比较高的选择。',best:'快速响应、工具调用'}
            ]},
        {name:'阿里百炼 DashScope',url:'dashscope.aliyun.com',color:'#f97316',icon:'QW',
            desc:'阿里云推出的 AI 模型服务平台，通义千问系列旗舰。中文理解能力业界第一，数学推理能力国产最强。注册送百万 Token。',
            models:[
                {name:'qwen-plus',desc:'通义千问中端模型，性价比之选。日常对话流畅自然，中文语境理解优秀。128K 上下文，适合大部分通用场景。',best:'性价比、日常对话'},
                {name:'qwen-max',desc:'通义千问旗舰模型，中文能力和数学推理均为国产第一。适合对质量要求极高的场景：学术论文、专业翻译、复杂分析。',best:'中文旗舰、学术写作'}
            ]},
        {name:'智谱 AI Zhipu',url:'open.bigmodel.cn',color:'#2563eb',icon:'GL',
            desc:'智谱 AI 由清华大学团队创立，是国内最早的大模型公司之一。GLM 系列以响应速度快著称，首字延迟行业最低。',
            models:[
                {name:'glm-4-plus',desc:'智谱旗舰模型，在多项评测中表现优异。支持长文本理解和复杂推理。适用场景：企业级应用、专业写作。',best:'企业应用、长文本'},
                {name:'glm-4-flash',desc:'智谱轻量模型，速度极快且免费。适合实时对话、客服机器人、简单问答等对延迟敏感的场景。',best:'极速响应、免费额度'}
            ]},
        {name:'火山方舟 Volcengine',url:'console.volcengine.com/ark',color:'#3370ff',icon:'DB',
            desc:'字节跳动旗下 AI 平台，豆包系列以速度闻名。首字延迟 0.3 秒，生成速度 120 t/s，为业界最快。注册每月送 100 万 Token。',
            models:[
                {name:'doubao-pro-256k',desc:'字节旗舰模型，256K 超长上下文。可用于整本书级别的文档分析。中文优化，速度和效果兼具。',best:'超长上下文、极速'},
                {name:'doubao-lite-128k',desc:'字节轻量模型，业界最快响应速度。适合需要实时交互的场景。每月有免费额度。',best:'极速免费、实时对话'}
            ]},
        {name:'月之暗面 Moonshot',url:'platform.moonshot.cn',color:'#6d28d9',icon:'KM',
            desc:'月之暗面由清华杨植麟创立，专注于长文本处理。Kimi 以"长文本专家"著称，擅长文档分析和深度阅读。',
            models:[
                {name:'moonshot-v1-128k',desc:'Kimi 128K 长文本模型，可一次性处理整本小说或长篇报告。擅长摘要、问答、文档分析。适合阅读论文、分析合同、总结会议纪要。',best:'文档分析、深度阅读'}
            ]}
    ];

    container.innerHTML =
        '<div class="page-header"><h2>模型介绍</h2><p>了解各平台模型的能力、特点和最佳使用场景</p></div>'+
        providers.map(function(prov){
            return '<div class="section-title"><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:'+prov.color+';color:#fff;text-align:center;line-height:24px;font-size:11px;font-weight:700;margin-right:8px">'+prov.icon+'</span>'+prov.name+' <span style="font-weight:400;font-size:12px;color:var(--text-tertiary);margin-left:8px">'+prov.url+'</span></div>'+
            '<div class="card" style="margin-bottom:8px"><p style="font-size:13.5px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">'+prov.desc+'</p>'+
            prov.models.map(function(m){
                return '<div style="background:var(--bg-hover);border-radius:var(--radius);padding:14px 16px;margin-bottom:8px">'+
                    '<div style="font-weight:650;margin-bottom:4px">'+m.name+'</div>'+
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:6px">'+m.desc+'</p>'+
                    '<span style="font-size:11px;background:var(--accent-subtle);color:var(--accent);padding:2px 8px;border-radius:4px">擅长：'+m.best+'</span></div>';
            }).join('')+'</div>';
        }).join('')+
        '<p style="text-align:center;font-size:12px;color:var(--text-tertiary);margin-top:20px">信息来源于各模型官方文档，实际效果可能因版本更新而变化</p>';

    return {unmount:function(){}};
});
registerRoute('#/leaderboard', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        var baseUrl = window.location.origin;
        container.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-tertiary)">加载中...</div>';

        // Fetch all models usage stats from admin
        var allData = null;
        try { allData = await api.get('/admin/all-users'); } catch(e) {}

        if (!allData) {
            container.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-secondary)">暂无数据</p>';
            return;
        }

        var users = allData.users || [];
        var overview = allData.overview || {};

        // Model popularity (from usage records)
        var modelCounts = {};
        var hourlyData = Array(24).fill(0);
        // We don't have detailed model usage per model publicly, so use what we have
        var topUsers = users.slice(0, 20);

        // Cost comparison
        var platformCost = overview.estimated_revenue || 0;
        var directCost = (overview.total_api_tokens || 0) / 1000000 * 2; // ~¥2/M at official prices
        var savings = directCost > 0 ? Math.round((1 - platformCost / directCost) * 100) : 0;

        container.innerHTML =
            '<div class="page-header"><h2>平台数据</h2><p>用量排行 · 成本对比 · 社区透明</p></div>'+

            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-label">总用户</div><div class="stat-value">'+overview.total_users+'</div></div>'+
            '<div class="stat-card"><div class="stat-label">总 API 调用</div><div class="stat-value">'+(overview.total_api_tokens||0).toLocaleString()+'</div></div>'+
            '<div class="stat-card"><div class="stat-label">平台价格</div><div class="stat-value" style="color:var(--blue)">¥'+platformCost+'</div><span style="font-size:12px;color:var(--text-tertiary)">用户实际支付</span></div>'+
            '<div class="stat-card"><div class="stat-label">官方直购价</div><div class="stat-value" style="color:var(--green)">¥'+(directCost.toFixed(0))+'</div><span style="font-size:12px;color:var(--text-tertiary)">如果直接买官方 API</span></div>'+
            '</div>'+

            '<div class="section-title">用户消耗排行 Top 20</div>'+
            '<div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>#</th><th>用户</th><th>套餐</th><th>API Token</th></tr></thead><tbody>'+
            topUsers.map(function(u,i){
                return '<tr><td>'+(i+1)+'</td><td>'+u.username.slice(0,2)+'***</td><td><span class="badge badge-'+u.tier+'">'+u.tier+'</span></td><td>'+u.total_api_tokens.toLocaleString()+'</td></tr>';
            }).join('')+
            '</tbody></table></div>'+

            '<div class="section-title">时段热力图（全平台）</div>'+
            '<div class="card"><div class="chart-bars">'+
            hourlyData.map(function(v,i){
                var h = Math.max(2, (v / Math.max(1, Math.max.apply(null, hourlyData))) * 100);
                return '<div class="chart-bar" style="height:'+h+'%;background:var(--blue);opacity:.5" title="'+i+'时: '+v+' 次"></div>';
            }).join('')+
            '</div><div class="chart-labels">'+hourlyData.map(function(v,i){return '<span>'+i+'时</span>'}).join('')+'</div></div>'+

            '<p style="text-align:center;font-size:12px;color:var(--text-tertiary);margin-top:20px">数据每小时更新 · 用户隐私已脱敏</p>';

    }
    load();
    return {unmount:function(){}};
});
registerRoute('#/dashboard', function(container) {
    var profile = null;
    async function load() {
        try { profile = await api.get('/dashboard/profile'); localStorage.setItem('user',JSON.stringify(profile.user)); }
        catch(e) { container.innerHTML = '<p style="color:var(--red);padding:40px">加载失败：'+e.message+'</p>'; return; }
        var anns = [];
        try { anns = await api.get('/admin/announcements'); } catch(e) {}
        render(anns);
    }

    function render(anns) {
        anns = anns || [];
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

        // Usage prediction
        var avgDaily = 0;
        if (days.length > 0) {
            var total7 = days.reduce(function(s,d){return s+(d.tokens||0)},0);
            avgDaily = Math.round(total7 / 7);
        }
        var daysLeft = avgDaily > 0 ? Math.round(u.balance_tokens / avgDaily) : '∞';
        var predText = avgDaily > 0 ? '按近 7 天用量，余额预计可用 <strong>'+daysLeft+'</strong> 天' : '近 7 天无使用记录';

        var newKey = localStorage.getItem('new_api_key');
        if(newKey){setTimeout(function(){showToast('API Key（仅显示一次）：'+newKey,'success');localStorage.removeItem('new_api_key')},500)}

        container.innerHTML =
            '<div class="page-header"><h2>控制台</h2><p>用量统计 · Token 消耗 · 套餐管理</p></div>'+
            (anns.length > 0 ? '<div style="margin-bottom:20px">'+anns.map(function(a){
                return '<div class="card" style="border-left:3px solid var(--blue);padding:14px 18px;margin-bottom:8px"><div style="font-weight:650;font-size:14px;margin-bottom:4px">📢 '+a.title+'</div><div style="font-size:13px;color:var(--text-secondary)">'+a.content+'</div></div>';
            }).join('')+'</div>' : '')+
            ''+

            // Summary cards - DeepSeek style
            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-label">本月已用 Token</div><div class="stat-value">'+(usage.total_tokens||0).toLocaleString()+'</div><div class="meter"><div class="meter-fill" style="width:'+pct+'%;background:'+mc+'"></div></div><span style="font-size:12px;color:var(--text-tertiary)">剩余 '+u.balance_tokens.toLocaleString()+' / '+(ct.tokens).toLocaleString()+'</span></div>'+
            '<div class="stat-card"><div class="stat-label">用量预测</div><div class="stat-value" style="font-size:18px">'+daysLeft+' <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">天</span></div><span style="font-size:12px;color:var(--text-tertiary)">日均 '+avgDaily.toLocaleString()+' Token</span></div>'+
            '<div class="stat-card"><div class="stat-label">输入 Token</div><div class="stat-value">'+(usage.today_tokens_in||0).toLocaleString()+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_tokens_in||0).toLocaleString()+' · 今日</span></div>'+
            '<div class="stat-card"><div class="stat-label">输出 Token</div><div class="stat-value">'+(usage.today_tokens_out||0).toLocaleString()+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_tokens_out||0).toLocaleString()+' · 今日</span></div>'+
            '<div class="stat-card"><div class="stat-label">请求次数</div><div class="stat-value">'+(usage.today_requests||0)+'</div><span style="font-size:12px;color:var(--text-tertiary)">累计 '+(usage.total_requests||0)+' · 今日</span></div>'+
            '</div>'+

            // Usage trend chart
            '<div class="card"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px">Token 用量趋势（近 7 天）</h3>'+
            (usage.total_tokens === 0 ? '<p style="text-align:center;color:var(--text-tertiary);padding:40px">暂无使用数据，开始调用 API 后这里会显示趋势图</p>' : '')+
            '<div style="display:flex;gap:16px;align-items:center;margin-bottom:10px;font-size:12px;color:var(--text-secondary)">'+
            '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--blue);margin-right:4px"></span>输入</span>'+
            '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);margin-right:4px"></span>输出</span>'+
            '</div>'+
            '<div class="chart-row"><div style="min-height:160px">'+
            buildGroupedChart(days)+
            '<div class="chart-labels" style="margin-top:8px">'+days.map(function(d){return '<span>'+d.date.slice(5)+'</span>'}).join('')+'</div>'+
            '</div></div></div>'+

            // API Key
            '<div class="section-title">API Key</div><div class="card"><div class="api-key-display">'+u.api_key_prefix+'</div><div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn-sm" id="btn-copy-curl">复制 curl</button><button class="btn-sm" id="btn-copy-py">复制 Python</button><button class="btn-sm" id="btn-reset-key" style="margin-left:auto">重新生成</button></div><div style="font-size:12px;color:var(--text-tertiary);margin-top:6px">完整 Key 仅创建时显示一次</div></div>';

        var kd=container.querySelector('.api-key-display');
        if(kd) kd.addEventListener('click',function(){navigator.clipboard.writeText(this.textContent).then(function(){showToast('已复制','success')})});

        // Copy curl
        var cbCurl=document.getElementById('btn-copy-curl');
        if(cbCurl) cbCurl.addEventListener('click',function(){
            var curl='curl '+window.location.origin+'/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer '+u.api_key_prefix+'" \\\n  -d \'{"model":"deepseek-chat","messages":[{"role":"user","content":"hello"}]}\'';
            navigator.clipboard.writeText(curl).then(function(){showToast('已复制 curl 命令','success')});
        });
        var cbPy=document.getElementById('btn-copy-py');
        if(cbPy) cbPy.addEventListener('click',function(){
            var py='from openai import OpenAI\n\nclient = OpenAI(\n    api_key="'+u.api_key_prefix+'",\n    base_url="'+window.location.origin+'/v1"\n)\n\nresponse = client.chat.completions.create(\n    model="deepseek-chat",\n    messages=[{"role":"user","content":"hello"}]\n)\nprint(response.choices[0].message.content)';
            navigator.clipboard.writeText(py).then(function(){showToast('已复制 Python 代码','success')});
        });

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
registerRoute('#/chat', function(container) {
    var messages = [];
    var streaming = false;
    var pendingImage = null;
    var showHistory = false;
    var selectedModel = localStorage.getItem('chat_model') || 'deepseek-chat';
    var userId = (JSON.parse(localStorage.getItem('user') || '{}')).id || 'anon';
    var STORAGE_KEY = 'chat_' + userId;
    var visionModels = ['glm-4v-plus'];
    function isVisionModel(m) { return visionModels.indexOf(m) >= 0; }
    var H24 = 24 * 60 * 60 * 1000;

    function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e) {} }
    function load() { try { var r = localStorage.getItem(STORAGE_KEY); if (r) messages = JSON.parse(r); } catch(e) { messages = []; } }
    function clearAll() { messages = []; showHistory = false; save(); render(); }

    function goBottom() {
        var md = document.getElementById('chat-messages');
        if (md) md.scrollTop = md.scrollHeight;
    }

    function appendMsg(m, idx) {
        var md = document.getElementById('chat-messages');
        if (!md) return;
        var div = document.createElement('div');
        div.innerHTML = buildOneMsg(m, idx);
        var node = div.firstElementChild;
        // Insert before the bottom anchor
        var anchor = document.getElementById('chat-bottom');
        if (anchor) md.insertBefore(node, anchor);
        else md.appendChild(node);
    }

    function buildOneMsg(m, idx) {
        var ts = m.ts ? fmtTime(m.ts) : '';
        if (m.role === 'user') return '<div class="chat-msg user"><div class="role">你 <span class="msg-time">'+ts+'</span></div>'+(m.image?'<img src="'+m.image+'" class="chat-img" style="max-width:160px;max-height:160px;border-radius:10px;margin-bottom:4px">':'')+'<div class="bubble">'+escHtml(m.content)+'</div></div>';

        var icon = '✦'; var name = m.model || 'assistant';
        var html = '<div class="chat-msg assistant"><div class="role"><span class="model-icon">'+icon+'</span> '+name+' <span class="msg-time">'+ts+'</span>'+(m.tokens?' <span class="tokens">'+m.tokens+' tokens</span>':'')+'</div>'+
            '<div class="msg-actions"><button class="btn-copy-msg" data-content="'+escAttr(m.content)+'" title="复制">📋</button><button class="btn-quote-msg" data-content="'+escAttr(m.content)+'" title="引用">💬</button><button class="btn-retry-msg" data-idx="'+idx+'" title="重试">🔄</button></div>';
        if (m.reasoning) html += '<div class="thinking-block done" style="margin-top:4px"><div class="thinking-header collapsed"><span>思考过程</span></div><div class="thinking-content" style="display:none">'+escHtml(m.reasoning)+'</div></div>';
        html += '<div class="bubble">'+escHtml(m.content)+'</div></div>';
        return html;
    }

    function fmtTime(ts) { var d=new Date(ts), n=new Date(); var h=d.getHours().toString().padStart(2,'0'), m=d.getMinutes().toString().padStart(2,'0'); if(d.toDateString()===n.toDateString()) return h+':'+m; return (d.getMonth()+1)+'/'+d.getDate()+' '+h+':'+m; }
    function escHtml(t) { var d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
    function escAttr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function bindActions() {
        document.querySelectorAll('.btn-copy-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();navigator.clipboard.writeText(this.dataset.content).then(function(){showToast('已复制','success')})}});
        document.querySelectorAll('.btn-quote-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();var inp=document.getElementById('chat-input');inp.value='> '+this.dataset.content.split('\n').join('\n> ')+'\n\n';inp.focus();showToast('已引用','success')}});
        document.querySelectorAll('.btn-retry-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();retryMsg(parseInt(this.dataset.idx))}});
        document.querySelectorAll('.thinking-header').forEach(function(h){ h.onclick=function(){var c=this.nextElementSibling;c.style.display=c.style.display==='none'?'block':'none';this.classList.toggle('collapsed')}});
    }

    async function retryMsg(idx) {
        if (idx<0||idx>=messages.length||messages[idx].role!=='assistant') return;
        messages.splice(idx,1);
        var lastUser = messages.slice().reverse().find(function(m){return m.role==='user'});
        if (!lastUser) return;
        save();
        render();
        var model = lastUser._model || 'deepseek-chat';
        var img = lastUser.image ? {dataUrl: lastUser.image} : null;
        if (document.getElementById('stream-toggle').checked) await doStream(model, img);
        else await doNormal(model, img);
        save();
        render();
    }

    function render() {
        var all = messages;
        var recent = [], older = [];
        var now = Date.now();
        all.forEach(function(m){ if(m.ts && (now-m.ts)>H24) older.push(m); else recent.push(m); });
        var visible = showHistory ? all : recent;
        var hiddenCnt = all.length - visible.length;

        // Hide first, render, scroll, then show — no visual flash
        container.style.visibility = 'hidden';
        container.innerHTML =
            '<h2>AI 对话</h2><div class="card">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
            '<span style="font-size:13px;color:var(--text-secondary)">'+(all.length?all.length+' 条消息':'')+'</span>'+
            (all.length?'<button class="btn-sm" id="btn-clear">清空</button>':'')+'</div>'+
            '<div id="chat-messages">'+
            (all.length===0?'<p style="color:var(--text-tertiary);text-align:center;padding-top:160px">输入消息开始对话<br><small style="font-size:12px">支持图片 · 流式 · 推理 · 引用</small></p>':'')+
            (hiddenCnt>0&&!showHistory?'<div style="text-align:center;margin:12px 0"><button class="btn-sm" id="btn-load-history">查看更早的消息（'+hiddenCnt+' 条）</button></div>':'')+
            (showHistory&&older.length>0?'<div style="text-align:center;margin:12px 0;font-size:12px;color:var(--text-tertiary);border-bottom:1px solid var(--border);padding-bottom:8px">以下为 24 小时前的历史消息</div>':'')+
            visible.map(function(m,i){return buildOneMsg(m,messages.indexOf(m))}).join('')+
            '<div id="chat-bottom"></div>'+
            '<div id="streaming-msg" class="chat-msg assistant" style="display:none"><div class="role"><span class="model-icon">✦</span> <span id="stream-model-name">deepseek-chat</span> <span id="streaming-indicator"></span></div><div id="stream-thinking" class="thinking-block" style="display:none"><div class="thinking-header" id="thinking-toggle"><span>思考中</span><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div><div class="thinking-content" id="stream-thinking-content"></div></div><div class="bubble" id="streaming-content"></div></div>'+
            '</div>'+
            '<form id="chat-form">'+
            (pendingImage?'<div class="img-preview" id="img-preview"><img src="'+pendingImage.dataUrl+'" alt="预览"><button type="button" class="img-remove" id="img-remove">&times;</button></div>':'')+
            '<div class="chat-input-row">'+
            '<input type="text" id="chat-input" placeholder="'+(pendingImage?'描述这张图片...':'输入消息，Enter 发送')+'" autocomplete="off">'+
            '<div class="chat-toolbar">'+(isVisionModel(selectedModel)?'<button type="button" id="btn-upload" title="上传图片">🖼</button><button type="button" id="btn-link" title="粘贴链接">🔗</button>':'')+'</div>'+
            '<input type="file" id="file-input" accept="image/*" style="display:none">'+
            '<button type="submit" id="btn-send">发送</button></div>'+
            '<div class="chat-options"><label><input type="checkbox" id="stream-toggle" checked> 流式</label><label>模型 <select id="model-select"><optgroup label="DeepSeek"><option value="deepseek-chat" '+(selectedModel==='deepseek-chat'?'selected':'')+'>deepseek-chat</option><option value="deepseek-reasoner" '+(selectedModel==='deepseek-reasoner'?'selected':'')+'>deepseek-reasoner</option></optgroup><optgroup label="硅基流动"><option value="deepseek-ai/DeepSeek-V3" '+(selectedModel==='deepseek-ai/DeepSeek-V3'?'selected':'')+'>DeepSeek-V3</option><option value="deepseek-ai/DeepSeek-R1" '+(selectedModel==='deepseek-ai/DeepSeek-R1'?'selected':'')+'>DeepSeek-R1</option><option value="Qwen/Qwen2.5-72B-Instruct" '+(selectedModel==='Qwen/Qwen2.5-72B-Instruct'?'selected':'')+'>Qwen2.5-72B</option><option value="Qwen/Qwen2.5-VL-72B-Instruct" '+(selectedModel==='Qwen/Qwen2.5-VL-72B-Instruct'?'selected':'')+'>🖼 Qwen2.5-VL (视觉)</option><option value="zai-org/GLM-4.6" '+(selectedModel==='zai-org/GLM-4.6'?'selected':'')+'>GLM-4.6</option></optgroup><optgroup label="阿里百炼"><option value="qwen-plus" '+(selectedModel==='qwen-plus'?'selected':'')+'>通义千问-Plus</option><option value="qwen-max" '+(selectedModel==='qwen-max'?'selected':'')+'>通义千问-Max</option></optgroup><optgroup label="智谱AI"><option value="glm-4-plus" '+(selectedModel==='glm-4-plus'?'selected':'')+'>GLM-4-Plus</option><option value="glm-4-flash" '+(selectedModel==='glm-4-flash'?'selected':'')+'>GLM-4-Flash</option><option value="glm-4v-plus" '+(selectedModel==='glm-4v-plus'?'selected':'')+'>🖼 GLM-4V (视觉)</option></optgroup><optgroup label="火山方舟"><option value="doubao-pro-256k" '+(selectedModel==='doubao-pro-256k'?'selected':'')+'>豆包-Pro</option><option value="doubao-lite-128k" '+(selectedModel==='doubao-lite-128k'?'selected':'')+'>豆包-Lite</option></optgroup><optgroup label="Kimi"><option value="moonshot-v1-128k" '+(selectedModel==='moonshot-v1-128k'?'selected':'')+'>Kimi-128K</option></optgroup></select></label></div></form></div>';

        // Go to bottom while still hidden, then reveal
        var md2 = document.getElementById('chat-messages');
        if (md2) md2.scrollTop = md2.scrollHeight;
        container.style.visibility = 'visible';

        // Event bindings
        document.getElementById('chat-form').addEventListener('submit', handleSend);
        var upBtn=document.getElementById('btn-upload'); if(upBtn) upBtn.addEventListener('click', function(){document.getElementById('file-input').click()});
        var linkBtn=document.getElementById('btn-link'); if(linkBtn) linkBtn.addEventListener('click', function(){var u=prompt('粘贴图片链接：');if(u&&u.trim()){pendingImage={dataUrl:u.trim(),filename:'link'};render();showToast('图片链接已添加','success')}});
        var fileInp=document.getElementById('file-input'); if(fileInp) fileInp.addEventListener('change', handleFile);
        if(pendingImage) document.getElementById('img-remove').addEventListener('click',function(){pendingImage=null;document.getElementById('file-input').value='';render()});
        document.getElementById('model-select').addEventListener('change',function(){selectedModel=this.value;localStorage.setItem('chat_model',selectedModel);render()});
        var lb = document.getElementById('btn-load-history'); if(lb) lb.addEventListener('click',function(){showHistory=true;render()});
        var cb = document.getElementById('btn-clear'); if(cb) cb.addEventListener('click',function(){if(confirm('清空所有对话？')) clearAll()});
        bindActions();
    }

    function handleFile(e) {
        var f=e.target.files[0]; if(!f) return;
        if(!f.type.startsWith('image/')){showToast('请选择图片','error');return}
        if(f.size>20*1024*1024){showToast('图片不能超过20MB','error');return}
        // Resize large images client-side before uploading
        var reader=new FileReader();
        reader.onload=function(ev){
            var img=new Image();
            img.onload=function(){
                var maxW=1024,maxH=1024;
                var w=img.width,h=img.height;
                var maxW=512,maxH=512;
            if(w>maxW||h>maxH){var ratio=Math.min(maxW/w,maxH/h);w=Math.round(w*ratio);h=Math.round(h*ratio)}
                var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
                var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
                pendingImage={dataUrl:canvas.toDataURL('image/jpeg',0.85),filename:f.name};render();
            };
            img.src=ev.target.result;
        };
        reader.readAsDataURL(f);
    }

    async function handleSend(e) {
        e.preventDefault(); if(streaming) return;
        var inp=document.getElementById('chat-input'); var txt=inp.value.trim();
        if(!txt&&!pendingImage) return; inp.value='';
        var useStream=document.getElementById('stream-toggle').checked;
        var model=selectedModel, img=pendingImage;
        var display=txt||'描述这张图片'; pendingImage=null; document.getElementById('file-input').value='';

        if(img) messages.push({role:'user',content:display,tokens:0,image:img.dataUrl,ts:Date.now(),_model:model});
        else messages.push({role:'user',content:display,tokens:0,ts:Date.now(),_model:model});
        save(); appendMsg(messages[messages.length-1]); goBottom();

        var user=JSON.parse(localStorage.getItem('user')||'{}');
        if(!user.api_key_prefix){ messages.push({role:'assistant',model:model,content:'未找到 API Key，请前往仪表盘获取。',tokens:0,ts:Date.now()}); save(); appendMsg(messages[messages.length-1]); goBottom(); return; }

        if(useStream) await doStream(model,img); else await doNormal(model,img);
        save(); appendMsg(messages[messages.length-1]); goBottom();
    }

    function buildMsgs(image) {
        var h=messages.filter(function(m){return m.tokens!==undefined});
        var hasImage=false;
        return h.map(function(m){
            if(m.role==='user'&&m.image && !hasImage){
                hasImage=true;
                var p=[{type:'text',text:m.content}];
                p.unshift({type:'image_url',image_url:{url:m.image}});
                return {role:'user',content:p};
            }
            return {role:m.role,content:m.content};
        });
    }

    async function doNormal(model, image) {
        try {
            var data=await api.post('/v1/chat/completions',{model:model,messages:buildMsgs(image)});
            var reply=data.choices[0].message.content||'', reasoning=data.choices[0].message.reasoning_content||'';
            messages.push({role:'assistant',model:model,content:reply,reasoning:reasoning,tokens:data.usage?data.usage.total_tokens:0,ts:Date.now()});
        } catch(err) {
            messages.push({role:'assistant',model:model,content:'错误：'+err.message,tokens:0,ts:Date.now()});
        }
    }

    async function doStream(model, image) {
        streaming = true;
        var sm = document.getElementById('streaming-msg');
        var sc = document.getElementById('streaming-content');
        var st = document.getElementById('stream-thinking');
        var stc = document.getElementById('stream-thinking-content');
        var tt = document.getElementById('thinking-toggle');
        var smn = document.getElementById('stream-model-name');

        sm.style.display = 'flex'; sc.textContent = ''; st.style.display = 'block'; stc.textContent = '';
        tt.classList.remove('collapsed'); smn.textContent = model;
        goBottom();

        var fullContent = '', fullReasoning = '', hasContent = false;
        try {
            var resp = await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.getToken()},body:JSON.stringify({model:model,messages:buildMsgs(image),stream:true})});
            if(!resp.ok){ var er=await resp.json().catch(function(){return{}}); throw new Error(er.detail||'HTTP '+resp.status); }
            var reader=resp.body.getReader(), decoder=new TextDecoder();
            while(true){ var r=await reader.read(); if(r.done) break;
                var text=decoder.decode(r.value,{stream:true});
                text.split('\n').forEach(function(line){
                    if(line.startsWith('data: ')&&!line.includes('[DONE]')){
                        try{
                            var obj=JSON.parse(line.slice(6)), delta=obj.choices?.[0]?.delta||{};
                            var chunk=delta.content||'', reasoningChunk=delta.reasoning_content||'';
                            if(reasoningChunk){ fullReasoning+=reasoningChunk; stc.textContent=fullReasoning; }
                            if(chunk){ if(!hasContent){ hasContent=true; tt.classList.add('collapsed'); stc.style.display='none'; } fullContent+=chunk; sc.textContent=fullContent; goBottom(); }
                        }catch(e){}
                    }
                });
            }
        } catch(err) { fullContent='错误：'+err.message; showToast(err.message,'error'); }
        streaming = false;
        sm.style.display = 'none';
        messages.push({role:'assistant',model:model,content:fullContent||'（无响应）',reasoning:fullReasoning||'',tokens:0,ts:Date.now()});
    }

    load(); render();
    return {unmount:function(){}};
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
registerRoute('#/recharge', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        try { var p = await api.get('/dashboard/profile'); user = p.user; localStorage.setItem('user', JSON.stringify(user)); } catch(e) {}

        var balance = user.balance_tokens || 0;
        var money = (balance / 1000000).toFixed(2);

        var pkgs = [
            {amt:5,tokens:'500万',badge:''},
            {amt:10,tokens:'1000万',badge:''},
            {amt:20,tokens:'2000万',badge:'推荐'},
            {amt:50,tokens:'5000万',badge:'最值'},
            {amt:100,tokens:'1亿',badge:''},
        ];

        container.innerHTML =
            '<div class="page-header"><h2>余额充值</h2><p>统一余额 · 全模型通用 · 按量消费</p></div>'+

            '<div class="stats-grid"><div class="stat-card"><div class="stat-label">当前余额</div><div class="stat-value" style="color:var(--accent)">¥<span id="bal">'+money+'</span></div><span style="font-size:12px;color:var(--text-tertiary)">≈ '+(balance/10000).toFixed(0)+' 万 Token</span></div>'+
            '<div class="stat-card"><div class="stat-label">可调用 API</div><div class="stat-value" style="font-size:18px">≈ '+(balance/30000).toFixed(0)+'<span style="font-size:14px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">DeepSeek Chat（3x加成）</span></div></div>'+

            '<div class="section-title">快速充值</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px">'+
            pkgs.map(function(p){
                var badge = p.badge ? '<span style="position:absolute;top:4px;right:4px;background:var(--accent);color:#fff;font-size:10px;padding:1px 6px;border-radius:8px">'+p.badge+'</span>' : '';
                return '<div class="stat-card" style="text-align:center;cursor:pointer;padding:16px;position:relative" onclick="window.location.hash=\'#/pay/'+p.amt+'\'">'+badge+'<div style="font-size:18px;font-weight:700">¥'+p.amt+'</div><div style="font-size:11px;color:var(--text-tertiary)">'+p.tokens+' Token</div></div>';
            }).join('')+'</div>'+

            '<div class="card"><div style="font-size:14px;font-weight:600;margin-bottom:10px">自定义金额</div>'+
            '<div class="form-row"><input type="number" id="custom-amt" placeholder="输入金额（元）" min="1"><button id="btn-custom">充值</button></div>'+
            '<span id="topup-msg" class="inline-msg"></span></div>'+

            '<div class="section-title">费率说明</div>'+
            '<div class="card"><div style="line-height:2;font-size:13px;color:var(--text-secondary)">'+
            '<p>通用余额可用于所有模型，不同模型消耗速率不同（3-4x加成）。详情见 <a href="#/models-intro" style="color:var(--accent)">模型介绍</a>。</p></div></div>';

        document.getElementById('btn-custom').addEventListener('click',function(){
            var amt = parseFloat(document.getElementById('custom-amt').value);
            if (!amt || amt < 1) { showToast('请输入有效金额','error'); return; }
            window.location.hash = '#/pay/'+amt;
        });
    }

    load();
    return {unmount:function(){}};
});
registerRoute('#/pay', function(container) {
    var amount = 0;
    var modelId = '';
    var hash = window.location.hash;
    var parts = hash.split('/'); // #/pay/MODEL/AMOUNT or #/pay/AMOUNT
    if (parts.length >= 4) { modelId = parts[2]; amount = parseFloat(parts[3]) || 0; }
    else if (parts.length >= 3) { amount = parseFloat(parts[2]) || 0; }

    if (!amount || amount < 1) {
        container.innerHTML = '<div style="text-align:center;padding:80px"><h2>无效金额</h2><p style="color:var(--text-secondary)"><a href="#/recharge" style="color:var(--accent)">返回充值</a></p></div>';
        return {unmount:function(){}};
    }

    var modelLabel = (modelId && modelId !== 'general') ? modelId : '通用余额';

    async function load() {
        container.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-tertiary)">加载中...</div>';

        // Run topup + QR fetch in parallel
        var body = {amount: amount};
        if (modelId && modelId !== 'general') body.model = modelId;

        var cachedQr = localStorage.getItem('payment_qr_cache');
        var qrData = cachedQr ? JSON.parse(cachedQr) : null;

        var promises = [api.post('/payment/topup', body)];
        if (!qrData) promises.push(api.get('/admin/payment-qr').then(function(d){qrData=d;localStorage.setItem('payment_qr_cache',JSON.stringify(d));return d}).catch(function(){return{}}));

        var results = await Promise.allSettled(promises);
        if (results[0].status === 'rejected') {
            container.innerHTML = '<div style="text-align:center;padding:80px"><h2>订单创建失败</h2><p style="color:var(--red)">'+results[0].reason.message+'</p><a href="#/recharge" style="color:var(--accent)">返回</a></div>';
            return;
        }

        var result = results[0].value;
        var wxQr = '', zfbQr = '';
        if (result.method === 'wechat_qr') { wxQr = result.qrcode; }
        else if (qrData) { wxQr = qrData.wechat_qr || ''; zfbQr = qrData.alipay_qr || ''; }

        container.innerHTML =
            '<div style="max-width:520px;margin:40px auto">'+
            '<a href="#/recharge" style="color:var(--text-secondary);font-size:13px;text-decoration:none">&larr; 返回</a>'+
            '<div class="card" style="margin-top:16px;text-align:center">'+
            '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">充值至 <strong>'+modelLabel+'</strong></div>'+
            '<div style="font-size:42px;font-weight:800;letter-spacing:-.04em;color:var(--accent);margin-bottom:4px">¥'+amount+'</div>'+
            '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">≈ '+(amount*100).toFixed(0)+' 万 Token</div>'+
            '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px">订单号：'+result.order_id.slice(0,8)+'…</div>'+

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+
            (wxQr ? '<button class="pay-btn wx-btn" id="btn-wx-pay"><span style="font-size:20px">💬</span> 微信支付</button>' : '<button class="pay-btn" disabled>微信（未上传）</button>')+
            (zfbQr ? '<button class="pay-btn zfb-btn" id="btn-zfb-pay"><span style="font-size:20px">💙</span> 支付宝支付</button>' : '<button class="pay-btn" disabled>支付宝（未上传）</button>')+
            '</div>'+
            '<p style="font-size:13px;color:var(--text-secondary)">付款时请备注用户名，管理员确认后到账</p></div></div>';

        function showQr(title, imgSrc) {
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = '<div class="modal-card"><div class="modal-header"><h3>'+title+'</h3><button class="modal-close">&times;</button></div>'+
                '<div class="modal-body" style="text-align:center">'+
                '<div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:12px">¥'+amount+' → '+modelLabel+'</div>'+
                '<img src="'+imgSrc+'" style="width:220px;height:220px;border-radius:10px;border:1px solid var(--border);background:#fff">'+
                '<p style="font-size:13px;color:var(--text-secondary);margin-top:14px">请扫码支付 ¥'+amount+'</p>'+
                '<button class="btn-primary" style="width:100%;margin-top:14px" id="modal-paid">我已完成支付</button></div></div>';
            document.body.appendChild(overlay);
            overlay.querySelector('.modal-close').addEventListener('click',function(){overlay.remove()});
            overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove()});
            overlay.querySelector('#modal-paid').addEventListener('click',function(){overlay.remove();showToast('已通知管理员','success');window.location.hash='#/recharge'});
        }

        if (wxQr) document.getElementById('btn-wx-pay').addEventListener('click',function(){showQr('微信支付',wxQr)});
        if (zfbQr) document.getElementById('btn-zfb-pay').addEventListener('click',function(){showQr('支付宝支付',zfbQr)});
    }

    load();
    return {unmount:function(){}};
});
registerRoute('#/admin', function(container) {
    var data = null;
    var orders = [];
    var currentTab = 'overview';

    async function load() {
        try {
            data = await api.get('/admin/all-users');
            orders = await api.get('/payment/orders');
        } catch(e) {
            container.innerHTML = '<p style="color:var(--red);padding:40px">加载失败：'+e.message+'</p>';
            return;
        }
        render();
    }

    function render() {
        var ov = data.overview;
        var pendingOrders = orders.filter(function(o){return o.status==='pending'}).length;
        container.innerHTML =
            '<div class="page-header"><h2>管理后台</h2><p>全平台数据概览 · 用户管理 · 订单处理</p></div>'+

            // Big stat cards
            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">👥</div><div class="stat-label">总用户数</div><div class="stat-value">'+ov.total_users+'</div><span style="font-size:12px;color:var(--text-tertiary)">注册用户</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">💰</div><div class="stat-label">预估收入</div><div class="stat-value" style="color:var(--green)">¥'+ov.estimated_revenue+'</div><span style="font-size:12px;color:var(--text-tertiary)">平台 Token 消耗折算</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">⚡</div><div class="stat-label">总消耗 Token</div><div class="stat-value">'+(ov.total_deducted/10000).toFixed(0)+'<span style="font-size:16px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">平台 Token · API：'+(ov.total_api_tokens/10000).toFixed(0)+'万</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">📊</div><div class="stat-label">请求统计</div><div class="stat-value">'+ov.total_requests+'</div><span style="font-size:12px;color:var(--text-tertiary)">成功 '+ov.total_requests+' · 失败 '+ov.failed_requests+'</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">📈</div><div class="stat-label">人均消耗</div><div class="stat-value">'+(ov.avg_tokens_per_user).toLocaleString()+'</div><span style="font-size:12px;color:var(--text-tertiary)">平台 Token / 人</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">🏦</div><div class="stat-label">用户总余额</div><div class="stat-value">'+(ov.total_balance/10000).toFixed(0)+'<span style="font-size:16px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">未消耗的平台 Token</span></div>'+
            '</div>'+

            // Tabs
            '<div class="inline-tabs">'+
            '<button id="tab-overview" class="'+(currentTab==='overview'?'active':'')+'">数据概览</button>'+
            '<button id="tab-users" class="'+(currentTab==='users'?'active':'')+'">用户列表</button>'+
            '<button id="tab-orders" class="'+(currentTab==='orders'?'active':'')+'">订单管理 '+(pendingOrders?'<span style="background:var(--red);color:#fff;border-radius:10px;padding:0 6px;font-size:11px;margin-left:4px">'+pendingOrders+'</span>':'')+'</button>'+
            '<button id="tab-tiers" class="'+(currentTab==='tiers'?'active':'')+'">套餐配置</button>'+
            '<button id="tab-qr" class="'+(currentTab==='qr'?'active':'')+'">收款设置</button>'+
            '<button id="tab-announce" class="'+(currentTab==='announce'?'active':'')+'">公告管理</button>'+
            '<button id="tab-models" class="'+(currentTab==='models'?'active':'')+'">模型管理</button>'+
            '</div>'+
            '<div id="admin-content"></div>';

        function switchTab(name) {
            currentTab = name;
            ['overview','users','orders','tiers','qr','announce','models'].forEach(function(t){
                var btn = document.getElementById('tab-'+t);
                if (btn) { btn.className = t === name ? 'active' : ''; }
            });
            renderContent();
        }
        document.getElementById('tab-overview').addEventListener('click',function(){switchTab('overview')});
        document.getElementById('tab-users').addEventListener('click',function(){switchTab('users')});
        document.getElementById('tab-orders').addEventListener('click',function(){switchTab('orders')});
        document.getElementById('tab-tiers').addEventListener('click',function(){switchTab('tiers')});
        document.getElementById('tab-qr').addEventListener('click',function(){switchTab('qr')});
        document.getElementById('tab-announce').addEventListener('click',function(){switchTab('announce')});
        document.getElementById('tab-models').addEventListener('click',function(){switchTab('models')});
        renderContent();
    }

    function renderContent() {
        var area = document.getElementById('admin-content');
        if (currentTab === 'overview') {
            // Top users by consumption
            var top = data.users.slice(0, 10);
            area.innerHTML = '<div class="section-title">消耗排行 Top 10</div>'+
                '<div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>#</th><th>用户</th><th>套餐</th><th>平台 Token</th><th>API Token</th><th>请求数</th><th>余额</th></tr></thead><tbody>'+
                top.map(function(u,i){
                    return '<tr><td>'+(i+1)+'</td><td><strong>'+u.username+'</strong></td><td><span class="badge badge-'+u.tier+'">'+u.tier+'</span></td><td>'+u.total_deducted.toLocaleString()+'</td><td>'+u.total_api_tokens.toLocaleString()+'</td><td>'+u.total_requests+'</td><td>'+u.balance.toLocaleString()+'</td></tr>';
                }).join('')+'</tbody></table></div>';
        } else if (currentTab === 'users') {
            area.innerHTML = '<div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>用户</th><th>邮箱</th><th>套餐</th><th>余额</th><th>消耗</th><th>请求</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
                data.users.map(function(u){
                    return '<tr class="'+(u.is_banned?'banned':'')+'"><td>'+u.username+(u.is_admin?' ⭐':'')+'</td><td>'+u.email+'</td><td><span class="badge badge-'+u.tier+'">'+u.tier+'</span></td><td>'+u.balance.toLocaleString()+'</td><td>'+u.total_deducted.toLocaleString()+'</td><td>'+u.total_requests+'</td><td>'+(u.is_banned?'<span style="color:var(--red)">封禁</span>':'<span style="color:var(--green)">正常</span>')+'</td><td><button class="btn-sm btn-ban" data-id="'+u.id+'" data-banned="'+u.is_banned+'">'+(u.is_banned?'解封':'封禁')+'</button> <button class="btn-sm btn-admin" data-id="'+u.id+'" style="margin:0 2px">'+(u.is_admin?'取消管理':'设管理')+'</button> <select class="tier-select styled" data-id="'+u.id+'"><option value="free" '+(u.tier==='free'?'selected':'')+'>免费</option><option value="pro" '+(u.tier==='pro'?'selected':'')+'>专业</option><option value="vip" '+(u.tier==='vip'?'selected':'')+'>至尊</option></select> '+(u.is_admin?'':'<button class="btn-sm btn-del" data-id="'+u.id+'" style="color:var(--red);border-color:var(--red);margin-top:4px">删除</button>')+'</td></tr>';
                }).join('')+'</tbody></table></div>';

            area.querySelectorAll('.btn-ban').forEach(function(btn){
                btn.addEventListener('click',async function(){
                    try { await api.put('/admin/users/'+btn.dataset.id+'/ban'); showToast('状态已更新','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
            area.querySelectorAll('.tier-select').forEach(function(sel){
                sel.addEventListener('change',async function(){
                    try { await api.put('/admin/users/'+sel.dataset.id+'/tier',{tier:sel.value}); showToast('套餐已更新','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
            area.querySelectorAll('.btn-admin').forEach(function(btn){
                btn.addEventListener('click',async function(){
                    try { await api.put('/admin/users/'+btn.dataset.id+'/admin'); showToast('管理员状态已更新','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
            area.querySelectorAll('.btn-del').forEach(function(btn){
                btn.addEventListener('click',async function(){
                    if (!confirm('确定删除用户 '+btn.dataset.id.slice(0,8)+'？此操作不可恢复！')) return;
                    try { await api.request('DELETE','/admin/users/'+btn.dataset.id); showToast('用户已删除','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
        } else if (currentTab === 'orders') {
            var tierNames = {free:'免费版',pro:'专业版',vip:'至尊版'};
            area.innerHTML = orders.length===0 ? '<p style="text-align:center;padding:40px;color:var(--text-tertiary)">暂无订单</p>' :
                '<div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>订单号</th><th>用户</th><th>套餐</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>'+
                orders.map(function(o){
                    var sc = {pending:'var(--amber)',paid:'var(--green)',cancelled:'var(--text-tertiary)'};
                    var sn = {pending:'待处理',paid:'已支付',cancelled:'已取消'};
                    return '<tr><td><code style="font-size:12px">'+o.id.slice(0,8)+'</code></td><td>'+o.username+'</td><td>'+tierNames[o.tier]+'</td><td>¥'+o.amount+'</td><td style="color:'+(sc[o.status]||'')+';font-weight:550">'+sn[o.status]+'</td><td style="font-size:12px;color:var(--text-secondary)">'+(o.created_at?o.created_at.slice(0,16).replace('T',' '):'')+'</td><td>'+(o.status==='pending'?'<button class="btn-sm btn-confirm" data-id="'+o.id+'" style="color:var(--green);border-color:var(--green);margin-right:4px">确认</button><button class="btn-sm btn-cancel-o" data-id="'+o.id+'" style="color:var(--red);border-color:var(--red)">取消</button>':'-')+'</td></tr>';
                }).join('')+'</tbody></table></div>';

            area.querySelectorAll('.btn-confirm').forEach(function(btn){
                btn.addEventListener('click',async function(){
                    try { await api.put('/payment/orders/'+btn.dataset.id+'/confirm'); showToast('已确认升级','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
            area.querySelectorAll('.btn-cancel-o').forEach(function(btn){
                btn.addEventListener('click',async function(){
                    try { await api.put('/payment/orders/'+btn.dataset.id+'/cancel'); showToast('已取消','success'); await load(); }
                    catch(e){ showToast(e.message,'error'); }
                });
            });
        } else if (currentTab === 'qr') {
            area.innerHTML = '<div class="section-title">收款码设置</div>'+
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
                '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">微信收款码</h3><div id="wx-preview" style="margin-bottom:10px">加载中...</div><input type="file" id="wx-file" accept="image/*" style="display:none"><button class="btn-outline" id="btn-wx">更换微信码</button></div>'+
                '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">支付宝收款码</h3><div id="zfb-preview" style="margin-bottom:10px">加载中...</div><input type="file" id="zfb-file" accept="image/*" style="display:none"><button class="btn-outline" id="btn-zfb">更换支付宝码</button></div>'+
                '</div><span id="qr-msg" class="inline-msg"></span>';

            // Load existing QR codes
            api.get('/admin/payment-qr').then(function(d){
                if (d.wechat_qr) document.getElementById('wx-preview').innerHTML = '<img src="'+d.wechat_qr+'" style="max-width:180px;border-radius:8px;border:1px solid var(--border)"><p style="font-size:11px;color:var(--green);margin-top:4px">已设置</p>';
                else document.getElementById('wx-preview').innerHTML = '<p style="color:var(--text-tertiary);font-size:13px">未上传</p>';
                if (d.alipay_qr) document.getElementById('zfb-preview').innerHTML = '<img src="'+d.alipay_qr+'" style="max-width:180px;border-radius:8px;border:1px solid var(--border)"><p style="font-size:11px;color:var(--green);margin-top:4px">已设置</p>';
                else document.getElementById('zfb-preview').innerHTML = '<p style="color:var(--text-tertiary);font-size:13px">未上传</p>';
            });

            function doUpload(fileInput, btn, preview, key) {
                btn.addEventListener('click',function(){ fileInput.click(); });
                fileInput.addEventListener('change', function(e){
                    var file = e.target.files[0]; if (!file) return;
                    if (file.size > 500*1024) { showToast('图片不能超过 500KB','error'); return; }
                    var reader = new FileReader();
                    reader.onload = async function(){
                        preview.innerHTML = '<img src="'+reader.result+'" style="max-width:180px;border-radius:8px;border:1px solid var(--border)"><p style="font-size:11px;color:var(--green);margin-top:4px">保存中...</p>';
                        try {
                            var body = {}; body[key] = reader.result;
                            await api.post('/admin/payment-qr', body);
                            preview.innerHTML = '<img src="'+reader.result+'" style="max-width:180px;border-radius:8px;border:1px solid var(--border)"><p style="font-size:11px;color:var(--green);margin-top:4px">已保存</p>';
                            showToast('收款码已更新','success');
                        } catch(er) { showToast(er.message,'error'); }
                    };
                    reader.readAsDataURL(file);
                });
            }
            doUpload(document.getElementById('wx-file'), document.getElementById('btn-wx'), document.getElementById('wx-preview'), 'wechat_qr');
            doUpload(document.getElementById('zfb-file'), document.getElementById('btn-zfb'), document.getElementById('zfb-preview'), 'alipay_qr');
        } else if (currentTab === 'announce') {
            area.innerHTML = '<div class="section-title">发布公告</div>'+
                '<div class="card"><input id="ann-title" placeholder="标题" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--font);margin-bottom:8px;background:var(--bg-input);color:var(--text)"><textarea id="ann-content" placeholder="内容" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--font);min-height:80px;margin-bottom:8px;background:var(--bg-input);color:var(--text)"></textarea><button class="btn-primary" id="btn-post-ann">发布</button></div>'+
                '<div id="ann-list"></div>';
            document.getElementById('btn-post-ann').addEventListener('click',async function(){
                var t=document.getElementById('ann-title').value.trim(),c=document.getElementById('ann-content').value.trim();
                if(!t||!c){showToast('请填写标题和内容','error');return}
                try{await api.post('/admin/announcements',{title:t,content:c});showToast('已发布','success');
                    document.getElementById('ann-title').value='';document.getElementById('ann-content').value='';
                    loadAnnList();}catch(e){showToast(e.message,'error')}
            });
            async function loadAnnList(){
                try{var anns=await api.get('/admin/announcements');
                    document.getElementById('ann-list').innerHTML=anns.length?'<div class="section-title">历史公告</div>'+anns.map(function(a){return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>'+a.title+'</strong><div style="font-size:12px;color:var(--text-tertiary)">'+a.created_at.slice(0,10)+'</div></div><button class="btn-sm" style="color:var(--red)" data-id="'+a.id+'" onclick="var self=this;api.request(\'DELETE\',\'/admin/announcements/'+a.id+'\').then(function(){self.parentElement.parentElement.remove()})">删除</button></div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px">'+a.content+'</div></div>';}).join(''):'<p style="color:var(--text-tertiary)">暂无公告</p>';
                }catch(e){}
            }
            loadAnnList();

        } else if (currentTab === 'models') {
            var models = ['deepseek-chat','deepseek-reasoner','deepseek-ai/DeepSeek-V3','deepseek-ai/DeepSeek-R1','Qwen/Qwen2.5-72B-Instruct','zai-org/GLM-4.6','qwen-plus','qwen-max','glm-4-plus','glm-4-flash','doubao-pro-256k','doubao-lite-128k','moonshot-v1-128k'];
            async function loadModelSettings(){
                try{
                    var d=await api.get('/admin/disabled-models');
                    var rpm=await api.get('/admin/model-rpm');
                    var disabled=d.models||[];
                    var html='<div class="section-title">模型管理</div><div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>模型</th><th>状态</th><th>RPM限制</th><th>操作</th></tr></thead><tbody>';
                    models.forEach(function(m){
                        var isOff=disabled.indexOf(m)>=0;
                        var r=rpm[m]||0;
                        html+='<tr><td>'+m+'</td><td>'+(isOff?'<span style="color:var(--red)">已下架</span>':'<span style="color:var(--green)">在线</span>')+'</td><td><input type="number" value="'+r+'" data-model="'+m+'" class="rpm-input" placeholder="0=不限" style="width:80px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td><td><button class="btn-sm btn-toggle-model" data-model="'+m+'">'+(isOff?'上架':'下架')+'</button></td></tr>';
                    });
                    html+='</tbody></table></div>';
                    area.innerHTML=html;
                    document.querySelectorAll('.btn-toggle-model').forEach(function(b){b.addEventListener('click',async function(){
                        try{await api.post('/admin/disabled-models',{model:this.dataset.model});showToast('已切换','success');loadModelSettings();}catch(e){showToast(e.message,'error')}
                    })});
                    document.querySelectorAll('.rpm-input').forEach(function(inp){inp.addEventListener('change',async function(){
                        var v=parseInt(this.value)||0;
                        try{await api.post('/admin/model-rpm',{model:this.dataset.model,rpm:v});showToast('RPM已更新','success')}catch(e){showToast(e.message,'error')}
                    })});
                }catch(e){}
            }
            loadModelSettings();

        } else if (currentTab === 'tiers') {
            var tiers = data.tiers || {};
            area.innerHTML = '<div class="stats-grid">'+
                Object.entries(tiers).map(function(e){
                    var t=e[1]; var key=e[0];
                    return '<div class="stat-card"><div class="stat-label">'+t.name+' ('+key+')</div><div class="stat-value" style="font-size:20px">'+t.tokens_per_month.toLocaleString()+' <span style="font-size:13px;color:var(--text-secondary);font-weight:400">Token/月</span></div><span style="font-size:13px;color:var(--text-secondary)">'+(t.requests_per_day?t.requests_per_day.toLocaleString()+' 请求/天':'无限制')+' · ¥'+t.price+'/月</span></div>';
                }).join('')+'</div>';
        }
    }

    load();
    return {unmount:function(){}};
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
                <button id="tab-ip" class="${currentTab==='ip'?'active':''}">IP 白名单</button>
            </div>

            <div id="profile-content"></div>
        `;

        document.getElementById('tab-info').addEventListener('click', () => { currentTab='info'; render(); });
        document.getElementById('tab-password').addEventListener('click', () => { currentTab='password'; render(); });
        document.getElementById('tab-ip').addEventListener('click', () => { currentTab='ip'; render(); });
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

        } else if (currentTab === 'ip') {
            var ips = user.ip_whitelist || [];
            area.innerHTML = '<div class="profile-section"><h3>IP 白名单</h3><div class="card"><p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">设置后只有白名单内的 IP 能调用 API。留空则不限制。</p><textarea id="ip-list" style="width:100%;min-height:80px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--mono);background:var(--bg-input);color:var(--text)" placeholder="每行一个 IP，例如：&#10;1.2.3.4&#10;5.6.7.8">'+ips.join('\n')+'</textarea><button class="btn-primary" id="btn-save-ip" style="margin-top:10px">保存</button><span id="ip-msg" class="inline-msg"></span></div></div>';
            document.getElementById('btn-save-ip').addEventListener('click',async function(){
                var lines=document.getElementById('ip-list').value.split('\n').map(function(l){return l.trim()}).filter(function(l){return l});
                try{await api.post('/admin/ip-whitelist',{ips:lines});showToast('已保存','success');
                    var p=await api.get('/dashboard/profile');localStorage.setItem('user',JSON.stringify(p.user));}catch(e){showToast(e.message,'error')}
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
    container.innerHTML =
        '<div class="page-header"><h2>计费规则与服务条款</h2><p>透明定价 · 按量计费 · 充值余额永久有效</p></div>'+

        // Per-model pricing
        '<div class="section-title">模型费率 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（平台 Token / 百万 API Token）</span></div>'+
        '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>平台</th><th>模型</th><th>输入</th><th>输出</th><th>倍数</th></tr></thead><tbody>'+
        '<tr><td>DeepSeek 官方</td><td>deepseek-chat</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>DeepSeek 官方</td><td>deepseek-reasoner</td><td class="price-cell">12 万</td><td class="price-cell">36 万</td><td>4x</td></tr>'+
        '<tr><td>硅基流动</td><td>DeepSeek V3 / R1</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>硅基流动</td><td>Qwen2.5 / GLM-4.6</td><td class="price-cell">10 万</td><td class="price-cell">30 万</td><td>3.5x</td></tr>'+
        '<tr><td>阿里百炼</td><td>通义千问 Plus/Max</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5-4x</td></tr>'+
        '<tr><td>智谱 AI</td><td>GLM-4 Plus/Flash</td><td class="price-cell">6 万</td><td class="price-cell">18 万</td><td>2-3x</td></tr>'+
        '<tr><td>火山方舟</td><td>豆包 Pro/Lite</td><td class="price-cell">6 万</td><td class="price-cell">18 万</td><td>2-3x</td></tr>'+
        '<tr><td>Kimi</td><td>Kimi 128K</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5x</td></tr>'+
        '</tbody></table></div>'+

        // Service terms
        '<div class="section-title">服务条款</div>'+
        '<div class="card"><div style="line-height:2.2;font-size:13.5px;color:var(--text-secondary)">'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">一、服务说明</h3>'+
        '<p>1.1 本平台（DS Relay）是一个 AI 模型 API 聚合服务，为用户提供统一的接口调用多个 AI 大模型厂商的服务。</p>'+
        '<p>1.2 平台本身不训练或运行 AI 模型，所有模型能力均由第三方厂商（DeepSeek、阿里云、智谱、字节跳动、月之暗面等）提供。</p>'+
        '<p>1.3 平台保留对服务进行升级、调整或暂停的权利，重大变更将提前通知用户。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">二、账户与安全</h3>'+
        '<p>2.1 用户注册时需提供真实有效的邮箱地址，一个邮箱仅可注册一个账户。</p>'+
        '<p>2.2 用户应妥善保管账户密码和 API Key。因账户泄露导致的 Token 被盗用、余额损失，由用户自行承担。</p>'+
        '<p>2.3 禁止将账户转借、出租或出售给他人使用。一经发现，平台有权永久封禁账户。</p>'+
        '<p>2.4 如发现账户异常登录或 API Key 泄露，应立即联系管理员重置。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">三、充值、消费与退款</h3>'+
        '<p>3.1 用户通过微信或支付宝扫码充值，充值金额按 1 元 = 100 万平台 Token 的比例转换为余额。</p>'+
        '<p>3.2 余额可用于调用平台支持的所有模型，不同模型消耗速率不同（详见上方费率表）。</p>'+
        '<p>3.3 每次 API 调用的实际扣费 = API 返回的 Token 数量 × 该模型的加成倍数。</p>'+
        '<p>3.4 充值完成后不支持退款。余额不可提现、不可转让。</p>'+
        '<p>3.5 平台按实际调用量扣费，如因网络原因造成请求失败但未返回结果的，不扣费。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">四、使用规范</h3>'+
        '<p>4.1 禁止使用本平台 API 生成、传播违法信息，包括但不限于：暴力恐怖、淫秽色情、赌博诈骗、侵犯他人隐私、侵犯知识产权等内容。</p>'+
        '<p>4.2 禁止利用自动化脚本或批量注册方式获取免费额度。</p>'+
        '<p>4.3 禁止对平台 API 进行压力测试、DDoS 攻击或任何可能影响服务稳定性的行为。</p>'+
        '<p>4.4 单次请求的并发连接数不得超过合理范围。如有大规模调用需求，请联系管理员开通专属通道。</p>'+
        '<p>4.5 违反上述规定的，平台有权立即封禁账户，余额不予退还，并保留追究法律责任的权利。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">五、服务可用性</h3>'+
        '<p>5.1 平台尽力保证服务的连续性和稳定性，但不对此做出绝对保证。</p>'+
        '<p>5.2 因第三方模型厂商（如 DeepSeek、阿里云等）的服务中断、维护或调整导致的调用失败，平台不承担责任。</p>'+
        '<p>5.3 因不可抗力（自然灾害、战争、政府行为、网络攻击等）导致的服务中断，平台不承担责任。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">六、隐私与数据</h3>'+
        '<p>6.1 平台仅收集必要的账户信息（用户名、邮箱、API 调用记录），不收集用户的对话内容。</p>'+
        '<p>6.2 用户的 API 调用数据仅用于计费和统计，不会出售或分享给第三方。</p>'+
        '<p>6.3 用户调用 API 时，对话内容将直接转发至对应的模型厂商，平台不会存储或审查对话内容。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">七、知识产权</h3>'+
        '<p>7.1 通过 API 生成的内容的知识产权归用户所有。</p>'+
        '<p>7.2 各模型厂商可能对生成内容有不同的知识产权约定，用户应自行了解并遵守对应厂商的条款。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">八、条款变更</h3>'+
        '<p>8.1 平台有权适时修改本服务条款，修改后的条款将在平台上公布。</p>'+
        '<p>8.2 用户继续使用平台服务即视为同意修改后的条款。</p>'+

        '</div></div>';

    return {unmount:function(){}};
});
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// System dark mode detection
function applySystemTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) { document.documentElement.setAttribute('data-theme', saved); return; }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
applySystemTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (!localStorage.getItem('theme')) applySystemTheme();
});

// Theme toggle button
var themeBtn = document.getElementById('btn-theme');
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

// Sound effects
var audioCtx = null;
function playSound(freq, duration, type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}
function soundSuccess() { playSound(880, 0.3); }
function soundError() { playSound(220, 0.5, 'square'); }

// Dynamic page title with balance
setInterval(function() {
    try {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        var bal = user.balance_tokens || 0;
        var money = (bal / 1000000).toFixed(1);
        document.title = (bal > 0 ? '¥' + money + ' - ' : '') + 'DS Relay';
    } catch(e) {}
}, 5000);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key for chat
    if (e.key === 'Enter' && !e.shiftKey) {
        var el = document.getElementById('chat-input');
        if (el === document.activeElement) {
            e.preventDefault();
            var form = document.getElementById('chat-form');
            if (form) form.dispatchEvent(new Event('submit'));
        }
    }
    // Ctrl+Enter anywhere in chat
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        var el2 = document.getElementById('chat-input');
        if (el2 && document.getElementById('chat-messages')) {
            e.preventDefault();
            var form2 = document.getElementById('chat-form');
            if (form2) form2.dispatchEvent(new Event('submit'));
        }
    }
    // Ctrl+K = go to models
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.location.hash = '#/models';
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
