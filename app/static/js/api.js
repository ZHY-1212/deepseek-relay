const API_BASE = '';

const api = {
    getToken() {
        return localStorage.getItem('jwt_token');
    },

    setToken(token) {
        localStorage.setItem('jwt_token', token);
    },

    clearToken() {
        localStorage.removeItem('jwt_token');
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const opts = { method, headers };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        const resp = await fetch(API_BASE + path, opts);
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            if (resp.status === 401) {
                this.clearToken();
                window.location.hash = '#/login';
                throw new Error('登录已过期，请重新登录');
            }
            const msg = data.detail || data.message || `HTTP ${resp.status}`;
            throw new Error(msg);
        }
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },

    logout() {
        this.clearToken();
        window.location.hash = '#/login';
    }
};
