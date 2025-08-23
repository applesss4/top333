// 数字时钟功能
function updateClock() {
    const now = new Date();
    
    // 格式化时间
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // 格式化日期 - 中文版本
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', 
                   '7月', '8月', '9月', '10月', '11月', '12月'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    const dateString = `${year}年${monthName}${date}日 ${dayName}`;
    
    // 更新DOM元素
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// API配置 - 根据环境动态设置
const API_CONFIG = {
    get baseURL() {
        // 生产环境和开发环境都使用相对路径，指向无服务器函数
        return '/api';
    }
};

// Supabase 配置
const SUPABASE_CONFIG = {
    url: 'https://paumgahictuhluhuudws.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdW1nYWhpY3R1aGx1aHV1ZHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTE0NzYsImV4cCI6MjA3MTQ4NzQ3Nn0.caf1r6TUgDyUFSYf3l-AuYyOAUffTzXfI5HV2rcJR_U'
};

// 前端不再存放维格表密钥信息，所有维格表访问均通过后端API进行
// 完全依赖后端维格表API
const isVikaConfigured = true;

// 测试维格表连接 - 使用缓存和重试机制
const testVikaConnection = PerformanceUtils.debounce(async function() {
    const cacheKey = 'vika_connection_test';
    
    // 检查缓存
    const cached = PerformanceUtils.apiCache.get(cacheKey);
    if (cached !== null) {
        console.log('🎯 使用缓存的连接状态');
        PerformanceUtils.performanceMonitor.recordCacheHit();
        return cached;
    }
    
    try {
        const startTime = Date.now();
        const response = await PerformanceUtils.retryRequest(async () => {
            return await fetch(`${API_CONFIG.baseURL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
        }, 2, 1000);
        
        const responseTime = Date.now() - startTime;
        PerformanceUtils.performanceMonitor.recordApiCall(responseTime);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 维格表连接成功！', data.message || data);
            PerformanceUtils.apiCache.set(cacheKey, true);
            return true;
        }
        console.warn('❌ 维格表连接失败，状态码:', response.status);
        PerformanceUtils.apiCache.set(cacheKey, false);
        return false;
    } catch (error) {
        console.warn('❌ 维格表连接测试出错:', error?.message || error);
        PerformanceUtils.performanceMonitor.recordError();
        PerformanceUtils.apiCache.set(cacheKey, false);
        return false;
    }
}, 1000);

// DOM元素变量声明
let loginForm, registerForm;
// 防止重复绑定事件监听器
let eventsBound = false;

// 使用Web Crypto API进行密码加密
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt123'); // 添加简单的盐值
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
async function verifyPassword(password, hashedPassword) {
    const inputHash = await hashPassword(password);
    return inputHash === hashedPassword;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('页面加载完成，使用Web Crypto API进行密码加密');
    
    // 仅在配置了维格表且需要时才测试连接
    if (isVikaConfigured) {
        console.log('维格表已配置，将在需要时测试连接');
    } else {
        console.log('维格表连接测试失败');
    }
    
    // 启动数字时钟
    updateClock(); // 立即更新一次
    setInterval(updateClock, 1000); // 每秒更新一次
    
    // 登录按钮点击事件
    const loginToggleBtn = document.getElementById('loginToggleBtn');
    const loginOverlay = document.getElementById('loginOverlay');
    const mainClockSection = document.querySelector('.main-clock-section');
    
    if (loginToggleBtn && loginOverlay && mainClockSection) {
        loginToggleBtn.addEventListener('click', function() {
            // 显示登录窗口，隐藏时钟
            loginOverlay.style.display = 'flex';
            mainClockSection.style.display = 'none';
        });
        
        // 点击覆盖层背景关闭登录窗口
        loginOverlay.addEventListener('click', function(e) {
            if (e.target === loginOverlay) {
                // 隐藏登录窗口，显示时钟
                loginOverlay.style.display = 'none';
                mainClockSection.style.display = 'flex';
            }
        });
    }
    
    // 添加时钟和登录窗口的交互效果
    setTimeout(() => {
        // 时钟点击效果
        const clockDisplay = document.querySelector('.clock-display');
        if (clockDisplay) {
            clockDisplay.addEventListener('click', function() {
                this.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            });
        }
        
        // 登录窗口动画
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.style.opacity = '0';
            loginContainer.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                loginContainer.style.transition = 'all 0.6s ease';
                loginContainer.style.opacity = '1';
                loginContainer.style.transform = 'translateY(0)';
            }, 300);
        }
        
        // 登录表单处理统一使用handleLogin函数
        // 移除重复的登录处理逻辑，统一在bindEventListeners中处理
    }, 100);
    
    // 初始化星空动画（如果存在画布）
    initStarfield();
    
    // DOM元素获取
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    loginLink = document.getElementById('loginLink');
    registerLink = document.getElementById('registerLink');
    welcomeSection = document.getElementById('welcomeSection');
    welcomeMessage = document.getElementById('welcomeMessage');
    logoutBtn = document.getElementById('logoutBtn');
    loginSection = document.querySelector('.login-section');
    
    // 检查DOM元素是否存在
    console.log('DOM元素检查:', {
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        loginLink: !!loginLink,
        registerLink: !!registerLink,
        welcomeSection: !!welcomeSection,
        welcomeMessage: !!welcomeMessage,
        logoutBtn: !!logoutBtn,
        loginSection: !!loginSection
    });
    
    // 检查是否已登录
    // 移除了checkLoginStatus调用，因为现在登录状态通过登录表单直接处理
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 绑定创建账户链接事件
    const createAccountLink = document.getElementById('createAccountLink');
    if (createAccountLink) {
        createAccountLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
        console.log('创建账户链接事件已绑定');
    }
    
    // 绑定返回登录链接事件
    const backToLoginLink = document.getElementById('backToLoginLink');
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
        console.log('返回登录链接事件已绑定');
    }
    
    // 注册表单提交事件已在bindEventListeners()中处理
    
    // 添加性能监控显示（开发环境）
    if (API_CONFIG.isDevelopment) {
        addPerformanceMonitor();
    }
});

// 添加性能监控显示
function addPerformanceMonitor() {
    const monitorDiv = document.createElement('div');
    monitorDiv.id = 'performance-monitor';
    monitorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        min-width: 200px;
        cursor: pointer;
    `;
    
    function updateMonitor() {
        const stats = PerformanceUtils.performanceMonitor.getStats();
        monitorDiv.innerHTML = `
            <div><strong>性能监控</strong></div>
            <div>API调用: ${stats.apiCalls}</div>
            <div>缓存命中: ${stats.cacheHits}</div>
            <div>命中率: ${stats.cacheHitRate}</div>
            <div>错误数: ${stats.errors}</div>
            <div>平均响应: ${stats.averageResponseTime.toFixed(0)}ms</div>
            <div>缓存大小: ${PerformanceUtils.apiCache.size()}</div>
            <div style="margin-top: 5px; font-size: 10px; color: #ccc;">点击清除缓存</div>
        `;
    }
    
    // 点击清除缓存
    monitorDiv.addEventListener('click', () => {
        PerformanceUtils.apiCache.clear();
        PerformanceUtils.performanceMonitor.reset();
        updateMonitor();
        console.log('🧹 缓存和统计已清除');
    });
    
    document.body.appendChild(monitorDiv);
    
    // 每5秒更新一次
    updateMonitor();
    setInterval(updateMonitor, 5000);
}

// 简易星空动画
function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.max(300, Math.floor(rect.width));
        canvas.height = Math.max(240, Math.floor(rect.height));
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({length: 120}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 0.7 + 0.3, // 速度/亮度
        r: Math.random() * 1.4 + 0.3
    }));

    function step() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
            // 漂移
            s.x -= s.z * 0.6;
            s.y += Math.sin((s.x + s.y) * 0.002) * 0.2;
            // 循环
            if (s.x < -5) {
                s.x = canvas.width + Math.random() * 20;
                s.y = Math.random() * canvas.height;
                s.z = Math.random() * 0.7 + 0.3;
            }
            const alpha = 0.6 + s.z * 0.4;
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}
// 绑定事件监听器
function bindEventListeners() {
    console.log('开始绑定事件监听器');

    // 避免重复绑定
    if (eventsBound) {
        console.log('事件监听器已绑定，跳过重复绑定');
        return;
    }

    // 只在元素存在时绑定事件
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('登录表单事件已绑定');
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('注册表单事件已绑定');
    }

    // 切换到注册表单
    const registerLink = document.querySelector('.create-account-link');
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            console.log('注册链接被点击');
            e.preventDefault();
            showRegisterForm();
        });
        console.log('注册链接事件已绑定');
    }

    // 切换到登录表单
    const loginLink = document.querySelector('.back-to-login');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            console.log('登录链接被点击');
            e.preventDefault();
            showLoginForm();
        });
        console.log('登录链接事件已绑定');
    }

    // 密码显示/隐藏按钮事件
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            togglePasswordVisibility(this.dataset.target);
        });
    });
    console.log('密码显示按钮事件已绑定');

    console.log('所有事件监听器绑定完成');
    eventsBound = true;
}

