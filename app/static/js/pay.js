registerRoute('#/pay', function(container) {
    var amount = 0;
    var hash = window.location.hash;
    var parts = hash.split('/');
    if (parts.length > 2) amount = parseFloat(parts[2]) || 0;

    if (!amount || amount < 1) {
        container.innerHTML = '<div style="text-align:center;padding:80px"><h2>无效金额</h2><p style="color:var(--text-secondary)"><a href="#/recharge" style="color:var(--accent)">返回充值</a></p></div>';
        return {unmount:function(){}};
    }

    async function load() {
        container.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-tertiary)">创建订单中...</div>';

        var result;
        try { result = await api.post('/payment/topup', {amount: amount}); }
        catch(e) { container.innerHTML = '<div style="text-align:center;padding:80px"><h2>订单创建失败</h2><p style="color:var(--red)">'+e.message+'</p><a href="#/recharge" style="color:var(--accent)">返回</a></div>'; return; }

        // Get QR images
        var wxQr = '', zfbQr = '';
        if (result.method === 'wechat_qr') {
            wxQr = result.qrcode;
        } else {
            try { var d = await api.get('/admin/payment-qr'); wxQr = d.wechat_qr || ''; zfbQr = d.alipay_qr || ''; } catch(e) {}
        }

        var tokenEstimate = (amount * 100).toFixed(0);

        container.innerHTML =
            '<div style="max-width:520px;margin:40px auto">'+
            '<a href="#/recharge" style="color:var(--text-secondary);font-size:13px;text-decoration:none">&larr; 返回充值</a>'+
            '<div class="card" style="margin-top:16px;text-align:center">'+
            '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">支付金额</div>'+
            '<div style="font-size:42px;font-weight:800;letter-spacing:-.04em;color:var(--accent);margin-bottom:4px">¥'+amount+'</div>'+
            '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">≈ '+tokenEstimate+' 万平台 Token</div>'+
            '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px">订单号：'+result.order_id.slice(0,8)+'…</div>'+

            // Two payment buttons
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+
            (wxQr ? '<button class="pay-btn wx-btn" id="btn-wx-pay"><span style="font-size:20px">💬</span> 微信支付</button>' : '<button class="pay-btn" disabled>微信（未上传）</button>')+
            (zfbQr ? '<button class="pay-btn zfb-btn" id="btn-zfb-pay"><span style="font-size:20px">💙</span> 支付宝支付</button>' : '<button class="pay-btn" disabled>支付宝（未上传）</button>')+
            '</div>'+
            '<p style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px">付款时请备注用户名</p>'+
            '</div></div>';

        // Show QR modal
        function showQr(title, imgSrc) {
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = '<div class="modal-card"><div class="modal-header"><h3>'+title+'</h3><button class="modal-close">&times;</button></div>'+
                '<div class="modal-body" style="text-align:center">'+
                '<div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:12px">¥'+amount+'</div>'+
                '<img src="'+imgSrc+'" style="width:220px;height:220px;border-radius:10px;border:1px solid var(--border);background:#fff">'+
                '<p style="font-size:13px;color:var(--text-secondary);margin-top:14px">请扫码支付 ¥'+amount+'</p>'+
                '<p style="font-size:12px;color:var(--text-tertiary)">付款时请备注用户名</p>'+
                '<button class="btn-primary" style="width:100%;margin-top:14px" id="modal-paid">我已完成支付</button></div></div>';
            document.body.appendChild(overlay);
            var close = function(){ overlay.remove(); };
            overlay.querySelector('.modal-close').addEventListener('click', close);
            overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });
            overlay.querySelector('#modal-paid').addEventListener('click', function(){
                close();
                showToast('已通知管理员，确认后到账','success');
                window.location.hash = '#/recharge';
            });
        }

        if (wxQr) document.getElementById('btn-wx-pay').addEventListener('click', function(){ showQr('微信支付', wxQr); });
        if (zfbQr) document.getElementById('btn-zfb-pay').addEventListener('click', function(){ showQr('支付宝支付', zfbQr); });
    }

    load();
    return {unmount:function(){}};
});
