registerRoute('#/models', function(container) {
    var providers = [
        { id:'deepseek', name:'DeepSeek 官方', desc:'代码能力国产第一，综合最均衡', color:'#4f46e5', icon:'DS', models:[
            {id:'deepseek-chat',name:'DeepSeek Chat',desc:'通用旗舰 · 支持图片识别 · 128K 上下文',tags:['多模态','128K','对话']},
            {id:'deepseek-reasoner',name:'DeepSeek Reasoner',desc:'深度推理 · 复杂逻辑 · 数学编程',tags:['推理','128K','逻辑']}
        ]},
        { id:'siliconflow', name:'硅基流动', desc:'100+ 开源模型聚合，国内直连低延迟', color:'#7c3aed', icon:'SF', models:[
            {id:'deepseek-ai/DeepSeek-V3',name:'DeepSeek V3 (托管)',desc:'硅基托管 DeepSeek · 更快响应 · 开源',tags:['多模态','128K','托管']},
            {id:'deepseek-ai/DeepSeek-R1',name:'DeepSeek R1 (托管)',desc:'硅基托管推理模型 · 思考过程可见',tags:['推理','128K','托管']},
            {id:'Qwen/Qwen2.5-72B-Instruct',name:'Qwen2.5 72B',desc:'阿里通义千问旗舰 · 中文理解优秀',tags:['中文优化','128K','72B']},
            {id:'zai-org/GLM-4.6',name:'GLM-4.6',desc:'智谱最新 · 响应速度快 · 均衡表现',tags:['速度快','128K','最新']}
        ]},
        { id:'dashscope', name:'阿里百炼', desc:'通义千问系列 · 中文能力第一', color:'#f97316', icon:'QW', models:[
            {id:'qwen-plus',name:'通义千问 Plus',desc:'性价比之选 · 日常对话 · 均衡性能',tags:['中文优化','128K','均衡']},
            {id:'qwen-max',name:'通义千问 Max',desc:'旗舰能力 · 复杂任务 · 深度理解',tags:['中文最强','128K','旗舰']}
        ]},
        { id:'zhipu', name:'智谱 AI', desc:'GLM 系列 · 响应速度第一', color:'#2563eb', icon:'GL', models:[
            {id:'glm-4-plus',name:'GLM-4 Plus',desc:'高精度旗舰 · 复杂推理 · 长文本',tags:['高精度','128K','旗舰']},
            {id:'glm-4-flash',name:'GLM-4 Flash',desc:'轻量极速 · 免费额度 · 日常使用',tags:['极速','128K','轻量']}
        ]},
        { id:'volcengine', name:'火山方舟', desc:'字节豆包系列 · 速度与中文兼优', color:'#3370ff', icon:'DB', models:[
            {id:'doubao-pro-256k',name:'豆包 Pro 256K',desc:'字节旗舰 · 超长上下文 · 中文优化',tags:['256K','旗舰','中文优化']},
            {id:'doubao-lite-128k',name:'豆包 Lite 128K',desc:'轻量快速 · 免费额度 · 日常对话',tags:['极速','128K','轻量']}
        ]},
        { id:'moonshot', name:'月之暗面', desc:'Kimi 系列 · 长文本处理专家', color:'#6d28d9', icon:'KM', models:[
            {id:'moonshot-v1-128k',name:'Kimi 128K',desc:'超长上下文 · 文档分析 · 深度阅读',tags:['128K','长文本','阅读']}
        ]}
    ];

    var html = '<div class="page-header"><h2>模型广场</h2><p>聚合 6 大平台 · ' + providers.reduce(function(s,p){return s+p.models.length},0) + ' 款模型 · 统一 API 接入</p></div>';

    providers.forEach(function(prov) {
        html += '<div class="section-title"><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:'+prov.color+';color:#fff;text-align:center;line-height:24px;font-size:11px;font-weight:700;margin-right:8px">'+prov.icon+'</span>'+prov.name+' <span style="font-weight:400;font-size:12px;color:var(--text-tertiary);margin-left:8px">'+prov.desc+'</span></div>';
        html += '<div class="model-grid">';
        prov.models.forEach(function(m) {
            html += '<div class="model-card" onclick="localStorage.setItem(\'chat_model\',\''+m.id+'\');window.location.hash=\'#/chat\'">'+
                '<div class="mc-icon" style="background:'+prov.color+'15;color:'+prov.color+'">'+prov.icon+'</div>'+
                '<div class="mc-info"><div class="mc-provider">'+prov.name+'</div><div class="mc-name">'+m.name+'</div><div class="mc-desc">'+m.desc+'</div>'+
                '<div class="mc-tags">'+m.tags.map(function(t){return '<span class="mc-tag">'+t+'</span>'}).join('')+'</div></div></div>';
        });
        html += '</div>';
    });

    container.innerHTML = html;
    return {unmount:function(){}};
});
