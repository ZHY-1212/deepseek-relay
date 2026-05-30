registerRoute('#/docgen', function(container) {
    var selectedType = 'pptx';
    var loading = false;

    function render() {
        container.innerHTML =
            '<div class="page-header"><h2>AI 文档生成</h2><p>一句话描述需求，AI自动生成 PPT / Excel / Word 文件</p></div>'+

            '<div class="card"><div class="section-title" style="margin-top:0">选择文件类型</div>'+
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">'+
            '<div class="stat-card" style="text-align:center;cursor:pointer;border:'+(selectedType==='pptx'?'2px solid var(--blue)':'1px solid var(--border)')+'" id="type-pptx"><div style="font-size:36px;margin-bottom:8px">📊</div><div style="font-weight:650">PPT 演示</div><div style="font-size:11px;color:var(--text-secondary)">.pptx</div></div>'+
            '<div class="stat-card" style="text-align:center;cursor:pointer;border:'+(selectedType==='xlsx'?'2px solid var(--blue)':'1px solid var(--border)')+'" id="type-xlsx"><div style="font-size:36px;margin-bottom:8px">📈</div><div style="font-weight:650">Excel 表格</div><div style="font-size:11px;color:var(--text-secondary)">.xlsx</div></div>'+
            '<div class="stat-card" style="text-align:center;cursor:pointer;border:'+(selectedType==='docx'?'2px solid var(--blue)':'1px solid var(--border)')+'" id="type-docx"><div style="font-size:36px;margin-bottom:8px">📄</div><div style="font-weight:650">Word 文档</div><div style="font-size:11px;color:var(--text-secondary)">.docx</div></div>'+
            '</div>'+

            '<div style="font-weight:600;margin-bottom:8px">描述你的需求</div>'+
            '<textarea id="prompt" placeholder="例如：做一个关于2025年AI行业趋势的PPT，包含市场规模、关键技术、主要玩家、未来展望四个章节" style="width:100%;min-height:100px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;font-family:var(--font);background:var(--bg-input);color:var(--text);resize:vertical;line-height:1.6"></textarea>'+
            '<div style="display:flex;gap:10px;align-items:center;margin-top:12px">'+
            '<button class="btn-primary" id="btn-generate" style="padding:12px 28px;font-size:15px">'+(loading?'生成中...':'🚀 生成文档')+'</button>'+
            '<span style="font-size:12px;color:var(--text-tertiary)">生成约需 10-30 秒，文件自动下载</span></div>'+
            '<div id="gen-msg" class="inline-msg" style="margin-top:12px"></div></div>'+

            '<div class="card"><div style="font-weight:600;margin-bottom:10px">使用示例</div>'+
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;font-size:13px;color:var(--text-secondary)">'+
            '<div class="stat-card" style="cursor:pointer" onclick="document.getElementById(\'prompt\').value=\'做一个2025年AI行业趋势分析PPT，包含市场规模、关键技术、主要玩家、未来展望\';document.getElementById(\'type-pptx\').click()"><strong>📊 PPT示例</strong><br>2025年AI行业趋势分析</div>'+
            '<div class="stat-card" style="cursor:pointer" onclick="document.getElementById(\'prompt\').value=\'生成一个员工工资表，包含姓名、部门、基本工资、奖金、实发工资5列，10行数据\';document.getElementById(\'type-xlsx\').click()"><strong>📈 Excel示例</strong><br>员工工资表模板</div>'+
            '<div class="stat-card" style="cursor:pointer" onclick="document.getElementById(\'prompt\').value=\'写一份项目总结报告，包含项目背景、目标、执行过程、成果和下一步计划\';document.getElementById(\'type-docx\').click()"><strong>📄 Word示例</strong><br>项目总结报告</div>'+
            '</div></div>';

        document.getElementById('type-pptx').addEventListener('click',function(){selectedType='pptx';render()});
        document.getElementById('type-xlsx').addEventListener('click',function(){selectedType='xlsx';render()});
        document.getElementById('type-docx').addEventListener('click',function(){selectedType='docx';render()});
        document.getElementById('btn-generate').addEventListener('click',doGenerate);
    }

    async function doGenerate() {
        var prompt = document.getElementById('prompt').value.trim();
        if (prompt.length < 5) { showToast('需求描述至少5个字','error'); return; }
        var msg = document.getElementById('gen-msg');
        msg.className = 'inline-msg'; msg.textContent = 'AI 正在生成文档，请稍候...'; msg.style.display = 'block';
        loading = true; render();

        try {
            var resp = await fetch('/docgen/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.getToken() },
                body: JSON.stringify({ doc_type: selectedType, prompt: prompt })
            });
            if (!resp.ok) { var e = await resp.json().catch(function(){return{}}); throw new Error(e.detail || '生成失败'); }
            var blob = await resp.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url;
            var ext = selectedType === 'pptx' ? 'pptx' : selectedType === 'xlsx' ? 'xlsx' : 'docx';
            a.download = 'document.' + ext; a.click();
            URL.revokeObjectURL(url);
            msg.className = 'inline-msg success'; msg.textContent = '✅ 文件已下载！';
        } catch (err) {
            msg.className = 'inline-msg error'; msg.textContent = '❌ ' + err.message;
        }
        loading = false; render();
    }

    render();
    return {unmount:function(){}};
});
