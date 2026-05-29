registerRoute('#/recharge', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        try { var p = await api.get('/dashboard/profile'); user = p.user; localStorage.setItem('user', JSON.stringify(user)); } catch(e) {}

        var tokens = user.balance_tokens || 0;
        var money = (tokens / 1000000).toFixed(2); // ¥1 = 100万 tokens

        var packages = [
            {amt:5,label:'¥5',tokens:'500 万',desc:'入门体验'},
            {amt:10,label:'¥10',tokens:'1000 万',desc:'轻度使用'},
            {amt:20,label:'¥20',tokens:'2000 万',desc:'日常够用'},
            {amt:50,label:'¥50',tokens:'5000 万',desc:'开发必备',badge:'推荐'},
            {amt:100,label:'¥100',tokens:'1 亿',desc:'重度用户',badge:'最值'},
        ];

        var models = [
            {name:'DeepSeek Chat',rate:'3x',perYuan:'33 万'},
            {name:'DeepSeek Reasoner',rate:'4x',perYuan:'25 万'},
            {name:'Qwen / GLM',rate:'3.5x',perYuan:'29 万'},
            {name:'豆包 / Flash',rate:'2x',perYuan:'50 万'},
            {name:'Kimi 128K',rate:'3.5x',perYuan:'29 万'},
        ];

        container.innerHTML =
            '<div class="page-header"><h2>余额充值</h2><p>自助充值 · 即时到账 · 按量消费</p></div>'+

            // Balance card - ¥ money
            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-label">账户余额</div><div class="stat-value" style="color:var(--green)">¥<span id="balance-display">'+money+'</span></div><span style="font-size:12px;color:var(--text-tertiary)">≈ '+(tokens/10000).toFixed(0)+' 万平台 Token</span></div>'+
            '<div class="stat-card"><div class="stat-label">可调用 API</div><div class="stat-value" style="font-size:18px">≈ '+(tokens/30000).toFixed(0)+'<span style="font-size:14px;font-weight:500;color:var(--text-secondary)"> 万</span></div><span style="font-size:12px;color:var(--text-tertiary)">DeepSeek Chat API Token（3x）</span></div>'+
            '</div>'+

            // Top-up buttons
            '<div class="section-title">充值金额</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">'+
            packages.map(function(p){
                var badge = p.badge ? '<span style="position:absolute;top:8px;right:8px;background:var(--accent);color:#fff;font-size:10px;padding:1px 6px;border-radius:8px">'+p.badge+'</span>' : '';
                return '<div class="stat-card" style="text-align:center;cursor:pointer;position:relative" id="topup-'+p.amt+'">'+badge+'<div style="font-size:22px;font-weight:700;margin-bottom:4px">'+p.label+'</div><div style="font-size:13px;color:var(--text-secondary)">'+p.tokens+' Token</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">'+p.desc+'</div></div>';
            }).join('')+
            '</div>'+

            // Custom amount
            '<div class="card" style="margin-bottom:20px"><div style="font-size:14px;font-weight:600;margin-bottom:10px">自定义金额</div>'+
            '<div class="form-row"><input type="number" id="custom-amount" placeholder="输入金额（元）" min="1" step="1" style="flex:1"><button id="btn-custom">充值</button></div>'+
            '<span id="topup-msg" class="inline-msg"></span></div>'+

            // Per-model buying power
            '<div class="section-title">¥1 能买多少 API Token</div>'+
            '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>模型</th><th>加成</th><th>¥1 可得 API Token</th></tr></thead><tbody>'+
            models.map(function(m){ return '<tr><td><strong>'+m.name+'</strong></td><td>'+m.rate+'</td><td style="font-weight:600">'+m.perYuan+' Token</td></tr>'; }).join('')+
            '</tbody></table></div>'+

            '<div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-tertiary)">余额永久有效 · 充值即时到账 · 按实际调用扣费</div>';

        // Bind top-up buttons
        packages.forEach(function(p){
            var btn = document.getElementById('topup-'+p.amt);
            if (btn) btn.addEventListener('click', function(){ doTopup(p.amt); });
        });
        document.getElementById('btn-custom').addEventListener('click', function(){
            var amt = parseFloat(document.getElementById('custom-amount').value);
            if (!amt || amt < 1) { showToast('请输入有效金额','error'); return; }
            doTopup(amt);
        });
    }

    async function doTopup(amount) {
        var msg = document.getElementById('topup-msg');
        msg.className = 'inline-msg';
        msg.textContent = '创建订单中...';
        msg.style.display = 'block';
        try {
            var result = await api.post('/payment/topup', {amount: amount});
            // Always show QR code modal
            showQrModal(result, amount);
            msg.className = 'inline-msg';
            msg.style.display = 'none';
        } catch(e) {
            msg.className = 'inline-msg error';
            msg.textContent = e.message;
        }
    }

    async function showQrModal(result) {
        var qrImg = '';
        if (result.method === 'wechat_qr') {
            qrImg = result.qrcode;
        } else {
            // Load admin's payment QR code
            try {
                var qrData = await api.get('/admin/payment-qr');
                if (qrData.qr_image) qrImg = qrData.qr_image;
            } catch(e) {}
        }

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'qr-modal';
        overlay.innerHTML = '<div class="modal-card"><div class="modal-header"><h3>扫码支付</h3><button class="modal-close" id="qr-close">&times;</button></div>'+
            '<div class="modal-body" style="text-align:center">'+
            '<div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--accent)">¥'+result.amount+'</div>'+
            '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">订单号：'+result.order_id.slice(0,8)+'…</div>'+
            (qrImg ? '<img src="'+qrImg+'" alt="收款码" style="width:220px;height:220px;border-radius:8px;border:1px solid var(--border)">' : '<div style="width:220px;height:220px;border-radius:8px;border:2px dashed var(--border);margin:0 auto;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:13px">管理员尚未上传收款码</div>')+
            '<p style="font-size:13px;color:var(--text-secondary);margin-top:12px">请使用微信/支付宝扫码支付 <strong>¥'+result.amount+'</strong></p>'+
            '<p style="font-size:12px;color:var(--text-tertiary)">付款时请备注用户名，管理员确认后到账</p>'+
            '<button class="btn-primary" style="width:100%;margin-top:14px" id="qr-done">我已完成支付，通知管理员</button></div></div>';
        document.body.appendChild(overlay);

        var close = function(){ var el=document.getElementById('qr-modal'); if(el)el.remove(); };
        overlay.querySelector('#qr-close').addEventListener('click', close);
        overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });
        overlay.querySelector('#qr-done').addEventListener('click', function(){
            close();
            showToast('已通知管理员，确认后余额到账','success');
        });
    }

    async function refreshBalance() {
        try {
            var p = await api.get('/dashboard/profile');
            localStorage.setItem('user', JSON.stringify(p.user));
            var money = (p.user.balance_tokens / 1000000).toFixed(2);
            var el = document.getElementById('balance-display');
            if (el) el.textContent = money;
        } catch(e) {}
    }

    load();
    return {unmount:function(){}};
});
