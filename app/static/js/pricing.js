registerRoute('#/pricing', function(container) {
    container.innerHTML =
        '<div class="page-header"><h2>计费规则与服务条款</h2><p>透明定价 · 按量计费 · 充值余额永久有效</p></div>'+

        // Tier cards
        '<div class="section-title">月费套餐</div>'+
        '<div class="tier-grid">'+
        '<div class="tier-card"><div class="tier-icon">◯</div><h3>免费版</h3><div class="price">免费</div><div class="features"><div>◆ 20万 Token/月</div><div>◆ 100 请求/天</div><div>◆ 全模型可用</div></div></div>'+
        '<div class="tier-card"><div class="tier-icon">◉</div><h3>专业版</h3><div class="price">¥19.9<span>/月</span></div><div class="features"><div>◆ 200万 Token/月</div><div>◆ 500 请求/天</div><div>◆ 充值额外送 10%</div></div></div>'+
        '<div class="tier-card"><div class="tier-icon">◆</div><h3>至尊版</h3><div class="price">¥49.9<span>/月</span></div><div class="features"><div>◆ 1000万 Token/月</div><div>◆ 请求无限制</div><div>◆ 充值额外送 25%</div></div></div>'+
        '</div>'+

        // Per-model pricing
        '<div class="section-title">模型费率 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（平台 Token / 百万 API Token）</span></div>'+
        '<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table"><thead><tr><th>平台</th><th>模型</th><th>输入</th><th>输出</th><th>倍数</th></tr></thead><tbody>'+
        '<tr><td>DeepSeek 官方</td><td>deepseek-chat</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>DeepSeek 官方</td><td>deepseek-reasoner</td><td class="price-cell">12 万</td><td class="price-cell">36 万</td><td>4x</td></tr>'+
        '<tr><td>硅基流动</td><td>DeepSeek V3 / R1</td><td class="price-cell">8 万</td><td class="price-cell">24 万</td><td>3x</td></tr>'+
        '<tr><td>硅基流动</td><td>Qwen2.5 / GLM-4.6</td><td class="price-cell">10 万</td><td class="price-cell">30 万</td><td>3.5x</td></tr>'+
        '<tr><td>阿里百炼</td><td>通义千问 Plus/Max</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5-4x</td></tr>'+
        '<tr><td>智谱 AI</td><td>GLM-4 Plus/Flash</td><td class="price-cell">6 万</td><td class="price-cell">18 万</td><td>2-3x</td></tr>'+
        '<tr><td>火山方舟</td><td>豆包 Pro/Lite</td><td class="price-cell">6 万</td><td class="price-cell">18 万</td><td>2-3x</td></tr>'+
        '<tr><td>Kimi</td><td>Kimi 128K</td><td class="price-cell">10 万</td><td class="price-cell">32 万</td><td>3.5x</td></tr>'+
        '</tbody></table></div>'+

        // Service terms
        '<div class="section-title">服务条款</div>'+
        '<div class="card"><div style="line-height:2.2;font-size:13.5px;color:var(--text-secondary)">'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">一、服务说明</h3>'+
        '<p>1.1 本平台（DS Relay）是一个 AI 模型 API 聚合服务，为用户提供统一的接口调用多个 AI 大模型厂商的服务。</p>'+
        '<p>1.2 平台本身不训练或运行 AI 模型，所有模型能力均由第三方厂商（DeepSeek、阿里云、智谱、字节跳动、月之暗面等）提供。</p>'+
        '<p>1.3 平台保留对服务进行升级、调整或暂停的权利，重大变更将提前通知用户。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">二、账户与安全</h3>'+
        '<p>2.1 用户注册时需提供真实有效的邮箱地址，一个邮箱仅可注册一个账户。</p>'+
        '<p>2.2 用户应妥善保管账户密码和 API Key。因账户泄露导致的 Token 被盗用、余额损失，由用户自行承担。</p>'+
        '<p>2.3 禁止将账户转借、出租或出售给他人使用。一经发现，平台有权永久封禁账户。</p>'+
        '<p>2.4 如发现账户异常登录或 API Key 泄露，应立即联系管理员重置。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">三、充值、消费与退款</h3>'+
        '<p>3.1 用户通过微信或支付宝扫码充值，充值金额按 1 元 = 100 万平台 Token 的比例转换为余额。</p>'+
        '<p>3.2 余额可用于调用平台支持的所有模型，不同模型消耗速率不同（详见上方费率表）。</p>'+
        '<p>3.3 每次 API 调用的实际扣费 = API 返回的 Token 数量 × 该模型的加成倍数。</p>'+
        '<p>3.4 充值完成后不支持退款。余额不可提现、不可转让。</p>'+
        '<p>3.5 平台按实际调用量扣费，如因网络原因造成请求失败但未返回结果的，不扣费。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">四、使用规范</h3>'+
        '<p>4.1 禁止使用本平台 API 生成、传播违法信息，包括但不限于：暴力恐怖、淫秽色情、赌博诈骗、侵犯他人隐私、侵犯知识产权等内容。</p>'+
        '<p>4.2 禁止利用自动化脚本或批量注册方式获取免费额度。</p>'+
        '<p>4.3 禁止对平台 API 进行压力测试、DDoS 攻击或任何可能影响服务稳定性的行为。</p>'+
        '<p>4.4 单次请求的并发连接数不得超过合理范围。如有大规模调用需求，请联系管理员开通专属通道。</p>'+
        '<p>4.5 违反上述规定的，平台有权立即封禁账户，余额不予退还，并保留追究法律责任的权利。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">五、服务可用性</h3>'+
        '<p>5.1 平台尽力保证服务的连续性和稳定性，但不对此做出绝对保证。</p>'+
        '<p>5.2 因第三方模型厂商（如 DeepSeek、阿里云等）的服务中断、维护或调整导致的调用失败，平台不承担责任。</p>'+
        '<p>5.3 因不可抗力（自然灾害、战争、政府行为、网络攻击等）导致的服务中断，平台不承担责任。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">六、隐私与数据</h3>'+
        '<p>6.1 平台仅收集必要的账户信息（用户名、邮箱、API 调用记录），不收集用户的对话内容。</p>'+
        '<p>6.2 用户的 API 调用数据仅用于计费和统计，不会出售或分享给第三方。</p>'+
        '<p>6.3 用户调用 API 时，对话内容将直接转发至对应的模型厂商，平台不会存储或审查对话内容。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">七、知识产权</h3>'+
        '<p>7.1 通过 API 生成的内容的知识产权归用户所有。</p>'+
        '<p>7.2 各模型厂商可能对生成内容有不同的知识产权约定，用户应自行了解并遵守对应厂商的条款。</p>'+

        '<h3 style="font-size:15px;color:var(--text);margin:16px 0 8px">八、条款变更</h3>'+
        '<p>8.1 平台有权适时修改本服务条款，修改后的条款将在平台上公布。</p>'+
        '<p>8.2 用户继续使用平台服务即视为同意修改后的条款。</p>'+

        '</div></div>';

    return {unmount:function(){}};
});
