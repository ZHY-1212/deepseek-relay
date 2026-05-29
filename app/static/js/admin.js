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
            '</div>'+
            '<div id="admin-content"></div>';

        function switchTab(name) {
            currentTab = name;
            ['overview','users','orders','tiers','qr'].forEach(function(t){
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
                    return '<tr class="'+(u.is_banned?'banned':'')+'"><td>'+u.username+(u.is_admin?' ⭐':'')+'</td><td>'+u.email+'</td><td><span class="badge badge-'+u.tier+'">'+u.tier+'</span></td><td>'+u.balance.toLocaleString()+'</td><td>'+u.total_deducted.toLocaleString()+'</td><td>'+u.total_requests+'</td><td>'+(u.is_banned?'<span style="color:var(--red)">封禁</span>':'<span style="color:var(--green)">正常</span>')+'</td><td><button class="btn-sm btn-ban" data-id="'+u.id+'" data-banned="'+u.is_banned+'">'+(u.is_banned?'解封':'封禁')+'</button> <button class="btn-sm btn-admin" data-id="'+u.id+'" style="margin:0 2px">'+(u.is_admin?'取消管理':'设管理')+'</button> <select class="tier-select styled" data-id="'+u.id+'"><option value="free" '+(u.tier==='free'?'selected':'')+'>免费</option><option value="pro" '+(u.tier==='pro'?'selected':'')+'>专业</option><option value="vip" '+(u.tier==='vip'?'selected':'')+'>至尊</option></select></td></tr>';
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
