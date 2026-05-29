registerRoute('#/recharge', function(container) {
    var packages = [
        {tokens:10000000,price:10,bonus:0,label:'入门包',desc:'适合轻度体验',badge:''},
        {tokens:30000000,price:30,bonus:10,label:'基础包',desc:'个人日常使用',badge:'推荐'},
        {tokens:50000000,price:50,bonus:20,label:'进阶包',desc:'开发者首选',badge:'最值'},
        {tokens:100000000,price:100,bonus:30,label:'专业包',desc:'重度使用',badge:''},
    ];

    container.innerHTML =
        '<div class="page-header"><h2>余额充值</h2><p>充值 Token 余额 · 按量计费 · 永不过期</p></div>'+

        '<div class="section-title">计费说明</div>'+
        '<div class="card"><div style="line-height:2;font-size:13.5px;color:var(--text-secondary)">'+
        '<p><strong>计费方式：</strong>按实际消耗扣减余额，1 API Token = 按模型不同折算为 1-3 平台 Token。</p>'+
        '<p><strong>消耗规则：</strong>优先消耗充值余额，余额不足时使用月套餐额度。充值余额永久有效。</p>'+
        '<p><strong>模型费率（平台 Token / 百万 API Token）：</strong></p>'+
        '</div>'+
        '<table class="pricing-table" style="margin-top:12px"><thead><tr><th>模型</th><th>输入费率</th><th>输出费率</th></tr></thead><tbody>'+
        '<tr><td>DeepSeek Chat / Reasoner</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td></tr>'+
        '<tr><td>Qwen / GLM / Kimi</td><td class="price-cell">12 万</td><td class="price-cell">36 万</td></tr>'+
        '<tr><td>豆包 Lite / 免费模型</td><td class="price-cell">4 万</td><td class="price-cell">12 万</td></tr>'+
        '</tbody></table></div>'+

        '<div class="section-title">充值套餐</div>'+
        '<div class="tier-grid">'+
        packages.map(function(p){
            return '<div class="tier-card">'+
                (p.badge?'<div style="position:absolute;top:12px;right:12px"><span class="badge" style="background:var(--accent-subtle);color:var(--accent)">'+p.badge+'</span></div>':'')+
                '<div class="tier-icon">'+(p.bonus?'💎':'🪙')+'</div>'+
                '<h3>'+p.label+'</h3>'+
                '<div class="price">¥'+p.price+'</div>'+
                '<div class="features"><div>◆ '+(p.tokens/100000000).toFixed(1)+' 亿 Token</div>'+
                (p.bonus?'<div style="color:var(--green)">◆ 赠送 '+p.bonus+'%</div>':'')+
                '<div>◆ '+p.desc+'</div></div>'+
                '<button onclick="window.location.hash=\'#/recharge\';showToast(\'请联系管理员充值\',\'success\')">立即充值</button>'+
                '</div>';
        }).join('')+'</div>'+

        '<div class="section-title">充值流程</div>'+
        '<div class="card"><div style="line-height:2;font-size:13.5px;color:var(--text-secondary)">'+
        '<p><strong>1.</strong> 选择充值套餐，点击「立即充值」<br>'+
        '<strong>2.</strong> 联系管理员获取付款方式（微信/支付宝）<br>'+
        '<strong>3.</strong> 付款时备注你的用户名<br>'+
        '<strong>4.</strong> 管理员确认后，余额即时到账<br>'+
        '<strong>5.</strong> 余额永不过期，随时可用</p>'+
        '</div></div>';

    return {unmount:function(){}};
});
