registerRoute('#/chat', function(container) {
    var messages = [];
    var streaming = false;
    var pendingImage = null;
    var showHistory = false;
    var selectedModel = localStorage.getItem('chat_model') || 'deepseek-chat';
    var userId = (JSON.parse(localStorage.getItem('user') || '{}')).id || 'anon';
    var STORAGE_KEY = 'chat_' + userId;
    var visionModels = ['Qwen/Qwen2.5-VL-72B-Instruct'];
    function isVisionModel(m) { return visionModels.indexOf(m) >= 0; }
    var H24 = 24 * 60 * 60 * 1000;

    function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e) {} }
    function load() { try { var r = localStorage.getItem(STORAGE_KEY); if (r) messages = JSON.parse(r); } catch(e) { messages = []; } }
    function clearAll() { messages = []; showHistory = false; save(); render(); }

    function goBottom() {
        var md = document.getElementById('chat-messages');
        if (md) md.scrollTop = md.scrollHeight;
    }

    function appendMsg(m, idx) {
        var md = document.getElementById('chat-messages');
        if (!md) return;
        var div = document.createElement('div');
        div.innerHTML = buildOneMsg(m, idx);
        var node = div.firstElementChild;
        // Insert before the bottom anchor
        var anchor = document.getElementById('chat-bottom');
        if (anchor) md.insertBefore(node, anchor);
        else md.appendChild(node);
    }

    function buildOneMsg(m, idx) {
        var ts = m.ts ? fmtTime(m.ts) : '';
        if (m.role === 'user') return '<div class="chat-msg user"><div class="role">你 <span class="msg-time">'+ts+'</span></div>'+(m.image?'<img src="'+m.image+'" class="chat-img" style="max-width:160px;max-height:160px;border-radius:10px;margin-bottom:4px">':'')+'<div class="bubble">'+escHtml(m.content)+'</div></div>';

        var icon = '✦'; var name = m.model || 'assistant';
        var html = '<div class="chat-msg assistant"><div class="role"><span class="model-icon">'+icon+'</span> '+name+' <span class="msg-time">'+ts+'</span>'+(m.tokens?' <span class="tokens">'+m.tokens+' tokens</span>':'')+'</div>'+
            '<div class="msg-actions"><button class="btn-copy-msg" data-content="'+escAttr(m.content)+'" title="复制">📋</button><button class="btn-quote-msg" data-content="'+escAttr(m.content)+'" title="引用">💬</button><button class="btn-retry-msg" data-idx="'+idx+'" title="重试">🔄</button></div>';
        if (m.reasoning) html += '<div class="thinking-block done" style="margin-top:4px"><div class="thinking-header collapsed"><span>思考过程</span></div><div class="thinking-content" style="display:none">'+escHtml(m.reasoning)+'</div></div>';
        html += '<div class="bubble">'+escHtml(m.content)+'</div></div>';
        return html;
    }

    function fmtTime(ts) { var d=new Date(ts), n=new Date(); var h=d.getHours().toString().padStart(2,'0'), m=d.getMinutes().toString().padStart(2,'0'); if(d.toDateString()===n.toDateString()) return h+':'+m; return (d.getMonth()+1)+'/'+d.getDate()+' '+h+':'+m; }
    function escHtml(t) { var d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
    function escAttr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function bindActions() {
        document.querySelectorAll('.btn-copy-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();navigator.clipboard.writeText(this.dataset.content).then(function(){showToast('已复制','success')})}});
        document.querySelectorAll('.btn-quote-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();var inp=document.getElementById('chat-input');inp.value='> '+this.dataset.content.split('\n').join('\n> ')+'\n\n';inp.focus();showToast('已引用','success')}});
        document.querySelectorAll('.btn-retry-msg').forEach(function(b){ b.onclick=function(e){e.stopPropagation();retryMsg(parseInt(this.dataset.idx))}});
        document.querySelectorAll('.thinking-header').forEach(function(h){ h.onclick=function(){var c=this.nextElementSibling;c.style.display=c.style.display==='none'?'block':'none';this.classList.toggle('collapsed')}});
    }

    async function retryMsg(idx) {
        if (idx<0||idx>=messages.length||messages[idx].role!=='assistant') return;
        messages.splice(idx,1);
        var lastUser = messages.slice().reverse().find(function(m){return m.role==='user'});
        if (!lastUser) return;
        save();
        render();
        var model = lastUser._model || 'deepseek-chat';
        var img = lastUser.image ? {dataUrl: lastUser.image} : null;
        if (document.getElementById('stream-toggle').checked) await doStream(model, img);
        else await doNormal(model, img);
        save();
        render();
    }

    function render() {
        var all = messages;
        var recent = [], older = [];
        var now = Date.now();
        all.forEach(function(m){ if(m.ts && (now-m.ts)>H24) older.push(m); else recent.push(m); });
        var visible = showHistory ? all : recent;
        var hiddenCnt = all.length - visible.length;

        // Hide first, render, scroll, then show — no visual flash
        container.style.visibility = 'hidden';
        container.innerHTML =
            '<h2>AI 对话</h2><div class="card">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
            '<span style="font-size:13px;color:var(--text-secondary)">'+(all.length?all.length+' 条消息':'')+'</span>'+
            (all.length?'<button class="btn-sm" id="btn-clear">清空</button>':'')+'</div>'+
            '<div id="chat-messages">'+
            (all.length===0?'<p style="color:var(--text-tertiary);text-align:center;padding-top:160px">输入消息开始对话<br><small style="font-size:12px">支持图片 · 流式 · 推理 · 引用</small></p>':'')+
            (hiddenCnt>0&&!showHistory?'<div style="text-align:center;margin:12px 0"><button class="btn-sm" id="btn-load-history">查看更早的消息（'+hiddenCnt+' 条）</button></div>':'')+
            (showHistory&&older.length>0?'<div style="text-align:center;margin:12px 0;font-size:12px;color:var(--text-tertiary);border-bottom:1px solid var(--border);padding-bottom:8px">以下为 24 小时前的历史消息</div>':'')+
            visible.map(function(m,i){return buildOneMsg(m,messages.indexOf(m))}).join('')+
            '<div id="chat-bottom"></div>'+
            '<div id="streaming-msg" class="chat-msg assistant" style="display:none"><div class="role"><span class="model-icon">✦</span> <span id="stream-model-name">deepseek-chat</span> <span id="streaming-indicator"></span></div><div id="stream-thinking" class="thinking-block" style="display:none"><div class="thinking-header" id="thinking-toggle"><span>思考中</span><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div><div class="thinking-content" id="stream-thinking-content"></div></div><div class="bubble" id="streaming-content"></div></div>'+
            '</div>'+
            '<form id="chat-form">'+
            (pendingImage?'<div class="img-preview" id="img-preview"><img src="'+pendingImage.dataUrl+'" alt="预览"><button type="button" class="img-remove" id="img-remove">&times;</button></div>':'')+
            '<div class="chat-input-row">'+
            '<input type="text" id="chat-input" placeholder="'+(pendingImage?'描述这张图片...':'输入消息，Enter 发送')+'" autocomplete="off">'+
            '<div class="chat-toolbar">'+(isVisionModel(selectedModel)?'<button type="button" id="btn-upload" title="上传图片">🖼</button><button type="button" id="btn-link" title="粘贴链接">🔗</button>':'')+'</div>'+
            '<input type="file" id="file-input" accept="image/*" style="display:none">'+
            '<button type="submit" id="btn-send">发送</button></div>'+
            '<div class="chat-options"><label><input type="checkbox" id="stream-toggle" checked> 流式</label><label>模型 <select id="model-select"><optgroup label="DeepSeek"><option value="deepseek-chat" '+(selectedModel==='deepseek-chat'?'selected':'')+'>deepseek-chat</option><option value="deepseek-reasoner" '+(selectedModel==='deepseek-reasoner'?'selected':'')+'>deepseek-reasoner</option></optgroup><optgroup label="硅基流动"><option value="deepseek-ai/DeepSeek-V3" '+(selectedModel==='deepseek-ai/DeepSeek-V3'?'selected':'')+'>DeepSeek-V3</option><option value="deepseek-ai/DeepSeek-R1" '+(selectedModel==='deepseek-ai/DeepSeek-R1'?'selected':'')+'>DeepSeek-R1</option><option value="Qwen/Qwen2.5-72B-Instruct" '+(selectedModel==='Qwen/Qwen2.5-72B-Instruct'?'selected':'')+'>Qwen2.5-72B</option><option value="zai-org/GLM-4.6" '+(selectedModel==='zai-org/GLM-4.6'?'selected':'')+'>GLM-4.6</option></optgroup><optgroup label="阿里百炼"><option value="qwen-plus" '+(selectedModel==='qwen-plus'?'selected':'')+'>通义千问-Plus</option><option value="qwen-max" '+(selectedModel==='qwen-max'?'selected':'')+'>通义千问-Max</option></optgroup><optgroup label="智谱AI"><option value="glm-4-plus" '+(selectedModel==='glm-4-plus'?'selected':'')+'>GLM-4-Plus</option><option value="glm-4-flash" '+(selectedModel==='glm-4-flash'?'selected':'')+'>GLM-4-Flash</option></optgroup><optgroup label="火山方舟"><option value="doubao-pro-256k" '+(selectedModel==='doubao-pro-256k'?'selected':'')+'>豆包-Pro</option><option value="doubao-lite-128k" '+(selectedModel==='doubao-lite-128k'?'selected':'')+'>豆包-Lite</option></optgroup><optgroup label="Kimi"><option value="moonshot-v1-128k" '+(selectedModel==='moonshot-v1-128k'?'selected':'')+'>Kimi-128K</option></optgroup></select></label></div></form></div>';

        // Go to bottom while still hidden, then reveal
        var md2 = document.getElementById('chat-messages');
        if (md2) md2.scrollTop = md2.scrollHeight;
        container.style.visibility = 'visible';

        // Event bindings
        document.getElementById('chat-form').addEventListener('submit', handleSend);
        var upBtn=document.getElementById('btn-upload'); if(upBtn) upBtn.addEventListener('click', function(){document.getElementById('file-input').click()});
        var linkBtn=document.getElementById('btn-link'); if(linkBtn) linkBtn.addEventListener('click', function(){var u=prompt('粘贴图片链接：');if(u&&u.trim()){pendingImage={dataUrl:u.trim(),filename:'link'};render();showToast('图片链接已添加','success')}});
        var fileInp=document.getElementById('file-input'); if(fileInp) fileInp.addEventListener('change', handleFile);
        if(pendingImage) document.getElementById('img-remove').addEventListener('click',function(){pendingImage=null;document.getElementById('file-input').value='';render()});
        document.getElementById('model-select').addEventListener('change',function(){selectedModel=this.value;localStorage.setItem('chat_model',selectedModel)});
        var lb = document.getElementById('btn-load-history'); if(lb) lb.addEventListener('click',function(){showHistory=true;render()});
        var cb = document.getElementById('btn-clear'); if(cb) cb.addEventListener('click',function(){if(confirm('清空所有对话？')) clearAll()});
        bindActions();
    }

    function handleFile(e) {
        var f=e.target.files[0]; if(!f) return;
        if(!f.type.startsWith('image/')){showToast('请选择图片','error');return}
        if(f.size>20*1024*1024){showToast('图片不能超过20MB','error');return}
        // Resize large images client-side before uploading
        var reader=new FileReader();
        reader.onload=function(ev){
            var img=new Image();
            img.onload=function(){
                var maxW=1024,maxH=1024;
                var w=img.width,h=img.height;
                var maxW=512,maxH=512;
            if(w>maxW||h>maxH){var ratio=Math.min(maxW/w,maxH/h);w=Math.round(w*ratio);h=Math.round(h*ratio)}
                var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
                var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
                pendingImage={dataUrl:canvas.toDataURL('image/jpeg',0.85),filename:f.name};render();
            };
            img.src=ev.target.result;
        };
        reader.readAsDataURL(f);
    }

    async function handleSend(e) {
        e.preventDefault(); if(streaming) return;
        var inp=document.getElementById('chat-input'); var txt=inp.value.trim();
        if(!txt&&!pendingImage) return; inp.value='';
        var useStream=document.getElementById('stream-toggle').checked;
        var model=selectedModel, img=pendingImage;
        var display=txt||'描述这张图片'; pendingImage=null; document.getElementById('file-input').value='';

        if(img) messages.push({role:'user',content:display,tokens:0,image:img.dataUrl,ts:Date.now(),_model:model});
        else messages.push({role:'user',content:display,tokens:0,ts:Date.now(),_model:model});
        save(); appendMsg(messages[messages.length-1]); goBottom();

        var user=JSON.parse(localStorage.getItem('user')||'{}');
        if(!user.api_key_prefix){ messages.push({role:'assistant',model:model,content:'未找到 API Key，请前往仪表盘获取。',tokens:0,ts:Date.now()}); save(); appendMsg(messages[messages.length-1]); goBottom(); return; }

        if(useStream) await doStream(model,img); else await doNormal(model,img);
        save(); appendMsg(messages[messages.length-1]); goBottom();
    }

    function buildMsgs(image) {
        var h=messages.filter(function(m){return m.tokens!==undefined});
        return h.map(function(m){
            if(m.role==='user'&&m.image){ var p=[{type:'text',text:m.content}]; p.unshift({type:'image_url',image_url:{url:m.image}}); return {role:'user',content:p}; }
            return {role:m.role,content:m.content};
        });
    }

    async function doNormal(model, image) {
        try {
            var data=await api.post('/v1/chat/completions',{model:model,messages:buildMsgs(image)});
            var reply=data.choices[0].message.content||'', reasoning=data.choices[0].message.reasoning_content||'';
            messages.push({role:'assistant',model:model,content:reply,reasoning:reasoning,tokens:data.usage?data.usage.total_tokens:0,ts:Date.now()});
        } catch(err) {
            messages.push({role:'assistant',model:model,content:'错误：'+err.message,tokens:0,ts:Date.now()});
        }
    }

    async function doStream(model, image) {
        streaming = true;
        var sm = document.getElementById('streaming-msg');
        var sc = document.getElementById('streaming-content');
        var st = document.getElementById('stream-thinking');
        var stc = document.getElementById('stream-thinking-content');
        var tt = document.getElementById('thinking-toggle');
        var smn = document.getElementById('stream-model-name');

        sm.style.display = 'flex'; sc.textContent = ''; st.style.display = 'block'; stc.textContent = '';
        tt.classList.remove('collapsed'); smn.textContent = model;
        goBottom();

        var fullContent = '', fullReasoning = '', hasContent = false;
        try {
            var resp = await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.getToken()},body:JSON.stringify({model:model,messages:buildMsgs(image),stream:true})});
            if(!resp.ok){ var er=await resp.json().catch(function(){return{}}); throw new Error(er.detail||'HTTP '+resp.status); }
            var reader=resp.body.getReader(), decoder=new TextDecoder();
            while(true){ var r=await reader.read(); if(r.done) break;
                var text=decoder.decode(r.value,{stream:true});
                text.split('\n').forEach(function(line){
                    if(line.startsWith('data: ')&&!line.includes('[DONE]')){
                        try{
                            var obj=JSON.parse(line.slice(6)), delta=obj.choices?.[0]?.delta||{};
                            var chunk=delta.content||'', reasoningChunk=delta.reasoning_content||'';
                            if(reasoningChunk){ fullReasoning+=reasoningChunk; stc.textContent=fullReasoning; }
                            if(chunk){ if(!hasContent){ hasContent=true; tt.classList.add('collapsed'); stc.style.display='none'; } fullContent+=chunk; sc.textContent=fullContent; goBottom(); }
                        }catch(e){}
                    }
                });
            }
        } catch(err) { fullContent='错误：'+err.message; showToast(err.message,'error'); }
        streaming = false;
        sm.style.display = 'none';
        messages.push({role:'assistant',model:model,content:fullContent||'（无响应）',reasoning:fullReasoning||'',tokens:0,ts:Date.now()});
    }

    load(); render();
    return {unmount:function(){}};
});
