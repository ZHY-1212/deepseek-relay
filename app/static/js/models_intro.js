registerRoute('#/models-intro', function(container) {
    var providers = [
        {name:'DeepSeek 官方',url:'deepseek.com',color:'#4f46e5',icon:'DS',
            desc:'DeepSeek 由深度求索公司开发，专注于通用人工智能。代码能力国产第一，全球开源模型排名前三。V3 系列支持 128K 上下文和多模态识别。',
            models:[
                {name:'deepseek-chat',desc:'通用旗舰模型，支持文本对话和图片识别。128K 上下文窗口，可一次处理整本小说。擅长代码生成、翻译、创意写作。适用场景：日常对话、编程助手、内容创作。',best:'代码生成、通用对话'},
                {name:'deepseek-reasoner',desc:'深度推理模型，在数学、逻辑、编程竞赛中表现优异。会先进行内部推理再给出答案，思考过程可见。适用场景：数学题解、复杂逻辑、算法设计。',best:'数学推理、复杂逻辑'}
            ]},
        {name:'硅基流动 SiliconFlow',url:'siliconflow.cn',color:'#7c3aed',icon:'SF',
            desc:'国内领先的 AI 模型聚合平台，托管 100+ 开源模型。提供国内直连低延迟服务，注册送 2000 万 Token。支持 OpenAI 兼容 API。',
            models:[
                {name:'DeepSeek V3/R1 (托管)',desc:'硅基流动托管的 DeepSeek 模型，性能与官方一致但延迟更低。适合需要国内高速访问的场景。',best:'国内低延迟'},
                {name:'Qwen2.5 72B',desc:'阿里通义千问旗舰开源模型，720 亿参数。中文能力突出，在 C-Eval 中文评测中名列前茅。支持 128K 超长上下文。',best:'中文对话、长文本'},
                {name:'GLM-4.6',desc:'智谱 AI 最新对话模型，响应速度极快。在通用对话和工具调用方面表现均衡，是综合性价比较高的选择。',best:'快速响应、工具调用'}
            ]},
        {name:'阿里百炼 DashScope',url:'dashscope.aliyun.com',color:'#f97316',icon:'QW',
            desc:'阿里云推出的 AI 模型服务平台，通义千问系列旗舰。中文理解能力业界第一，数学推理能力国产最强。注册送百万 Token。',
            models:[
                {name:'qwen-plus',desc:'通义千问中端模型，性价比之选。日常对话流畅自然，中文语境理解优秀。128K 上下文，适合大部分通用场景。',best:'性价比、日常对话'},
                {name:'qwen-max',desc:'通义千问旗舰模型，中文能力和数学推理均为国产第一。适合对质量要求极高的场景：学术论文、专业翻译、复杂分析。',best:'中文旗舰、学术写作'}
            ]},
        {name:'智谱 AI Zhipu',url:'open.bigmodel.cn',color:'#2563eb',icon:'GL',
            desc:'智谱 AI 由清华大学团队创立，是国内最早的大模型公司之一。GLM 系列以响应速度快著称，首字延迟行业最低。',
            models:[
                {name:'glm-4-plus',desc:'智谱旗舰模型，在多项评测中表现优异。支持长文本理解和复杂推理。适用场景：企业级应用、专业写作。',best:'企业应用、长文本'},
                {name:'glm-4-flash',desc:'智谱轻量模型，速度极快且免费。适合实时对话、客服机器人、简单问答等对延迟敏感的场景。',best:'极速响应、免费额度'}
            ]},
        {name:'火山方舟 Volcengine',url:'console.volcengine.com/ark',color:'#3370ff',icon:'DB',
            desc:'字节跳动旗下 AI 平台，豆包系列以速度闻名。首字延迟 0.3 秒，生成速度 120 t/s，为业界最快。注册每月送 100 万 Token。',
            models:[
                {name:'doubao-pro-256k',desc:'字节旗舰模型，256K 超长上下文。可用于整本书级别的文档分析。中文优化，速度和效果兼具。',best:'超长上下文、极速'},
                {name:'doubao-lite-128k',desc:'字节轻量模型，业界最快响应速度。适合需要实时交互的场景。每月有免费额度。',best:'极速免费、实时对话'}
            ]},
        {name:'月之暗面 Moonshot',url:'platform.moonshot.cn',color:'#6d28d9',icon:'KM',
            desc:'月之暗面由清华杨植麟创立，专注于长文本处理。Kimi 以"长文本专家"著称，擅长文档分析和深度阅读。',
            models:[
                {name:'moonshot-v1-128k',desc:'Kimi 128K 长文本模型，可一次性处理整本小说或长篇报告。擅长摘要、问答、文档分析。适合阅读论文、分析合同、总结会议纪要。',best:'文档分析、深度阅读'}
            ]}
    ];

    container.innerHTML =
        '<div class="page-header"><h2>模型介绍</h2><p>了解各平台模型的能力、特点和最佳使用场景</p></div>'+
        providers.map(function(prov){
            return '<div class="section-title"><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:'+prov.color+';color:#fff;text-align:center;line-height:24px;font-size:11px;font-weight:700;margin-right:8px">'+prov.icon+'</span>'+prov.name+' <span style="font-weight:400;font-size:12px;color:var(--text-tertiary);margin-left:8px">'+prov.url+'</span></div>'+
            '<div class="card" style="margin-bottom:8px"><p style="font-size:13.5px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">'+prov.desc+'</p>'+
            prov.models.map(function(m){
                return '<div style="background:var(--bg-hover);border-radius:var(--radius);padding:14px 16px;margin-bottom:8px">'+
                    '<div style="font-weight:650;margin-bottom:4px">'+m.name+'</div>'+
                    '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:6px">'+m.desc+'</p>'+
                    '<span style="font-size:11px;background:var(--accent-subtle);color:var(--accent);padding:2px 8px;border-radius:4px">擅长：'+m.best+'</span></div>';
            }).join('')+'</div>';
        }).join('')+
        '<p style="text-align:center;font-size:12px;color:var(--text-tertiary);margin-top:20px">信息来源于各模型官方文档，实际效果可能因版本更新而变化</p>';

    return {unmount:function(){}};
});
