registerRoute('#/login', function(container) {
    var tab = 'login';
    function render() {
        container.innerHTML = '<div class="auth-page">'+
            '<div class="geo geo-1"></div><div class="geo geo-2"></div><div class="geo geo-3"></div><div class="geo geo-4"></div><div class="geo geo-5"></div>'+
            '<div class="auth-card" style="position:relative;z-index:1">' +
            '<div class="auth-icon"><svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#6366f1"/><path d="M24 8c-7 0-13 6-14 12-1 3-1 8 2 11 3 3 8 3 12 2 5-1 10-5 13-10 3-5 2-9-1-12-3-3-8-3-12-3z" fill="#fff" opacity=".25"/><circle cx="17" cy="20" r="2.5" fill="#fff"/><path d="M26 18c2-2 7-4 9-4" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></div>' +
            '<h1>DS Relay</h1><p class="subtitle">多模型 AI API 聚合平台<br>一个 Key 调用所有主流大模型</p>' +
            '<div class="tabs"><button id="tab-login" class="'+(tab==='login'?'active':'')+'">登录</button><button id="tab-register" class="'+(tab==='register'?'active':'')+'">注册</button></div>' +
            '<form id="auth-form">' +
            (tab==='register' ?
                '<div class="input-group"><label>用户名</label><input type="text" id="username" placeholder="你的用户名" required autocomplete="username"></div>' +
                '<div class="input-group"><label>邮箱</label><input type="email" id="email" placeholder="your@email.com" required autocomplete="email"></div>' :
                '<div class="input-group"><label>账户</label><input type="text" id="account" placeholder="用户名或邮箱" required autocomplete="username"></div>') +
            '<div class="input-group"><label>密码</label><input type="password" id="password" placeholder="输入密码" required autocomplete="current-password"></div>' +
            '<div id="form-error" class="error"></div>' +
            '<button type="submit" class="btn-submit">'+(tab==='login'?'登 录':'创建账户')+'</button>' +
            '</form>' +
            '<p class="footer-note">'+(tab==='login'?'还没有账户？点击「注册」':'已有账户？点击「登录」')+'<br>注册即表示同意 <a href="#/pricing" style="color:var(--accent)">服务条款</a></p>' +
            '</div></div>';
        document.getElementById('tab-login').addEventListener('click',function(){tab='login';render()});
        document.getElementById('tab-register').addEventListener('click',function(){tab='register';render()});
        document.getElementById('auth-form').addEventListener('submit',handleSubmit);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        var errEl=document.getElementById('form-error');
        errEl.style.display='none';
        var pw=document.getElementById('password').value;
        try {
            var data;
            if(tab==='register') {
                data=await api.post('/auth/register',{username:document.getElementById('username').value,email:document.getElementById('email').value,password:pw});
            } else {
                data=await api.post('/auth/login',{account:document.getElementById('account').value,password:pw});
            }
            api.setToken(data.access_token);
            localStorage.setItem('user',JSON.stringify(data.user));
            if(data.api_key) localStorage.setItem('new_api_key',data.api_key);
            window.location.hash='#/models';
        } catch(err) { errEl.textContent=err.message; errEl.style.display='block'; }
    }
    render();
    return {unmount:function(){}};
});
