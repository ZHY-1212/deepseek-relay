registerRoute('#/pricing', function(container) {
    container.innerHTML =
        '<div class="page-header"><h2>计费规则</h2><p>透明定价 · 按量计费 · 充值余额永久有效</p></div>'+

        // Tier cards
        '<div class="section-title">月费套餐 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（月度 Token 额度 + 请求次数）</span></div>'+
        '<div class="tier-grid">'+
        '<div class="tier-card"><div class="tier-icon">◯</div><h3>免费版</h3><div class="price">免费</div><div class="features"><div>◆ 10万 Token/月</div><div>◆ 50 请求/天</div><div>◆ 所有模型可用</div></div><button disabled>当前默认</button></div>'+
        '<div class="tier-card"><div class="tier-icon">◉</div><h3>专业版</h3><div class="price">¥19.9<span>/月</span></div><div class="features"><div>◆ 200万 Token/月</div><div>◆ 500 请求/天</div><div>◆ 充值额外送 10%</div></div></div>'+
        '<div class="tier-card"><div class="tier-icon">◆</div><h3>至尊版</h3><div class="price">¥49.9<span>/月</span></div><div class="features"><div>◆ 1000万 Token/月</div><div>◆ 请求无限制</div><div>◆ 充值额外送 25%</div></div></div>'+
        '</div>'+

        // Per-model pricing
        '<div class="section-title">模型费率 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（平台 Token / 百万 API Token，输入+输出分别计费）</span></div>'+
        '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>平台</th><th>模型</th><th>输入费率</th><th>输出费率</th><th>加成倍数</th></tr></thead><tbody>'+
        '<tr><td><strong>DeepSeek 官方</strong></td><td>deepseek-chat</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>DeepSeek 官方</td><td>deepseek-reasoner</td><td class="price-cell">12 万</td><td class="price-cell">36 万</td><td>4x</td></tr>'+
        '<tr><td><strong>硅基流动</strong></td><td>DeepSeek V3 / R1</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>硅基流动</td><td>Qwen2.5-72B / GLM-4.6</td><td class="price-cell">10 万</td><td class="price-cell">30 万</td><td>3.5x</td></tr>'+
        '<tr><td><strong>阿里百炼</strong></td><td>通义千问 Plus / Max</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5-4x</td></tr>'+
        '<tr><td><strong>智谱 AI</strong></td><td>GLM-4 Plus / Flash</td><td class="price-cell">6-8 万</td><td class="price-cell">18-24 万</td><td>2-3x</td></tr>'+
        '<tr><td><strong>火山方舟</strong></td><td>豆包 Pro / Lite</td><td class="price-cell">6-8 万</td><td class="price-cell">18-24 万</td><td>2-3x</td></tr>'+
        '<tr><td><strong>Kimi</strong></td><td>Kimi 128K</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5x</td></tr>'+
        '</tbody></table></div>'+

        // Usage rules
        '<div class="section-title">使用规则</div>'+
        '<div class="card"><div style="line-height:2;font-size:13.5px;color:var(--text-secondary)">'+
        '<p><strong>1. 计费方式：</strong>优先消耗充值余额，余额不足时使用月套餐额度。按模型不同，1 个 API Token 消耗 2-4 个平台 Token。</p>'+
        '<p><strong>2. 余额永不过期：</strong>充值余额无使用期限，随时可用。</p>'+
        '<p><strong>3. 月套餐：</strong>每月自动重置额度，不同套餐享有不同请求次数上限和充值赠送。</p>'+
        '<p><strong>4. API Key 安全：</strong>请妥善保管你的 API Key，泄露造成的损失自行承担。</p>'+
        '<p><strong>5. 违规使用：</strong>禁止用于违法内容生成，违者封号不予退款。</p>'+
        '<p><strong>6. 退款政策：</strong>充值余额不支持退款提现。</p>'+
        '</div></div>';

    return {unmount:function(){}};
});
