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

            '<div style="display:grid;grid-template-columns:'+((wxQr&&zfbQr)?'1fr 1fr':'1fr')+';gap:16px;margin-bottom:16px">'+
            (wxQr ? '<div style="background:var(--bg-hover);border-radius:var(--radius-lg);padding:16px"><div style="font-size:13px;font-weight:600;color:#07c160;margin-bottom:10px">微信支付</div><img src="'+wxQr+'" style="width:180px;height:180px;border-radius:10px;background:#fff"></div>' : '')+
            (zfbQr ? '<div style="background:var(--bg-hover);border-radius:var(--radius-lg);padding:16px"><div style="font-size:13px;font-weight:600;color:#1677ff;margin-bottom:10px">支付宝</div><img src="'+zfbQr+'" style="width:180px;height:180px;border-radius:10px;background:#fff"></div>' : '')+
            '</div>'+
            (!wxQr&&!zfbQr ? '<div style="padding:40px;border:2px dashed var(--border);border-radius:var(--radius-lg);color:var(--text-tertiary);font-size:13px;margin-bottom:16px">管理员尚未上传收款码</div>' : '')+
            '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">付款时请备注用户名</p>'+

            '<button class="btn-primary" style="width:100%;padding:14px;font-size:15px" id="btn-paid">✅ 我已完成支付</button>'+
            '<p style="font-size:12px;color:var(--text-tertiary);margin-top:12px;text-align:center">支付成功后请联系管理员确认，余额即时到账</p>'+
            '</div></div>';

        document.getElementById('btn-paid').addEventListener('click', function(){
            showToast('已通知管理员，确认后余额到账','success');
            window.location.hash = '#/recharge';
        });
    }

    load();
    return {unmount:function(){}};
});
