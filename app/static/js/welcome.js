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
