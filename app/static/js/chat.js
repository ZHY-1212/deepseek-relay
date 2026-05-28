registerRoute('#/chat', (container) => {
    let messages = [];
    let streaming = false;

    function render() {
        container.innerHTML = `
            <h2>Chat</h2>
            <div class="card">
                <div id="chat-messages">
                    ${messages.length === 0 ? '<p style="color:var(--pico-muted-color);text-align:center">Send a message to start chatting with DeepSeek</p>' : ''}
                    ${messages.map(m => `
                    <div class="chat-msg ${m.role}">
                        <div class="role">${m.role} ${m.tokens ? '<span class="tokens">' + m.tokens + ' tokens</span>' : ''}</div>
                        <div class="content">${escapeHtml(m.content)}</div>
                    </div>
                    `).join('')}
                    <div id="streaming-msg" class="chat-msg assistant" style="display:none">
                        <div class="role">assistant <span id="streaming-indicator">streaming...</span></div>
                        <div class="content" id="streaming-content"></div>
                    </div>
                </div>
                <form id="chat-form">
                    <fieldset role="group">
                        <input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off">
                        <button type="submit" id="btn-send" class="contrast">Send</button>
                    </fieldset>
                    <div style="display:flex;gap:1rem;align-items:center;margin-top:0.5rem">
                        <label style="display:flex;align-items:center;gap:0.3rem">
                            <input type="checkbox" id="stream-toggle"> Stream
                        </label>
                        <label>Model
                            <select id="model-select">
                                <option value="deepseek-chat">deepseek-chat</option>
                                <option value="deepseek-reasoner">deepseek-reasoner</option>
                            </select>
                        </label>
                    </div>
                </form>
            </div>
        `;

        setTimeout(() => {
            const msgDiv = document.getElementById('chat-messages');
            msgDiv.scrollTop = msgDiv.scrollHeight;
        }, 50);

        document.getElementById('chat-form').addEventListener('submit', handleSend);
    }

    async function handleSend(e) {
        e.preventDefault();
        if (streaming) return;
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        const stream = document.getElementById('stream-toggle').checked;
        const model = document.getElementById('model-select').value;

        messages.push({ role: 'user', content, tokens: 0 });
        render();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const apiKeyPrefix = user.api_key_prefix || '';

        if (!apiKeyPrefix) {
            messages.push({ role: 'assistant', content: 'No API key found. Please go to Dashboard to get one.', tokens: 0 });
            render();
            return;
        }

        if (stream) {
            await handleStream(content, model);
        } else {
            await handleNormal(content, model);
        }
        render();
    }

    async function handleNormal(content, model) {
        const body = {
            model,
            messages: messages.filter(m => m.tokens !== undefined).map(m => ({ role: m.role, content: m.content })),
        };
        try {
            const data = await api.post('/v1/chat/completions', body);
            const reply = data.choices[0].message.content;
            const tokens = data.usage ? data.usage.total_tokens : 0;
            messages.push({ role: 'assistant', content: reply, tokens });
        } catch (err) {
            messages.push({ role: 'assistant', content: 'Error: ' + err.message, tokens: 0 });
        }
    }

    async function handleStream(content, model) {
        streaming = true;
        const streamMsg = document.getElementById('streaming-msg');
        const streamContent = document.getElementById('streaming-content');
        const indicator = document.getElementById('streaming-indicator');
        streamMsg.style.display = 'block';
        indicator.classList.add('active');
        streamContent.textContent = '';

        const body = {
            model,
            messages: messages.filter(m => m.tokens !== undefined).map(m => ({ role: m.role, content: m.content })),
            stream: true,
        };
        let fullContent = '';

        try {
            const resp = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.getToken()}`,
                },
                body: JSON.stringify(body),
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
            fullContent = 'Error: ' + err.message;
            showToast(err.message, 'error');
        }

        streaming = false;
        indicator.classList.remove('active');
        streamMsg.style.display = 'none';
        messages.push({ role: 'assistant', content: fullContent || '(empty response)', tokens: 0 });
    }

    render();
    return { unmount() {} };
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
