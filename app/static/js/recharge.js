registerRoute('#/recharge', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        try { var p = await api.get('/dashboard/profile'); user = p.user; localStorage.setItem('user', JSON.stringify(user)); } catch(e) {}

        var generalBalance = user.balance_tokens || 0;
        var modelBalances = user.model_balances || {};
        var generalMoney = (generalBalance / 1000000).toFixed(2);

        var packages = [
            {amt:5,label:'¥5'},{amt:10,label:'¥10'},{amt:20,label:'¥20'},{amt:50,label:'¥50'},{amt:100,label:'¥100'}
        ];

        var models = [
            {id:'deepseek-chat',name:'DeepSeek Chat',icon:'DS',color:'#4f46e5'},
            {id:'deepseek-reasoner',name:'DeepSeek Reasoner',icon:'DS',color:'#4f46e5'},
            {id:'deepseek-ai/DeepSeek-V3',name:'DeepSeek V3 (硅基)',icon:'SF',color:'#7c3aed'},
            {id:'deepseek-ai/DeepSeek-R1',name:'DeepSeek R1 (硅基)',icon:'SF',color:'#7c3aed'},
            {id:'Qwen/Qwen2.5-72B-Instruct',name:'Qwen2.5 72B',icon:'QW',color:'#f97316'},
            {id:'zai-org/GLM-4.6',name:'GLM-4.6',icon:'GL',color:'#2563eb'},
            {id:'qwen-plus',name:'通义千问 Plus',icon:'QW',color:'#f97316'},
            {id:'qwen-max',name:'通义千问 Max',icon:'QW',color:'#f97316'},
            {id:'glm-4-plus',name:'GLM-4 Plus',icon:'GL',color:'#2563eb'},
            {id:'glm-4-flash',name:'GLM-4 Flash',icon:'GL',color:'#2563eb'},
            {id:'doubao-pro-256k',name:'豆包 Pro',icon:'DB',color:'#3370ff'},
            {id:'doubao-lite-128k',name:'豆包 Lite',icon:'DB',color:'#3370ff'},
            {id:'moonshot-v1-128k',name:'Kimi 128K',icon:'KM',color:'#6d28d9'},
        ];

        container.innerHTML =
            '<div class="page-header"><h2>余额充值</h2><p>各模型独立余额 · 按量消费 · 即时到账</p></div>'+

            // General balance
            '<div class="stats-grid"><div class="stat-card"><div class="stat-label">通用余额</div><div class="stat-value" style="color:var(--accent)">¥<span id="gen-bal">'+generalMoney+'</span></div></div></div>'+

            // Per-model balances
            '<div class="section-title">各模型余额</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:20px">'+
            models.map(function(m){
                var mb = modelBalances[m.id] || 0;
                var mbMoney = (mb / 1000000).toFixed(2);
                return '<div class="stat-card" style="padding:14px 16px;display:flex;align-items:center;gap:10px">'+
                    '<span style="display:inline-block;width:24px;height:24px;border-radius:5px;background:'+m.color+';color:#fff;text-align:center;line-height:24px;font-size:10px;font-weight:700;flex-shrink:0">'+m.icon+'</span>'+
                    '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:550">'+m.name+'</div><div style="font-size:11px;color:var(--text-tertiary)">¥'+mbMoney+' ('+(mb/10000).toFixed(0)+'万)</div></div>'+
                    '<button class="btn-sm" onclick="window.location.hash=\'#/pay/'+m.id+'/5\'" style="flex-shrink:0">充值</button></div>';
            }).join('')+'</div>'+

            // Quick top-up packages
            '<div class="section-title">快速充值</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px">'+
            packages.map(function(p){
                return '<div class="stat-card" style="text-align:center;cursor:pointer;padding:16px" onclick="window.location.hash=\'#/pay/general/'+p.amt+'\'"><div style="font-size:18px;font-weight:700">'+p.label+'</div><div style="font-size:11px;color:var(--text-tertiary)">通用余额</div></div>';
            }).join('')+'</div>';

        // Refresh balance after returning from pay page
        window._rechargeRefresh = function() { load(); };
    }

    load();
    return {unmount:function(){}};
});
