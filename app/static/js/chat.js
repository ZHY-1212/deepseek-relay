registerRoute('#/chat', (container) => {
    let messages = [];
    let streaming = false;
    let pendingImage = null;

    const modelIcons = {
        'deepseek-chat': '✦',
        'deepseek-reasoner': '◈',
    };

    function render() {
        container.innerHTML = `
            <h2>AI 对话</h2>
            <div class="card">
                <div id="chat-messages">
                    ${messages.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding-top:160px">输入消息开始与 DeepSeek 对话<br><small style="font-size:12px;color:var(--text-tertiary)">支持上传图片 · 深度推理 · 流式输出</small></p>' : ''}
                    ${messages.map(m => renderMessage(m)).join('')}
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
                        <input type="text" id="chat-input" placeholder="${pendingImage ? '描述这张图片...' : '输入你的问题...'}" autocomplete="off">
                        <button type="button" class="btn-upload" id="btn-upload" title="上传图片">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </button>
                        <input type="file" id="file-input" accept="image/*" style="display:none">
                        <button type="submit" id="btn-send">发送</button>
                    </div>
                    <div class="chat-options">
                        <label><input type="checkbox" id="stream-toggle"> 流式输出</label>
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
            msgDiv.scrollTop = msgDiv.scrollHeight;
        }, 50);

        document.getElementById('chat-form').addEventListener('submit', handleSend);
        document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        if (pendingImage) document.getElementById('img-remove').addEventListener('click', handleRemoveImage);

        // Click to expand/collapse thinking
        document.querySelectorAll('.thinking-header').forEach(h => {
            h.addEventListener('click', () => {
                const content = h.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                h.classList.toggle('collapsed');
            });
        });
    }

    function renderMessage(m) {
        if (m.role === 'user') {
            return `
            <div class="chat-msg user">
                <div class="role">你</div>
                ${m.image ? `<img src="${m.image}" class="chat-img" style="max-width:240px;max-height:240px;border-radius:10px;margin-bottom:4px">` : ''}
                <div class="bubble">${escapeHtml(m.content)}</div>
            </div>`;
        }
        // Assistant message
        const icon = modelIcons[m.model] || '✦';
        const modelName = m.model || 'assistant';
        let html = `
        <div class="chat-msg assistant">
            <div class="role">
                <span class="model-icon">${icon}</span> ${modelName}
                ${m.tokens ? '<span class="tokens">' + m.tokens + ' tokens</span>' : ''}
            </div>`;
        if (m.reasoning) {
            html += `
            <div class="thinking-block done">
                <div class="thinking-header collapsed">
                    <span>思考过程</span>
                </div>
                <div class="thinking-content" style="display:none">${escapeHtml(m.reasoning)}</div>
            </div>`;
        }
        html += `<div class="bubble">${escapeHtml(m.content)}</div></div>`;
        return html;
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
        const displayContent = content || '描述这张图片';
        pendingImage = null;
        document.getElementById('file-input').value = '';

        if (image) {
            messages.push({ role: 'user', content: displayContent, tokens: 0, image: image.dataUrl });
        } else {
            messages.push({ role: 'user', content: displayContent, tokens: 0 });
        }
        render();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.api_key_prefix) {
            messages.push({ role: 'assistant', model: model, content: '未找到 API Key，请前往仪表盘获取。', tokens: 0 });
            render();
            return;
        }

        if (useStream) { await handleStream(model, image); }
        else { await handleNormal(model, image); }
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
            messages.push({ role: 'assistant', model: model, content: reply, reasoning: reasoning, tokens: tokens });
        } catch (err) {
            messages.push({ role: 'assistant', model: model, content: '错误：' + err.message, tokens: 0 });
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
                                // Auto-scroll thinking area
                                streamThinkingContent.scrollTop = streamThinkingContent.scrollHeight;
                            }

                            if (chunk) {
                                if (!hasContent) {
                                    // First content chunk: collapse thinking
                                    hasContent = true;
                                    thinkingToggle.classList.add('collapsed');
                                    streamThinkingContent.style.display = 'none';
                                }
                                fullContent += chunk;
                                streamContent.textContent = fullContent;
                            }
                            const msgDiv = document.getElementById('chat-messages');
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
        // Collapse thinking
        if (!hasContent) thinkingToggle.classList.add('collapsed');
        messages.push({
            role: 'assistant', model: model,
            content: fullContent || '（无响应）',
            reasoning: fullReasoning || '',
            tokens: 0,
        });
    }

    render();
    return { unmount() {} };
});
