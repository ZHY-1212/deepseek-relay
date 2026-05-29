registerRoute('#/chat', (container) => {
    let messages = [];
    let streaming = false;
    let pendingImage = null;
    let showHistory = false;

    const STORAGE_KEY = 'chat_messages';
    const H24 = 24 * 60 * 60 * 1000;
    const modelIcons = { 'deepseek-chat': '✦', 'deepseek-reasoner': '◈' };

    function saveMessages() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e) {}
    }

    function loadMessages() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) messages = JSON.parse(raw);
        } catch(e) { messages = []; }
    }

    function clearMessages() {
        messages = [];
        showHistory = false;
        saveMessages();
        render();
    }

    // Split messages by 24h
    function getSplitMessages() {
        const now = Date.now();
        const recent = [];
        const older = [];
        for (const m of messages) {
            if (m.ts && (now - m.ts) > H24) {
                older.push(m);
            } else {
                recent.push(m);
            }
        }
        return { recent, older };
    }

    function render() {
        const { recent, older } = getSplitMessages();
        const visible = showHistory ? messages : recent;
        const hiddenCount = messages.length - visible.length;

        container.innerHTML = `
            <h2>AI 对话</h2>
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span style="font-size:13px;color:var(--text-secondary)">
                        ${messages.length ? messages.length + ' 条消息' : ''}
                    </span>
                    <div style="display:flex;gap:6px">
                        ${messages.length ? '<button class="btn-sm" id="btn-clear" title="清空对话">清空</button>' : ''}
                    </div>
                </div>
                <div id="chat-messages">
                    ${messages.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding-top:160px">输入消息开始与 DeepSeek 对话<br><small style="font-size:12px;color:var(--text-tertiary)">支持图片识别 · 流式输出 · 思考推理 · 引用回复</small></p>' : ''}
                    ${hiddenCount > 0 && !showHistory ? `
                    <div style="text-align:center;margin:12px 0">
                        <button class="btn-sm" id="btn-load-history" style="font-size:13px;padding:8px 20px">
                            查看更早的消息（${hiddenCount} 条）
                        </button>
                    </div>` : ''}
                    ${showHistory && older.length > 0 ? `
                    <div style="text-align:center;margin:12px 0;font-size:12px;color:var(--text-tertiary);border-bottom:1px solid var(--border);padding-bottom:8px">
                        以下为 24 小时前的历史消息
                    </div>` : ''}
                    ${visible.map(m => renderMessage(m)).join('')}
                    <div id="streaming-msg" class="chat-msg assistant" style="display:none">
                        <div class="role">
                            <span class="model-icon" id="stream-model-icon">✦</span>
                            <span id="stream-model-name">deepseek-chat</span>
                            <span id="streaming-indicator"></span>
                        </div>
                        <div id="stream-thinking" class="thinking-block" style="display:none">
                            <div class="thinking-header" id="thinking-toggle">
                                <span>思考中</span><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
                            </div>
                            <div class="thinking-content" id="stream-thinking-content"></div>
                        </div>
                        <div class="bubble" id="streaming-content"></div>
                    </div>
                </div>
                <form id="chat-form">
                    ${pendingImage ? `
                    <div class="img-preview" id="img-preview">
                        <img src="${pendingImage.dataUrl}" alt="预览">
                        <button type="button" class="img-remove" id="img-remove">&times;</button>
                    </div>` : ''}
                    <div class="chat-input-row">
                        <input type="text" id="chat-input" placeholder="${pendingImage ? '描述这张图片...' : '输入消息，Enter 发送'}" autocomplete="off">
                        <button type="button" class="btn-upload" id="btn-upload" title="上传图片">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                        <input type="file" id="file-input" accept="image/*" style="display:none">
                        <button type="submit" id="btn-send">发送</button>
                    </div>
                    <div class="chat-options">
                        <label><input type="checkbox" id="stream-toggle" checked> 流式</label>
                        <label>模型 <select id="model-select">
                            <option value="deepseek-chat">${modelIcons['deepseek-chat']} deepseek-chat</option>
                            <option value="deepseek-reasoner">${modelIcons['deepseek-reasoner']} deepseek-reasoner</option>
                        </select></label>
                    </div>
                </form>
            </div>
        `;

        setTimeout(() => {
            const msgDiv = document.getElementById('chat-messages');
            if (msgDiv) msgDiv.scrollTo({ top: msgDiv.scrollHeight, behavior: 'smooth' });
            document.getElementById('chat-input')?.focus();
        }, 100);

        document.getElementById('chat-form').addEventListener('submit', handleSend);
        document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        if (pendingImage) document.getElementById('img-remove').addEventListener('click', handleRemoveImage);

        // Load history button
        const loadBtn = document.getElementById('btn-load-history');
        if (loadBtn) loadBtn.addEventListener('click', () => { showHistory = true; render(); });

        // Clear button
        const clearBtn = document.getElementById('btn-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => {
            if (confirm('确认清空所有对话记录？')) clearMessages();
        });

        // Copy + Quote buttons
        document.querySelectorAll('.btn-copy-msg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = btn.dataset.content;
                navigator.clipboard.writeText(content).then(() => showToast('已复制', 'success'));
            });
        });
        document.querySelectorAll('.btn-quote-msg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = btn.dataset.content;
                const input = document.getElementById('chat-input');
                input.value = '> ' + content.split('\n').join('\n> ') + '\n\n';
                input.focus();
                showToast('已引用，输入你的问题后发送', 'success');
            });
        });
        document.querySelectorAll('.btn-retry-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                // Remove last assistant message and resend
                if (idx >= 0 && idx < messages.length && messages[idx].role === 'assistant') {
                    messages.splice(idx, 1);
                    const lastUser = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUser) {
                        saveMessages();
                        const model = lastUser._model || 'deepseek-chat';
                        const image = lastUser.image ? { dataUrl: lastUser.image } : null;
                        if (document.getElementById('stream-toggle').checked) {
                            await handleStream(model, image);
                        } else {
                            await handleNormal(model, image);
                        }
                        saveMessages();
                        render();
                    }
                }
            });
        });

        // Thinking toggle
        document.querySelectorAll('.thinking-header').forEach(h => {
            h.addEventListener('click', () => {
                const content = h.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                h.classList.toggle('collapsed');
            });
        });
    }

    function renderMessage(m, idx) {
        const ts = m.ts ? formatTime(m.ts) : '';
        const actualIdx = idx !== undefined ? idx : messages.indexOf(m);

        if (m.role === 'user') {
            return `
            <div class="chat-msg user">
                <div class="role">你 <span class="msg-time">${ts}</span></div>
                ${m.image ? `<img src="${m.image}" class="chat-img" style="max-width:240px;max-height:240px;border-radius:10px;margin-bottom:4px">` : ''}
                <div class="bubble">${escapeHtml(m.content)}</div>
            </div>`;
        }

        const icon = modelIcons[m.model] || '✦';
        const modelName = m.model || 'assistant';
        let html = `
        <div class="chat-msg assistant">
            <div class="role">
                <span class="model-icon">${icon}</span> ${modelName}
                <span class="msg-time">${ts}</span>
                ${m.tokens ? '<span class="tokens">' + m.tokens + ' tokens</span>' : ''}
            </div>
            <div class="msg-actions">
                <button class="btn-copy-msg" data-content="${escapeAttr(m.content)}" title="复制">📋</button>
                <button class="btn-quote-msg" data-content="${escapeAttr(m.content)}" title="引用回复">💬</button>
                <button class="btn-retry-msg" data-idx="${actualIdx}" title="重新生成">🔄</button>
            </div>`;

        if (m.reasoning) {
            html += `
            <div class="thinking-block done" style="margin-top:4px">
                <div class="thinking-header collapsed"><span>思考过程</span></div>
                <div class="thinking-content" style="display:none">${escapeHtml(m.reasoning)}</div>
            </div>`;
        }
        html += `<div class="bubble">${escapeHtml(m.content)}</div></div>`;
        return html;
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const h = d.getHours().toString().padStart(2,'0');
        const m = d.getMinutes().toString().padStart(2,'0');
        if (isToday) return h + ':' + m;
        return (d.getMonth()+1) + '/' + d.getDate() + ' ' + h + ':' + m;
    }

    function escapeAttr(s) {
        return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
        if (file.size > 20 * 1024 * 1024) { showToast('图片不能超过 20MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = () => { pendingImage = { dataUrl: reader.result, filename: file.name }; render(); };
        reader.readAsDataURL(file);
    }

    function handleRemoveImage() {
        pendingImage = null;
        document.getElementById('file-input').value = '';
        render();
    }

    async function handleSend(e) {
        e.preventDefault();
        if (streaming) return;
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content && !pendingImage) return;

        input.value = '';
        const useStream = document.getElementById('stream-toggle').checked;
        const model = document.getElementById('model-select').value;
        const image = pendingImage;
        const displayText = content || '描述这张图片';
        pendingImage = null;
        document.getElementById('file-input').value = '';

        if (image) {
            messages.push({ role: 'user', content: displayText, tokens: 0, image: image.dataUrl, ts: Date.now(), _model: model });
        } else {
            messages.push({ role: 'user', content: displayText, tokens: 0, ts: Date.now(), _model: model });
        }
        saveMessages();
        render();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.api_key_prefix) {
            messages.push({ role: 'assistant', model: model, content: '未找到 API Key，请前往仪表盘获取。', tokens: 0, ts: Date.now() });
            saveMessages();
            render();
            return;
        }

        if (useStream) { await handleStream(model, image); }
        else { await handleNormal(model, image); }
        saveMessages();
        render();
    }

    function buildMessages(image) {
        const history = messages.filter(m => m.tokens !== undefined);
        const msgs = [];
        for (const m of history) {
            if (m.role === 'user' && m.image) {
                const parts = [{ type: 'text', text: m.content }];
                parts.unshift({ type: 'image_url', image_url: { url: m.image } });
                msgs.push({ role: 'user', content: parts });
            } else {
                msgs.push({ role: m.role, content: m.content });
            }
        }
        return msgs;
    }

    async function handleNormal(model, image) {
        const msgs = buildMessages(image);
        try {
            const data = await api.post('/v1/chat/completions', { model, messages: msgs });
            const msg = data.choices[0].message;
            const reply = msg.content || '';
            const reasoning = msg.reasoning_content || '';
            const tokens = data.usage ? data.usage.total_tokens : 0;
            messages.push({ role: 'assistant', model: model, content: reply, reasoning: reasoning, tokens: tokens, ts: Date.now() });
        } catch (err) {
            messages.push({ role: 'assistant', model: model, content: '错误：' + err.message, tokens: 0, ts: Date.now() });
        }
    }

    async function handleStream(model, image) {
        streaming = true;
        const streamMsg = document.getElementById('streaming-msg');
        const streamContent = document.getElementById('streaming-content');
        const streamModelIcon = document.getElementById('stream-model-icon');
        const streamModelName = document.getElementById('stream-model-name');
        const streamThinking = document.getElementById('stream-thinking');
        const streamThinkingContent = document.getElementById('stream-thinking-content');
        const thinkingToggle = document.getElementById('thinking-toggle');

        streamMsg.style.display = 'flex';
        streamModelIcon.textContent = modelIcons[model] || '✦';
        streamModelName.textContent = model;
        streamContent.textContent = '';
        streamThinking.style.display = 'block';
        streamThinkingContent.textContent = '';
        thinkingToggle.classList.remove('collapsed');

        const msgs = buildMessages(image);
        let fullContent = '';
        let fullReasoning = '';
        let hasContent = false;

        try {
            const resp = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.getToken()}` },
                body: JSON.stringify({ model, messages: msgs, stream: true }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${resp.status}`);
            }
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                for (const line of text.split('\n')) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const obj = JSON.parse(line.slice(6));
                            const delta = obj.choices?.[0]?.delta || {};
                            const chunk = delta.content || '';
                            const reasoningChunk = delta.reasoning_content || '';

                            if (reasoningChunk) {
                                fullReasoning += reasoningChunk;
                                streamThinkingContent.textContent = fullReasoning;
                                streamThinkingContent.scrollTop = streamThinkingContent.scrollHeight;
                            }
                            if (chunk) {
                                if (!hasContent) {
                                    hasContent = true;
                                    thinkingToggle.classList.add('collapsed');
                                    streamThinkingContent.style.display = 'none';
                                }
                                fullContent += chunk;
                                streamContent.textContent = fullContent;
                            }
                            const msgDiv = document.getElementById('chat-messages');
                            const atBottom = msgDiv.scrollTop + msgDiv.clientHeight >= msgDiv.scrollHeight - 60;
                            msgDiv.scrollTop = msgDiv.scrollHeight;
                        } catch(e) {}
                    }
                }
            }
        } catch (err) {
            fullContent = '错误：' + err.message;
            showToast(err.message, 'error');
        }

        streaming = false;
        streamMsg.style.display = 'none';
        if (!hasContent) thinkingToggle.classList.add('collapsed');
        messages.push({
            role: 'assistant', model: model,
            content: fullContent || '（无响应）',
            reasoning: fullReasoning || '',
            tokens: 0, ts: Date.now(),
        });
    }

    loadMessages();
    render();
    return { unmount() {} };
});