// 显示注册表单
// 切换表单显示
function toggleForm(showRegister) {
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');
    
    if (loginFormContainer && registerFormContainer) {
        loginFormContainer.style.display = showRegister ? 'none' : 'block';
        registerFormContainer.style.display = showRegister ? 'block' : 'none';
    }
    
    if (loginForm && registerForm) {
        loginForm.style.display = showRegister ? 'none' : 'block';
        registerForm.style.display = showRegister ? 'block' : 'none';
    }
}

// 显示注册表单
function showRegisterForm() {
    toggleForm(true);
}

// 显示登录表单
function showLoginForm() {
    toggleForm(false);
}

// 切换密码可见性
function togglePasswordVisibility(targetId) {
    const passwordInput = document.getElementById(targetId);
    const toggleButton = document.querySelector(`[data-target="${targetId}"]`);
    const eyeIcon = toggleButton.querySelector('.eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // 更改为闭眼图标
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        passwordInput.type = 'password';
        // 更改为睁眼图标
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// 防止重复提交的标志
let isLoggingIn = false;

// 处理登录
async function handleLogin(e) {
    e.preventDefault();

    // 防止重复提交
    if (isLoggingIn) {
        console.log('登录正在进行中，忽略重复提交');
        return;
    }
    // 一旦进入提交流程，立即置为进行中，避免并发触发导致重复日志
    isLoggingIn = true;

    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

    console.log('登录尝试:', { username: username || '(空)', hasPassword: !!password });

    if (!username || !password) {
        showMessage('请填写用户名和密码', 'error');
        isLoggingIn = false; // 早返回前重置标志
        return;
    }

    // 显示加载状态
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading"></span> 登录中...';
    submitBtn.disabled = true;

    try {
        // 验证用户登录
        const user = await validateUser(username, password);
        console.log('用户验证结果:', user);

        if (user) {
            // 登录成功，保存用户信息和JWT token
            const userData = {
                username: username,
                email: user.email,
                id: user.id,
                loginTime: new Date().toISOString()
            };
            
            // 使用AuthUtils保存用户信息和JWT token
            AuthUtils.setCurrentUser(userData);
            if (user.token) {
                AuthUtils.setToken(user.token);
                console.log('JWT token已保存');
            }
            
            console.log('用户数据已保存:', userData);

            showMessage('登录成功！正在跳转...', 'success');

            // 跳转到管理后台页面
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 500);

            console.log('用户登录成功:', user);
        } else {
            console.log('登录失败: 用户名或密码错误');
            showMessage('用户名或密码错误', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        // 根据错误类型显示不同的错误信息
        let errorMessage = '登录失败，请稍后重试';
        if (error.message) {
            if (error.message.includes('服务器暂时不可用')) {
                errorMessage = '服务器暂时不可用，请稍后重试';
            } else if (error.message.includes('网络')) {
                errorMessage = '网络连接失败，请检查网络后重试';
            } else {
                errorMessage = error.message;
            }
        }
        showMessage(errorMessage, 'error');
    } finally {
        // 恢复按钮状态和重复提交标志
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        isLoggingIn = false;
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    // 表单验证
    if (!username || !email || !password || !confirmPassword) {
        showMessage('请填写所有字段', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('两次输入的密码不一致', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('密码长度至少6位', 'error');
        return;
    }
    
    // 显示加载状态
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading"></span> 注册中...';
    submitBtn.disabled = true;
    
    try {
        // 创建新用户
        const result = await createUser(username, email, password);
        
        if (result && result.success) {
            // 清空表单
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirmPassword').value = '';
            // 先显示成功消息，然后延迟切换到登录界面
            showMessage('注册成功！请登录', 'success');
            setTimeout(() => {
                showLoginForm();
            }, 1500); // 1.5秒后切换到登录界面，让用户看到成功消息
        } else {
            showMessage(result?.message || '注册失败，请稍后重试', 'error');
        }
    } catch (error) {
        console.error('注册错误:', error);
        // 如果是后端返回的错误，显示具体错误消息
        if (error.isBackendError) {
            showMessage(error.message || '注册失败，请稍后重试', 'error');
        } else {
            showMessage('网络错误，请检查连接后重试', 'error');
        }
    } finally {
        // 恢复按钮
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 验证用户登录（通过后端API）
async function validateUser(username, password) {
    const requestKey = `validate_${username}`;
    
    return await PerformanceUtils.requestDeduplicator.request(requestKey, async () => {
        try {
            const startTime = Date.now();
            const response = await PerformanceUtils.retryRequest(async () => {
                return await fetch(`${API_CONFIG.baseURL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
            }, 3, 2000); // 增加重试次数和间隔
            
            const responseTime = Date.now() - startTime;
            PerformanceUtils.performanceMonitor.recordApiCall(responseTime);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return {
                        id: data.user.id,
                        username: data.user.username,
                        email: data.user.email,
                        token: data.token
                    };
                } else {
                    // 响应成功但业务逻辑失败
                    console.log('登录失败:', data.message || '用户名或密码错误');
                    return null;
                }
            }
            
            // 处理错误响应
            if (response.status === 401) {
                console.log('用户名或密码错误');
                return null;
            } else if (response.status >= 500) {
                console.error('服务器内部错误，请稍后重试');
                throw new Error('服务器暂时不可用，请稍后重试');
            } else {
                console.error('登录失败:', response.status);
                return null;
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            PerformanceUtils.performanceMonitor.recordError();
            throw error;
        }
    });
}

// 用户验证功能
// 检查用户是否存在
const checkUserExists = PerformanceUtils.debounce(async function(username) {
    const cacheKey = `user_exists_${username}`;
    
    // 检查缓存
    const cached = PerformanceUtils.apiCache.get(cacheKey);
    if (cached !== null) {
        console.log('🎯 使用缓存的用户存在状态');
        PerformanceUtils.performanceMonitor.recordCacheHit();
        return cached;
    }
    
    const requestKey = `check_user_${username}`;
    
    return await PerformanceUtils.requestDeduplicator.request(requestKey, async () => {
        try {
            const startTime = Date.now();
            const response = await PerformanceUtils.retryRequest(async () => {
                return await fetch(`${API_CONFIG.baseURL}/users/check/${username}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }, 3, 1500); // 增加重试次数和间隔
            
            const responseTime = Date.now() - startTime;
            PerformanceUtils.performanceMonitor.recordApiCall(responseTime);
            
            if (response.ok) {
                const data = await response.json();
                const exists = data.exists || false;
                PerformanceUtils.apiCache.set(cacheKey, exists);
                return exists;
            } else {
                console.error('检查用户存在性失败:', response.status);
                // 对于检查用户存在性，如果API失败，默认返回false（不存在）
                // 这样可以允许用户继续注册流程，由后端API最终验证
                PerformanceUtils.apiCache.set(cacheKey, false);
                return false;
            }
        } catch (error) {
            console.error('检查用户存在性请求失败:', error);
            PerformanceUtils.performanceMonitor.recordError();
            // 网络错误时默认返回false，让后端API处理重复用户名的情况
            PerformanceUtils.apiCache.set(cacheKey, false);
            return false;
        }
    });
}, 300);

// 创建用户（通过后端API）
async function createUser(username, email, password) {
    const requestKey = `create_user_${username}`;
    
    return await PerformanceUtils.requestDeduplicator.request(requestKey, async () => {
        try {
            // 检查用户是否已存在
            const userExists = await checkUserExists(username);
            if (userExists) {
                return {
                    success: false,
                    message: '用户名已存在，请选择其他用户名'
                };
            }
            
            const startTime = Date.now();
            const response = await PerformanceUtils.retryRequest(async () => {
                return await fetch(`${API_CONFIG.baseURL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                });
            }, 3, 2000); // 增加重试次数和间隔
            
            const responseTime = Date.now() - startTime;
            PerformanceUtils.performanceMonitor.recordApiCall(responseTime);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 清除相关缓存
                    PerformanceUtils.apiCache.delete(`user_exists_${username}`);
                    console.log('Supabase创建用户成功:', data);
                    // 处理两种可能的数据结构：data.data.user 或 data.user
                    const userData = data.data?.user || data.user;
                    const tokenData = data.data?.token || data.token;
                    
                    if (userData && userData.id) {
                        return {
                            success: true,
                            user: {
                                id: userData.id,
                                username: userData.username,
                                email: userData.email
                            },
                            token: tokenData
                        };
                    } else {
                        console.error('用户数据格式错误:', data);
                        return {
                            success: false,
                            message: '用户数据格式错误'
                        };
                    }
                } else {
                    // 响应成功但业务逻辑失败
                    return {
                        success: false,
                        message: data.message || '注册失败'
                    };
                }
            }
            
            // 处理错误响应
            const errorData = await response.json().catch(() => ({ message: '创建用户失败' }));
            if (response.status === 400) {
                return {
                    success: false,
                    message: errorData.message || '请求参数错误'
                };
            } else if (response.status >= 500) {
                console.error('服务器内部错误');
                throw new Error('服务器暂时不可用，请稍后重试');
            } else {
                return {
                    success: false,
                    message: errorData.message || '创建用户失败'
                };
            }
        } catch (error) {
            console.error('创建用户请求失败:', error);
            PerformanceUtils.performanceMonitor.recordError();
            throw error;
        }
     });
}

// 检查登录状态
// 移除了不再使用的checkLoginStatus、showWelcomeSection和handleLogout函数

// 移除了未使用的handleCreateAccount函数，现在统一使用handleRegister

// 显示消息
function showMessage(message, type) {
    console.log('显示消息:', message, type);
    
    // 移除现有消息
    const existingMessage = document.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    // 基于可见容器选择插入位置，避免插入到隐藏表单中
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');
    const safeDisplay = (el) => {
        try { return el ? getComputedStyle(el).display : 'none'; } catch (_) { return 'none'; }
    };

    let targetContainer = null;
    if (registerFormContainer && safeDisplay(registerFormContainer) !== 'none') {
        targetContainer = registerFormContainer;
    } else if (loginFormContainer && safeDisplay(loginFormContainer) !== 'none') {
        targetContainer = loginFormContainer;
    }
    
    if (targetContainer) {
        targetContainer.insertBefore(messageDiv, targetContainer.firstChild);
        console.log('消息已插入到容器中');
    } else if (loginForm || registerForm) {
        // 兜底：按表单的可见性插入
        const targetForm = (loginForm && safeDisplay(loginForm) !== 'none') ? loginForm : registerForm;
        if (targetForm) {
            targetForm.insertBefore(messageDiv, targetForm.firstChild);
            console.log('消息已插入到表单中');
        } else {
            document.body.insertBefore(messageDiv, document.body.firstChild);
            console.log('消息已插入到body中');
        }
    } else {
        // 最后兜底
        document.body.insertBefore(messageDiv, document.body.firstChild);
        console.log('消息已插入到body中');
    }
    
    // 3秒后自动移除消息
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
            console.log('消息已自动移除');
        }
    }, 3000);
}

// 维格表配置说明
// 生产环境配置完成