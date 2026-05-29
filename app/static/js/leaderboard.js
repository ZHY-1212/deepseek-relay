registerRoute('#/leaderboard', function(container) {
    async function load() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        var baseUrl = window.location.origin;
        container.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-tertiary)">加载中...</div>';

        // Fetch all models usage stats from admin
        var allData = null;
        try { allData = await api.get('/admin/all-users'); } catch(e) {}

        if (!allData) {
            container.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-secondary)">暂无数据</p>';
            return;
        }

        var users = allData.users || [];
        var overview = allData.overview || {};

        // Model popularity (from usage records)
        var modelCounts = {};
        var hourlyData = Array(24).fill(0);
        // We don't have detailed model usage per model publicly, so use what we have
        var topUsers = users.slice(0, 20);

        // Cost comparison
        var platformCost = overview.estimated_revenue || 0;
        var directCost = (overview.total_api_tokens || 0) / 1000000 * 2; // ~¥2/M at official prices
        var savings = directCost > 0 ? Math.round((1 - platformCost / directCost) * 100) : 0;

        container.innerHTML =
            '<div class="page-header"><h2>平台数据</h2><p>用量排行 · 成本对比 · 社区透明</p></div>'+

            '<div class="stats-grid">'+
            '<div class="stat-card"><div class="stat-label">总用户</div><div class="stat-value">'+overview.total_users+'</div></div>'+
            '<div class="stat-card"><div class="stat-label">总 API 调用</div><div class="stat-value">'+(overview.total_api_tokens||0).toLocaleString()+'</div></div>'+
            '<div class="stat-card"><div class="stat-label">平台价格</div><div class="stat-value" style="color:var(--blue)">¥'+platformCost+'</div><span style="font-size:12px;color:var(--text-tertiary)">用户实际支付</span></div>'+
            '<div class="stat-card"><div class="stat-label">官方直购价</div><div class="stat-value" style="color:var(--green)">¥'+(directCost.toFixed(0))+'</div><span style="font-size:12px;color:var(--text-tertiary)">如果直接买官方 API</span></div>'+
            '</div>'+

            '<div class="section-title">用户消耗排行 Top 20</div>'+
            '<div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>#</th><th>用户</th><th>套餐</th><th>API Token</th></tr></thead><tbody>'+
            topUsers.map(function(u,i){
                return '<tr><td>'+(i+1)+'</td><td>'+u.username.slice(0,2)+'***</td><td><span class="badge badge-'+u.tier+'">'+u.tier+'</span></td><td>'+u.total_api_tokens.toLocaleString()+'</td></tr>';
            }).join('')+
            '</tbody></table></div>'+

            '<div class="section-title">时段热力图（全平台）</div>'+
            '<div class="card"><div class="chart-bars">'+
            hourlyData.map(function(v,i){
                var h = Math.max(2, (v / Math.max(1, Math.max.apply(null, hourlyData))) * 100);
                return '<div class="chart-bar" style="height:'+h+'%;background:var(--blue);opacity:.5" title="'+i+'时: '+v+' 次"></div>';
            }).join('')+
            '</div><div class="chart-labels">'+hourlyData.map(function(v,i){return '<span>'+i+'时</span>'}).join('')+'</div></div>'+

            '<p style="text-align:center;font-size:12px;color:var(--text-tertiary);margin-top:20px">数据每小时更新 · 用户隐私已脱敏</p>';

    }
    load();
    return {unmount:function(){}};
});
