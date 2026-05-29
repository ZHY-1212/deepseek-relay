// Desktop Pet - Whale Mascot
(function() {
    var messages = [
        '你好！有什么可以帮你？',
        '试试模型广场，有好多模型哦~',
        'DeepSeek 代码能力国产第一！',
        '记得去控制台看用量~',
        '流式输出更丝滑！',
        '点击我可以拖拽移动~',
        '双击我试试看！',
        '累了就切换深色主题吧',
    ];

    var pet = document.createElement('div');
    pet.id = 'desktop-pet';
    pet.innerHTML = '<div class="pet-body"><svg width="52" height="52" viewBox="0 0 64 64"><ellipse cx="32" cy="36" rx="24" ry="18" fill="#6366f1"/><ellipse cx="32" cy="34" rx="22" ry="16" fill="#818cf8"/><circle cx="20" cy="32" r="4" fill="#fff"/><circle cx="21" cy="31" r="2" fill="#1e1b4b"/><circle cx="40" cy="32" r="4" fill="#fff"/><circle cx="41" cy="31" r="2" fill="#1e1b4b"/><path d="M28 38 Q32 42 36 38" stroke="#4f46e5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 28 Q6 22 8 16 Q14 18 16 24" fill="#818cf8" opacity="0.8"/><path d="M52 28 Q58 22 56 16 Q50 18 48 24" fill="#818cf8" opacity="0.8"/><ellipse cx="14" cy="18" rx="6" ry="3" fill="#c7d2fe" opacity="0.6"/></svg></div><div class="pet-bubble"></div>';

    document.body.appendChild(pet);

    var bubble = pet.querySelector('.pet-bubble');
    var isDragging = false;
    var startX, startY, petX, petY;
    var bubbleTimer;
    var idleTimer;
    var clickCount = 0;

    // Position
    pet.style.position = 'fixed';
    pet.style.bottom = '20px';
    pet.style.right = '20px';
    pet.style.zIndex = '9998';
    pet.style.cursor = 'grab';
    pet.style.userSelect = 'none';
    pet.style.transition = 'transform .3s ease';

    // Bubble style
    bubble.style.cssText = 'position:absolute;bottom:70px;right:0;background:var(--bg-card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:8px 14px;font-size:12.5px;color:var(--text,#0f172a);white-space:nowrap;opacity:0;transform:translateY(8px);transition:all .25s ease;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.1);font-family:var(--font);max-width:200px;white-space:normal';

    function showBubble(msg) {
        bubble.textContent = msg;
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function() {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(8px)';
        }, 4000);
    }

    function randomMessage() {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Idle animation
    function idleAnim() {
        pet.style.transform = 'translateY(-6px)';
        setTimeout(function() { pet.style.transform = 'translateY(0)'; }, 1200);
        idleTimer = setTimeout(idleAnim, 3000 + Math.random() * 4000);
    }
    idleAnim();

    // Random speech
    function randomSpeak() {
        if (Math.random() > 0.5) showBubble(randomMessage());
        setTimeout(randomSpeak, 15000 + Math.random() * 30000);
    }
    setTimeout(randomSpeak, 8000);

    // Click
    pet.addEventListener('click', function(e) {
        if (isDragging) return;
        clickCount++;
        if (clickCount === 2) {
            // Double click
            pet.style.transform = 'scale(1.3) rotate(15deg)';
            setTimeout(function() { pet.style.transform = 'scale(1) rotate(0)'; }, 300);
            showBubble('哎呀！别戳我~');
            clickCount = 0;
        } else {
            pet.style.transform = 'translateY(-12px)';
            setTimeout(function() { pet.style.transform = 'translateY(0)'; }, 200);
            showBubble(randomMessage());
        }
        setTimeout(function() { clickCount = 0; }, 400);
    });

    // Drag
    pet.addEventListener('mousedown', function(e) {
        isDragging = true;
        pet.style.cursor = 'grabbing';
        pet.style.transition = 'none';
        startX = e.clientX;
        startY = e.clientY;
        var rect = pet.getBoundingClientRect();
        petX = rect.left;
        petY = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
        pet.style.left = (petX + dx) + 'px';
        pet.style.top = (petY + dy) + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        pet.style.cursor = 'grab';
        pet.style.transition = 'transform .3s ease';
    });

    // Touch drag
    pet.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        var rect = pet.getBoundingClientRect();
        petX = rect.left;
        petY = rect.top;
    });
    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
        pet.style.left = (petX + dx) + 'px';
        pet.style.top = (petY + dy) + 'px';
    });
    document.addEventListener('touchend', function() { isDragging = false; });

    // Hover scale
    pet.addEventListener('mouseenter', function() { if (!isDragging) pet.style.transform = 'scale(1.08)'; });
    pet.addEventListener('mouseleave', function() { if (!isDragging) pet.style.transform = 'scale(1)'; });
})();
