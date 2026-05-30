registerRoute('#/docgen', function(container) {
    var selectedType = 'pptx';
    var loading = false;

    function render() {
        container.innerHTML =
            '<div class="page-header"><h2>AI 文档生成</h2><p>输入需求，AI 自动生成 PPT · Excel · Word 并下载</p></div>'+

            '<div class="card"><div style="font-size:15px;font-weight:650;margin-bottom:14px;letter-spacing:-.01em">选择文件类型</div>'+
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">'+
            '<div class="tier-card" style="cursor:pointer;border:'+(selectedType==='pptx'?'2px solid var(--blue)':'1px solid var(--border)')+';box-shadow:none" id="type-pptx"><div style="font-size:40px;margin-bottom:8px">📊</div><div style="font-weight:650;font-size:15px">PPT 演示</div><div style="font-size:11px;color:var(--text-secondary)">.pptx</div></div>'+
            '<div class="tier-card" style="cursor:pointer;border:'+(selectedType==='xlsx'?'2px solid var(--blue)':'1px solid var(--border)')+';box-shadow:none" id="type-xlsx"><div style="font-size:40px;margin-bottom:8px">📈</div><div style="font-weight:650;font-size:15px">Excel 表格</div><div style="font-size:11px;color:var(--text-secondary)">.xlsx</div></div>'+
            '<div class="tier-card" style="cursor:pointer;border:'+(selectedType==='docx'?'2px solid var(--blue)':'1px solid var(--border)')+';box-shadow:none" id="type-docx"><div style="font-size:40px;margin-bottom:8px">📄</div><div style="font-weight:650;font-size:15px">Word 文档</div><div style="font-size:11px;color:var(--text-secondary)">.docx</div></div>'+
            '</div>'+

            '<div style="font-weight:650;font-size:14px;margin-bottom:8px;letter-spacing:-.01em">描述你的需求</div>'+
            '<textarea id="prompt" placeholder="例如：做一个2025年AI行业趋势PPT，包含市场规模、关键技术、主要玩家、未来展望" style="width:100%;min-height:110px;padding:14px 16px;border:1px solid var(--border);border-radius:14px;font-size:14.5px;font-family:var(--font);background:var(--bg-input);color:var(--text);resize:vertical;line-height:1.7;outline:none;letter-spacing:-.01em;transition:border .15s"></textarea>'+

            '<button class="btn-primary" id="btn-generate" style="width:100%;padding:14px;border-radius:16px;font-size:16px;font-weight:600;letter-spacing:-.02em;margin-top:14px;transition:all .2s">'+(loading?'<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block"></span>AI 正在生成文档...</span>':'✨ 开始生成')+'</button>'+
            '<div id="gen-msg" class="inline-msg" style="margin-top:14px;text-align:center;font-size:13px"></div></div>'+

            '<div class="card"><div style="font-weight:650;font-size:14px;margin-bottom:12px;letter-spacing:-.01em">快速模板</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;font-size:13px;color:var(--text-secondary)">'+
            tmpl('📊 行业趋势PPT', '做一个2025年AI行业趋势分析PPT，包含市场规模、关键技术、主要玩家、未来展望', 'pptx')+
            tmpl('📈 工资表模板', '生成一个员工工资表，包含姓名、部门、基本工资、奖金、实发工资5列，10行数据', 'xlsx')+
            tmpl('📄 项目总结报告', '写一份项目总结报告，包含项目背景、目标、执行过程、成果和下一步计划', 'docx')+
            '</div></div>';

        document.getElementById('type-pptx').addEventListener('click',function(){selectedType='pptx';render()});
        document.getElementById('type-xlsx').addEventListener('click',function(){selectedType='xlsx';render()});
        document.getElementById('type-docx').addEventListener('click',function(){selectedType='docx';render()});
        document.getElementById('btn-generate').addEventListener('click',doGenerate);
    }

    function tmpl(label,prompt,type){
        return '<div class="stat-card" style="cursor:pointer;padding:14px 16px" onclick="document.getElementById(\'prompt\').value=\''+prompt.replace(/'/g,"\\'")+'\';selectedType=\''+type+'\';render()"><strong>'+label+'</strong><div style="margin-top:4px;font-size:12px">'+prompt.slice(0,40)+'...</div></div>';
    }

    async function doGenerate() {
        var prompt = document.getElementById('prompt').value.trim();
        if (prompt.length < 5) { showToast('需求描述至少5个字','error'); return; }
        var msg = document.getElementById('gen-msg');
        msg.className = 'inline-msg'; msg.textContent = '⏳ AI 正在分析需求并生成文档...'; msg.style.display = 'block';
        loading = true; render();

        try {
            var resp = await fetch('/docgen/generate',{
                method:'POST',
                headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.getToken()},
                body:JSON.stringify({doc_type:selectedType,prompt:prompt})
            });
            if(!resp.ok){var e=await resp.json().catch(function(){return{}});throw new Error(e.detail||'生成失败，请重试')}
            var blob=await resp.blob();
            var ext=selectedType==='pptx'?'pptx':selectedType==='xlsx'?'xlsx':'docx';
            var filename='AI生成_'+(prompt.slice(0,15).replace(/[^一-龥a-zA-Z0-9]/g,''))+'.'+ext;
            var a=document.createElement('a');a.href=URL.createObjectURL(blob);
            a.download=filename;a.style.display='none';
            document.body.appendChild(a);a.click();
            setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href)},1000);
            msg.className='inline-msg success';msg.textContent='✅ 下载中：'+filename+' · 若未自动下载请检查浏览器设置';
            soundSuccess?.(null);
        } catch(err){
            msg.className='inline-msg error';msg.textContent='❌ '+err.message;
        }
        loading=false;render();
    }

    render();
    return {unmount:function(){}};
});
