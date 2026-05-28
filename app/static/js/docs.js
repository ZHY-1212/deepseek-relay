registerRoute('#/docs', (container) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const apiKeyPrefix = user.api_key_prefix || 'sk-relay-xxxx';
    const baseUrl = window.location.origin;

    container.innerHTML = `
        <h2>API 文档</h2>
        <p style="color:var(--text-secondary);margin-bottom:2rem">兼容 OpenAI SDK，密钥在<a href="#/dashboard" style="color:var(--blue)">仪表盘</a>获取</p>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.5rem">快速开始</h3>
            <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary);width:100px">接口地址</td><td><code>${baseUrl}/v1/chat/completions</code></td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">认证方式</td><td>Bearer Token（API Key）</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">支持模型</td><td>deepseek-chat（支持图片）、deepseek-reasoner</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">图片限制</td><td>最大 20MB，支持 PNG/JPEG/GIF/WebP</td></tr>
                <tr><td style="padding:0.4rem 0;color:var(--text-secondary)">流式输出</td><td>支持 SSE（stream: true）</td></tr>
            </table>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">cURL</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyPrefix}" \\
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">Python</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import requests

url = "${baseUrl}/v1/chat/completions"
headers = {
    "Authorization": "Bearer ${apiKeyPrefix}",
    "Content-Type": "application/json"
}
data = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
}

resp = requests.post(url, json=data, headers=headers)
print(resp.json()["choices"][0]["message"]["content"])</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">OpenAI SDK（兼容模式）</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>from openai import OpenAI

client = OpenAI(
    api_key="${apiKeyPrefix}",
    base_url="${baseUrl}/v1"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">图片识别</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import base64, requests

with open("photo.jpg", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

data = {
    "model": "deepseek-chat",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "描述这张图片"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
        ]
    }]
}

resp = requests.post(
    "${baseUrl}/v1/chat/completions",
    json=data,
    headers={"Authorization": "Bearer ${apiKeyPrefix}"}
)
print(resp.json()["choices"][0]["message"]["content"])</code></pre>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
            <h3 style="margin-bottom:0.75rem">流式输出</h3>
            <pre style="background:rgba(0,0,0,0.03);padding:1rem;border-radius:var(--radius);overflow-x:auto;font-size:0.82rem;line-height:1.6"><code>import requests

data = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "写一首诗"}],
    "stream": True
}

resp = requests.post(
    "${baseUrl}/v1/chat/completions",
    json=data,
    headers={"Authorization": "Bearer ${apiKeyPrefix}"},
    stream=True
)

for line in resp.iter_lines():
    if line:
        text = line.decode()
        if text.startswith("data: ") and "[DONE]" not in text:
            import json
            chunk = json.loads(text[6:])
            content = chunk["choices"][0]["delta"].get("content", "")
            print(content, end="", flush=True)</code></pre>
        </div>
    `;

    return { unmount() {} };
});
