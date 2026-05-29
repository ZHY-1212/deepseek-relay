registerRoute('#/history', (container) => {
    let data = null;
    let filters = { page: 1, size: 15, model: '', search: '' };

    async function load() {
        try {
            const params = new URLSearchParams({ page: filters.page, size: filters.size, model: filters.model, search: filters.search });
            data = await api.get('/dashboard/history?' + params);
        } catch (e) {
            container.innerHTML = `<p style="color:var(--red)">加载失败：${e.message}</p>`;
            return;
        }
        render();
    }

    function render() {
        const records = data.records || [];
        container.innerHTML = `
            <div class="page-header">
                <h2>调用记录</h2>
                <p>查看所有 API 调用历史与 Token 消耗明细</p>
            </div>

            <div class="filter-row">
                <div class="search-box" style="flex:1;min-width:180px">
                    <span style="color:var(--text-tertiary);font-size:14px">⌕</span>
                    <input type="text" id="search-input" placeholder="搜索模型或接口..." value="${escapeHtml(filters.search)}">
                </div>
                <select id="model-filter" class="styled">
                    <option value="">所有模型</option>
                    <option value="deepseek-chat" ${filters.model==='deepseek-chat'?'selected':''}>deepseek-chat</option>
                    <option value="deepseek-reasoner" ${filters.model==='deepseek-reasoner'?'selected':''}>deepseek-reasoner</option>
                </select>
                <button class="btn-outline btn" onclick="document.getElementById('search-input').value='';document.getElementById('model-filter').value='';filters.search='';filters.model='';filters.page=1;load()">重置</button>
            </div>

            <div class="card" style="padding:0;overflow:hidden">
                ${records.length === 0 ? '<p style="text-align:center;padding:60px;color:var(--text-tertiary)">暂无调用记录</p>' : `
                <table class="data-table">
                    <thead><tr><th>时间</th><th>模型</th><th>Token</th><th>接口</th><th>状态</th></tr></thead>
                    <tbody>${records.map(r => `
                        <tr class="${!r.success ? 'banned' : ''}">
                            <td style="font-size:12.5px;color:var(--text-secondary)">${r.timestamp ? r.timestamp.slice(0,19).replace('T',' ') : '-'}</td>
                            <td><span style="font-weight:550">${r.model}</span></td>
                            <td>${r.tokens_consumed.toLocaleString()}</td>
                            <td style="font-size:12.5px;color:var(--text-secondary);font-family:var(--mono)">${r.endpoint}</td>
                            <td>${r.success ? '<span style="color:var(--green);font-weight:550">成功</span>' : '<span style="color:var(--red);font-weight:550">失败</span>'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`}
            </div>

            ${data.total_pages > 1 ? buildPagination() : ''}
        `;

        document.getElementById('search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { filters.search = e.target.value; filters.page = 1; load(); }
        });
        document.getElementById('model-filter')?.addEventListener('change', (e) => {
            filters.model = e.target.value; filters.page = 1; load();
        });
    }

    function buildPagination() {
        let html = '<div class="pagination">';
        html += `<button ${filters.page <= 1 ? 'disabled' : ''} onclick="void(0)" data-pg="${filters.page-1}">◀</button>`;
        const start = Math.max(1, filters.page - 2);
        const end = Math.min(data.total_pages, filters.page + 2);
        if (start > 1) html += `<button data-pg="1">1</button><span class="page-info">…</span>`;
        for (let i = start; i <= end; i++) {
            html += `<button class="${i === filters.page ? 'active' : ''}" data-pg="${i}">${i}</button>`;
        }
        if (end < data.total_pages) html += `<span class="page-info">…</span><button data-pg="${data.total_pages}">${data.total_pages}</button>`;
        html += `<button ${filters.page >= data.total_pages ? 'disabled' : ''} data-pg="${filters.page+1}">▶</button>`;
        html += `<span class="page-info">${data.total} 条</span>`;
        html += '</div>';

        setTimeout(() => {
            document.querySelectorAll('.pagination button[data-pg]').forEach(btn => {
                btn.addEventListener('click', () => { filters.page = parseInt(btn.dataset.pg); load(); });
            });
        }, 50);
        return html;
    }

    load();
    return { unmount() {} };
});
