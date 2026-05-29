registerRoute('#/recharge', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        try { var p = await api.get('/dashboard/profile'); user = p.user; localStorage.setItem('user', JSON.stringify(user)); } catch(e) {}

        // Per-model rates (platform tokens per 1M API tokens)
        var models = [
            {id:'deepseek-chat',name:'DeepSeek Chat',rate:3.0,inputCost:8,outputCost:24,icon:'DS',color:'#4f46e5'},
            {id:'deepseek-reasoner',name:'DeepSeek Reasoner',rate:4.0,inputCost:12,outputCost:36,icon:'DS',color:'#4f46e5'},
            {id:'deepseek-ai/DeepSeek-V3',name:'DeepSeek V3 (硅基)',rate:3.0,inputCost:8,outputCost:24,icon:'SF',color:'#7c3aed'},
            {id:'deepseek-ai/DeepSeek-R1',name:'DeepSeek R1 (硅基)',rate:4.0,inputCost:12,outputCost:36,icon:'SF',color:'#7c3aed'},
            {id:'Qwen/Qwen2.5-72B-Instruct',name:'Qwen2.5 72B',rate:3.5,inputCost:10,outputCost:30,icon:'QW',color:'#f97316'},
            {id:'zai-org/GLM-4.6',name:'GLM-4.6',rate:3.0,inputCost:8,outputCost:24,icon:'GL',color:'#2563eb'},
            {id:'qwen-plus',name:'通义千问 Plus',rate:3.5,inputCost:10,outputCost:32,icon:'QW',color:'#f97316'},
            {id:'qwen-max',name:'通义千问 Max',rate:4.0,inputCost:12,outputCost:36,icon:'QW',color:'#f97316'},
            {id:'glm-4-plus',name:'GLM-4 Plus',rate:3.0,inputCost:8,outputCost:24,icon:'GL',color:'#2563eb'},
            {id:'glm-4-flash',name:'GLM-4 Flash',rate:2.0,inputCost:6,outputCost:18,icon:'GL',color:'#2563eb'},
            {id:'doubao-pro-256k',name:'豆包 Pro',rate:3.0,inputCost:8,outputCost:24,icon:'DB',color:'#3370ff'},
            {id:'doubao-lite-128k',name:'豆包 Lite',rate:2.0,inputCost:6,outputCost:18,icon:'DB',color:'#3370ff'},
            {id:'moonshot-v1-128k',name:'Kimi 128K',rate:3.5,inputCost:10,outputCost:32,icon:'KM',color:'#6d28d9'},
        ];

        var balance = user.balance_tokens || 0;

        container.innerHTML =
            '<div class="page-header"><h2>余额充值</h2><p>个人余额 · 模型计价 · 按量消费</p></div>'+

            // Balance card
            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">💰</div><div class="stat-label">当前余额</div><div class="stat-value">'+(balance/10000).toFixed(0)+'<span style="font-size:16px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">平台 Token · 永不过期</span></div>'+
            '<div class="stat-card"><div class="stat-icon" style="font-size:24px">📊</div><div class="stat-label">余额可调用</div><div class="stat-value" style="font-size:18px">≈ '+(balance/30000).toFixed(0)+'<span style="font-size:14px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">DeepSeek Chat API Token（3x加成）</span></div>'+
            '</div>'+

            // Recharge packages
            '<div class="section-title">充值套餐 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（1元 ≈ 100万平台 Token）</span></div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">'+
            [{amt:5,tokens:5000000,label:'¥5'},{amt:10,tokens:10000000,label:'¥10'},{amt:20,tokens:20000000,label:'¥20'},{amt:50,tokens:50000000,label:'¥50'},{amt:100,tokens:100000000,label:'¥100'}].map(function(p){
                return '<div class="stat-card" style="text-align:center;cursor:pointer" onclick="showToast(\'请联系管理员充值 ¥'+p.amt+'\',\'success\')"><div style="font-size:20px;font-weight:700;margin-bottom:4px">'+p.label+'</div><div style="font-size:13px;color:var(--text-secondary)">'+(p.tokens/100000000).toFixed(1)+' 亿 Token</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">≈ ¥'+(p.amt/3).toFixed(1)+' API 成本</div></div>';
            }).join('')+
            '</div>'+

            // Custom amount
            '<div class="card" style="margin-bottom:20px"><div style="font-size:14px;font-weight:600;margin-bottom:10px">自定义金额</div>'+
            '<div class="form-row"><input type="number" id="custom-amount" placeholder="输入金额（元）" min="1" style="flex:1"><button id="btn-custom-recharge">充值</button></div>'+
            '<span style="font-size:12px;color:var(--text-tertiary);margin-top:6px;display:block">每 1 元 = 100 万平台 Token</span></div>'+

            // Per-model buying power
            '<div class="section-title">各模型消费力 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（¥10 充值可获得的 API Token 量）</span></div>'+
            '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>模型</th><th>加成</th><th>输入费</th><th>输出费</th><th>¥10 可得</th></tr></thead><tbody>'+
            models.map(function(m){
                var apiTokens = Math.floor(10000000 / m.rate);
                return '<tr><td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:'+m.color+';color:#fff;text-align:center;line-height:20px;font-size:10px;font-weight:700;margin-right:8px;vertical-align:middle">'+m.icon+'</span><strong>'+m.name+'</strong></td><td>'+m.rate+'x</td><td>'+m.inputCost+' 万</td><td>'+m.outputCost+' 万</td><td style="font-weight:600">≈ '+(apiTokens/10000).toFixed(0)+' 万</td></tr>';
            }).join('')+
            '</tbody></table></div>'+

            '<div class="section-title">充值说明</div>'+
            '<div class="card"><div style="line-height:2;font-size:13.5px;color:var(--text-secondary)">'+
            '<p>1. 充值请联系管理员获取付款方式（微信/支付宝）</p><p>2. 付款时备注用户名，管理员确认后余额即时到账</p><p>3. 余额永不过期，按各模型加成倍数消费</p><p>4. 1 元 = 100 万平台 Token ≈ 33 万 API Token（3x模型）</p></div></div>';

        document.getElementById('btn-custom-recharge').addEventListener('click', function(){
            var amt = parseInt(document.getElementById('custom-amount').value);
            if (!amt || amt < 1) { showToast('请输入有效金额','error'); return; }
            showToast('请联系管理员充值 ¥'+amt+'（'+(amt*100)+'万 Token）','success');
        });
    }

    load();
    return {unmount:function(){}};
});
