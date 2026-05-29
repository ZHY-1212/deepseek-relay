registerRoute('#/models', (container) => {
    const providers = [
        { id: 'deepseek', name: 'DeepSeek 官方', desc: '代码能力国产第一，综合最均衡', url: 'api.deepseek.com', models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', desc: '通用对话旗舰，支持图片识别', tags: ['多模态','128K','¥2/百万Token'] },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', desc: '深度推理模型，复杂逻辑分析', tags: ['推理增强','128K','¥4/百万Token'] },
        ]},
        { id: 'siliconflow', name: '硅基流动', desc: '100+开源模型聚合，国内直连', url: 'api.siliconflow.cn', models: [
            { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', desc: '硅基流动托管，更快响应', tags: ['多模态','128K','开源'] },
            { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', desc: '推理模型，支持思考过程', tags: ['推理增强','128K','开源'] },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', desc: '阿里通义千问旗舰', tags: ['中文优化','128K','开源'] },
            { id: 'zai-org/GLM-4.6', name: 'GLM-4.6', desc: '智谱最新对话模型', tags: ['速度快','128K','开源'] },
        ]},
        { id: 'dashscope', name: '阿里百炼', desc: '通义千问系列，中文理解强', url: 'dashscope.aliyun.com', models: [
            { id: 'qwen-plus', name: '通义千问 Plus', desc: '性价比之选，日常对话', tags: ['中文优化','128K','¥4/百万Token'] },
            { id: 'qwen-max', name: '通义千问 Max', desc: '旗舰能力，复杂任务', tags: ['中文最强','128K','¥12/百万Token'] },
        ]},
        { id: 'zhipu', name: '智谱 AI', desc: 'GLM系列，响应最快', url: 'open.bigmodel.cn', models: [
            { id: 'glm-4-plus', name: 'GLM-4 Plus', desc: '高精度旗舰模型', tags: ['速度快','128K','¥4/百万Token'] },
            { id: 'glm-4-flash', name: 'GLM-4 Flash', desc: '轻量快速，免费额度', tags: ['极速','128K','免费'] },
        ]},
        { id: 'volcengine', name: '火山方舟', desc: '字节豆包系列，速度最快', url: 'ark.cn-beijing.volces.com', models: [
            { id: 'doubao-pro-256k', name: '豆包 Pro', desc: '字节旗舰，超长上下文', tags: ['256K','¥3/百万Token','中文优化'] },
            { id: 'doubao-lite-128k', name: '豆包 Lite', desc: '轻量快速，每月100万免费', tags: ['极速','128K','免费额度'] },
        ]},
        { id: 'moonshot', name: '月之暗面 Kimi', desc: '长文本处理专家', url: 'platform.moonshot.cn', models: [
            { id: 'moonshot-v1-128k', name: 'Kimi 128K', desc: '超长上下文，文档分析', tags: ['128K','长文本','中文优化'] },
        ]},
    ];

    container.innerHTML = `
        <div class="page-header">
            <h2>模型广场</h2>
            <p>多平台聚合，统一 API 接入。选择一个模型即可在体验中心测试</p>
        </div>
        ${providers.filter(p => p.models.length > 0).map(prov => `
        <div class="section-title">${prov.name} <span style="font-weight:400;font-size:13px;color:var(--text-tertiary);margin-left:8px">${prov.url}</span></div>
        <div class="model-grid">
            ${prov.models.map(m => `
            <div class="model-card" onclick="window.location.hash='#/chat';localStorage.setItem('chat_model','${m.id}')">
                <div class="prov-tag">${prov.name}</div>
                <div class="model-name">${m.name}</div>
                <div class="model-desc">${m.desc}</div>
                <div class="model-meta">${m.tags.map(t => `<span class="meta-tag">${t}</span>`).join('')}</div>
            </div>`).join('')}
        </div>`).join('')}
    `;

    return { unmount() {} };
});
