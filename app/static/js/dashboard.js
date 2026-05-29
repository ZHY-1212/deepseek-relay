registerRoute('#/dashboard', function(container) {
    var profile = null;
    var tierNames = {free:'免费版',pro:'专业版',vip:'至尊版'};

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

            // Tier cards
            '<div class="section-title">套餐</div><div class="tier-grid">'+
            ['free','pro','vip'].map(function(t){
                var d=tierDefs[t]; var isC=u.tier===t;
                return '<div class="tier-card'+(isC?' active':'')+'"><div class="tier-icon">'+d.icon+'</div><h3>'+tierNames[t]+'</h3><div class="price">'+(d.price===0?'免费':'¥'+d.price)+'<span>/月</span></div><div class="features"><div>◆ '+d.tokens.toLocaleString()+' Token/月</div><div>◆ '+(typeof d.reqs==='number'?d.reqs.toLocaleString():d.reqs)+' 请求/天</div><div>◆ '+d.desc+'</div></div><button '+(isC?'disabled':'id="btn-up-'+t+'"')+'>'+(isC?'当前套餐':'立即升级')+'</button></div>';
            }).join('')+'</div>'+

            // API Key
            '<div class="section-title">API Key</div><div class="card"><div class="api-key-display">'+u.api_key_prefix+'</div><div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn-sm" id="btn-copy-curl">复制 curl</button><button class="btn-sm" id="btn-copy-py">复制 Python</button><button class="btn-sm" id="btn-reset-key" style="margin-left:auto">重新生成</button></div><div style="font-size:12px;color:var(--text-tertiary);margin-top:6px">完整 Key 仅创建时显示一次</div></div>';

        // Upgrade buttons
        ['free','pro','vip'].forEach(function(t){
            var btn=document.getElementById('btn-up-'+t);
            if(btn) btn.addEventListener('click',function(e){e.stopPropagation();
                api.post('/payment/create-order',{tier:t}).then(function(o){showPaymentModal(o,tierNames[t],tierDefs[t].price)}).catch(function(e){showToast(e.message,'error')});
            });
        });

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

function showPaymentModal(order, tierName, price) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'payment-modal';
    overlay.innerHTML = '<div class="modal-card"><div class="modal-header"><h3>升级至 '+tierName+'</h3><button class="modal-close" id="modal-close-btn">&times;</button></div><div class="modal-body" style="text-align:center"><div style="font-size:2.5rem;font-weight:700;margin-bottom:4px;color:var(--accent)">¥'+price+'</div><p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">订单号：'+order.order_id.slice(0,8)+'…</p><div style="background:var(--bg-hover);border-radius:var(--radius);padding:16px;margin-bottom:16px;font-size:13px;color:var(--text-secondary);text-align:left;line-height:1.8"><strong style="color:var(--text)">付款说明</strong><br>1. 前往「余额充值」页面充值<br>2. 或联系管理员获取收款码<br>3. 管理员确认后自动升级</div><p style="font-size:12px;color:var(--text-tertiary)">确认后请联系管理员</p></div></div>';
    document.body.appendChild(overlay);
    var close = function(){ var el=document.getElementById('payment-modal'); if(el)el.remove(); };
    overlay.querySelector('#modal-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });
}
