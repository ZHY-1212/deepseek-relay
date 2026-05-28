registerRoute('#/chat', (container) => {
    let messages = [];
    let streaming = false;
    let pendingImage = null; // { dataUrl, filename }

    function render() {
        container.innerHTML = `
            <h2>AI 对话</h2>
            <div class="card">
                <div id="chat-messages">
                    ${messages.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding-top:160px">输入消息开始与 DeepSeek 对话<br><small style="font-size:0.8rem">支持上传图片进行视觉分析</small></p>' : ''}
                    ${messages.map(m => `
                    <div class="chat-msg ${m.role}">
                        <div class="role">${m.role === 'user' ? '你' : 'AI'} ${m.tokens ? '<span class="tokens">' + m.tokens + ' tokens</span>' : ''}</div>
                        ${m.image ? `<img src="${m.image}" class="chat-img" style="max-width:280px;max-height:280px;border-radius:12px;margin-bottom:0.3rem">` : ''}
                        <div class="bubble">${escapeHtml(m.content)}</div>
                    </div>
                    `).join('')}
                    <div id="streaming-msg" class="chat-msg assistant" style="display:none">
                        <div class="role">AI <span id="streaming-indicator"></span></div>
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </button>
                        <input type="file" id="file-input" accept="image/*" style="display:none">
                        <button type="submit" id="btn-send">发送</button>
                    </div>
                    <div class="chat-options">
                        <label><input type="checkbox" id="stream-toggle"> 流式输出</label>
                        <label>模型 <select id="model-select">
                            <option value="deepseek-chat">deepseek-chat</option>
                            <option value="deepseek-reasoner">deepseek-reasoner</option>
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
        if (pendingImage) {
            document.getElementById('img-remove').addEventListener('click', handleRemoveImage);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
        if (file.size > 20 * 1024 * 1024) { showToast('图片不能超过 20MB', 'error'); return; }

        const reader = new FileReader();
        reader.onload = () => {
            pendingImage = { dataUrl: reader.result, filename: file.name };
            render();
        };
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
        const stream = document.getElementById('stream-toggle').checked;
        const model = document.getElementById('model-select').value;
        const image = pendingImage;

        pendingImage = null;
        document.getElementById('file-input').value = '';

        // Build message with optional image
        if (image) {
            messages.push({
                role: 'user',
                content: content || '描述这张图片',
                tokens: 0,
                image: image.dataUrl,
            });
        } else {
            messages.push({ role: 'user', content, tokens: 0 });
        }
        render();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.api_key_prefix) {
            messages.push({ role: 'assistant', content: '未找到 API Key，请前往仪表盘获取。', tokens: 0 });
            render();
            return;
        }

        if (stream) { await handleStream(content || '描述这张图片', model, image); }
        else { await handleNormal(content || '描述这张图片', model, image); }
        render();
    }

    function buildMessages(text, image) {
        const history = messages.filter(m => m.tokens !== undefined);
        const msgs = [];

        for (const m of history) {
            if (m.role === 'user' && m.image) {
                // Multimodal format for image messages
                const parts = [{ type: 'text', text: m.content }];
                parts.unshift({ type: 'image_url', image_url: { url: m.image } });
                msgs.push({ role: 'user', content: parts });
            } else {
                msgs.push({ role: m.role, content: m.content });
            }
        }

        // The last message (current one) is already in messages, so msgs should cover it
        return msgs;
    }

    async function handleNormal(text, model, image) {
        const msgs = buildMessages(text, image);
        try {
            const data = await api.post('/v1/chat/completions', { model, messages: msgs });
            const reply = data.choices[0].message.content;
            const tokens = data.usage ? data.usage.total_tokens : 0;
            messages.push({ role: 'assistant', content: reply, tokens });
        } catch (err) {
            messages.push({ role: 'assistant', content: '错误：' + err.message, tokens: 0 });
        }
    }

    async function handleStream(text, model, image) {
        streaming = true;
        const streamMsg = document.getElementById('streaming-msg');
        const streamContent = document.getElementById('streaming-content');
        streamMsg.style.display = 'flex';
        streamContent.textContent = '';

        const msgs = buildMessages(text, image);
        let fullContent = '';

        try {
            const resp = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.getToken()}`,
                },
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
                            const chunk = obj.choices?.[0]?.delta?.content || '';
                            fullContent += chunk;
                            streamContent.textContent = fullContent;
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
        messages.push({ role: 'assistant', content: fullContent || '（无响应）', tokens: 0 });
    }

    render();
    return { unmount() {} };
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
