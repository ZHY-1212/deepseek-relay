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
