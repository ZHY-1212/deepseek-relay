registerRoute('#/pricing', function(container) {
    container.innerHTML = '<div class="page-header"><h2>计费规则</h2><p>透明定价，按量计费。以下价格为平台售价，已包含服务溢价</p></div>'+

    '<div class="section-title">月费套餐</div>'+
    '<div class="tier-grid">'+
    '<div class="tier-card"><div class="tier-icon">◯</div><h3>免费版</h3><div class="price">免费</div><div class="features"><div>◆ 10万 Token/月</div><div>◆ 50 请求/天</div><div>◆ 基础模型支持</div><div>◆ 社区支持</div></div></div>'+
    '<div class="tier-card"><div class="tier-icon">◉</div><h3>专业版</h3><div class="price">¥19.9<span>/月</span></div><div class="features"><div>◆ 200万 Token/月</div><div>◆ 500 请求/天</div><div>◆ 全部模型可用</div><div>◆ 优先技术支持</div></div></div>'+
    '<div class="tier-card"><div class="tier-icon">◆</div><h3>至尊版</h3><div class="price">¥49.9<span>/月</span></div><div class="features"><div>◆ 1000万 Token/月</div><div>◆ 请求无限制</div><div>◆ 全部模型可用</div><div>◆ 专属客服通道</div></div></div>'+
    '</div>'+

    '<div class="section-title">各模型 Token 价格 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（输入 / 输出，单位：元/百万 Token）</span></div>'+
    '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>平台</th><th>模型</th><th>输入价格</th><th>输出价格</th><th>特点</th></tr></thead><tbody>'+
    '<tr><td><strong>DeepSeek 官方</strong></td><td>deepseek-chat</td><td class="price-cell">¥3.0</td><td class="price-cell">¥12.0</td><td>代码能力强，通用对话</td></tr>'+
    '<tr><td>DeepSeek 官方</td><td>deepseek-reasoner</td><td class="price-cell">¥6.0</td><td class="price-cell">¥24.0</td><td>深度推理，复杂逻辑</td></tr>'+
    '<tr><td><strong>硅基流动</strong></td><td>DeepSeek-V3 / R1</td><td class="price-cell">¥3.0</td><td class="price-cell">¥12.0</td><td>开源模型托管，国内直连</td></tr>'+
    '<tr><td>硅基流动</td><td>Qwen2.5-72B</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>阿里通义千问，中文优化</td></tr>'+
    '<tr><td>硅基流动</td><td>GLM-4.6</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>智谱对话模型，速度快</td></tr>'+
    '<tr><td><strong>阿里百炼</strong></td><td>通义千问 Plus/Max</td><td class="price-cell">¥6.0</td><td class="price-cell">¥18.0</td><td>中文理解最强</td></tr>'+
    '<tr><td><strong>智谱 AI</strong></td><td>GLM-4 Plus/Flash</td><td class="price-cell">¥6.0</td><td class="price-cell">¥18.0</td><td>极速响应，免费额度</td></tr>'+
    '<tr><td><strong>火山方舟</strong></td><td>豆包 Pro/Lite</td><td class="price-cell">¥4.0</td><td class="price-cell">¥9.0</td><td>字节跳动，超快速度</td></tr>'+
    '<tr><td><strong>Kimi</strong></td><td>Kimi 128K</td><td class="price-cell">¥5.0</td><td class="price-cell">¥16.0</td><td>超长上下文，文档分析</td></tr>'+
    '</tbody></table></div>'+

    '<div class="section-title">使用规则</div>'+
    '<div class="card"><div style="line-height:2;font-size:14px;color:var(--text-secondary)">'+
    '<p><strong>1. 计费方式：</strong>按实际消耗 Token 计费，输入和输出分别计算。1 Token ≈ 1 个中文字或 0.75 个英文单词。</p>'+
    '<p><strong>2. 月费套餐：</strong>购买月费套餐后，在额度内不限模型使用。超出部分按量计费或等待下月重置。</p>'+
    '<p><strong>3. API Key：</strong>每个账户拥有唯一 API Key，请妥善保管，泄露造成的损失由用户自行承担。</p>'+
    '<p><strong>4. 调用限制：</strong>免费版每日 50 次请求，专业版 500 次。至尊版无限制。</p>'+
    '<p><strong>5. 禁止用途：</strong>禁止用于生成违法、暴力、色情等违规内容。违者封禁账户不予退款。</p>'+
    '<p><strong>6. 服务保障：</strong>我们会尽力保证服务可用性，但不对因第三方模型供应商故障导致的服务中断承担责任。</p>'+
    '<p><strong>7. 退款政策：</strong>月费套餐购买后不支持退款。Token 余额不可提现。</p>'+
    '</div></div>';

    return {unmount:function(){}};
});
