// 维格表配置 - 请替换为您的实际配置
const VIKA_CONFIG = {
    // 维格表配置 - 请替换为您的实际配置
    apiToken: 'uskPGemFgQLFNdWMMNm8KRL', // 替换为您的维格表API Token
    datasheetId: 'dstj2Cp49ca1bXcfZ6', // 替换为您的数据表ID
    baseUrl: 'https://vika.cn/fusion/v1'
};

// 检查维格表配置是否有效
const isVikaConfigured = VIKA_CONFIG.apiToken !== 'YOUR_VIKA_API_TOKEN' && 
                        VIKA_CONFIG.datasheetId !== 'YOUR_DATASHEET_ID';

if (isVikaConfigured) {
    console.log('维格表配置已启用，将使用维格表存储数据');
} else {
    console.log('维格表未配置，将使用本地存储模拟数据库功能');
}

// DOM元素变量声明
let loginForm, registerForm, loginLink, registerLink, welcomeSection, welcomeMessage, logoutBtn, loginSection;

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
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，使用Web Crypto API进行密码加密');
    
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
    checkLoginStatus();
    
    // 绑定事件监听器
    bindEventListeners();
});

// 绑定事件监听器
function bindEventListeners() {
    console.log('开始绑定事件监听器');
    
    // 检查元素是否存在
    if (!loginForm || !registerForm || !loginLink || !registerLink) {
        console.error('关键DOM元素缺失，无法绑定事件');
        return;
    }
    
    // 登录表单提交
    loginForm.addEventListener('submit', handleLogin);
    console.log('登录表单事件已绑定');
    
    // 注册表单提交
    registerForm.addEventListener('submit', handleRegister);
    console.log('注册表单事件已绑定');
    
    // 切换到注册表单
    registerLink.addEventListener('click', function(e) {
        console.log('注册链接被点击');
        e.preventDefault();
        showRegisterForm();
    });
    console.log('注册链接事件已绑定');
    
    // 切换到登录表单
    loginLink.addEventListener('click', function(e) {
        console.log('登录链接被点击');
        e.preventDefault();
        showLoginForm();
    });
    console.log('登录链接事件已绑定');
    
    // 退出登录
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('退出按钮事件已绑定');
    }
    
    console.log('所有事件监听器绑定完成');
}

// 显示注册表单
function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
}

// 显示登录表单
function showLoginForm() {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('请填写用户名和密码', 'error');
        return;
    }
    
    // 显示加载状态
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading"></span> 登录中...';
    submitBtn.disabled = true;
    
    try {
        // 验证用户登录
        const user = await validateUser(username, password);
        
        if (user) {
            // 登录成功
            localStorage.setItem('currentUser', JSON.stringify(user));
            showWelcomeSection(user);
            showMessage('登录成功！', 'success');
        } else {
            showMessage('用户名或密码错误', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showMessage('登录失败，请稍后重试', 'error');
    } finally {
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
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
        // 先检查用户是否已存在
        const userExists = await checkUserExists(username);
        if (userExists) {
            showMessage('用户名已存在，请选择其他用户名', 'error');
            return;
        }
        
        // 创建新用户
        const newUser = await createUser(username, email, password);
        
        if (newUser) {
            registerForm.reset();
            // 先显示成功消息，然后延迟切换到登录界面
            showMessage('注册成功！请登录', 'success');
            setTimeout(() => {
                showLoginForm();
            }, 1500); // 1.5秒后切换到登录界面，让用户看到成功消息
        } else {
            showMessage('注册失败，请稍后重试', 'error');
        }
    } catch (error) {
        console.error('注册错误:', error);
        // 如果是后端返回的错误，显示具体错误消息
        if (error.isBackendError) {
            showMessage(error.message, 'error');
        } else {
            showMessage('注册失败，请稍后重试', 'error');
        }
    } finally {
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 验证用户登录（通过后端API）
async function validateUser(username, password) {
    try {
        // 优先尝试维格表API验证
        if (isVikaConfigured) {
            const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const users = data.data.records;
                
                for (const record of users) {
                    const userData = record.fields;
                    if (userData.username === username) {
                        // 验证密码
                        const isPasswordValid = await verifyPassword(password, userData.password);
                        if (isPasswordValid) {
                            return {
                                id: record.recordId,
                                username: userData.username,
                                email: userData.email
                            };
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('维格表验证失败:', error);
    }
    
    // 使用本地存储作为备用
    return await validateUserLocal(username, password);
}

// 本地存储模拟用户验证（用于演示）
async function validateUserLocal(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username);
    
    if (user) {
        const isPasswordValid = await verifyPassword(password, user.password);
        if (isPasswordValid) {
            return user;
        }
    }
    
    return null;
}

// 检查用户是否存在
async function checkUserExists(username) {
    try {
        // 优先尝试维格表API检查用户
        if (isVikaConfigured) {
            const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const users = data.data.records;
                return users.some(record => record.fields.username === username);
            }
        }
    } catch (error) {
        console.error('维格表检查用户失败:', error);
    }
    
    // 使用本地存储作为备用
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.some(user => user.username === username);
}

// 创建用户（通过后端API）
async function createUser(username, email, password) {
    try {
        // 优先尝试维格表API创建用户
        if (isVikaConfigured) {
            const hashedPassword = await hashPassword(password);
            const currentTime = new Date().toISOString();
            
            const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [{
                        fields: {
                            username: username,
                            email: email,
                            password: hashedPassword,
                            created_at: currentTime
                        }
                    }]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    username: username,
                    email: email
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || '维格表创建用户失败');
            }
        }
    } catch (error) {
        console.error('创建用户失败:', error);
        // 如果维格表API失败，使用本地存储作为备用
        const hashedPassword = await hashPassword(password);
        return createUserLocal(username, email, hashedPassword);
    }
}

// 本地存储模拟创建用户（用于演示）
function createUserLocal(username, email, hashedPassword) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const newUser = {
        id: Date.now().toString(),
        username: username,
        email: email,
        password: hashedPassword,
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return newUser;
}

// 检查登录状态
function checkLoginStatus() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        showWelcomeSection(user);
    }
}

// 显示欢迎界面
function showWelcomeSection(user) {
    loginSection.style.display = 'none';
    welcomeSection.style.display = 'block';
    welcomeMessage.textContent = `欢迎回来，${user.username}！`;
}

// 处理退出登录
function handleLogout() {
    localStorage.removeItem('currentUser');
    welcomeSection.style.display = 'none';
    loginSection.style.display = 'block';
    loginForm.reset();
    registerForm.reset();
    showLoginForm();
    showMessage('已成功退出登录', 'success');
}

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
    
    // 插入消息
    let targetForm;
    if (registerForm && registerForm.style.display !== 'none') {
        targetForm = registerForm;
    } else if (loginForm && loginForm.style.display !== 'none') {
        targetForm = loginForm;
    } else {
        // 如果都没有显示，默认使用注册表单
        targetForm = registerForm || loginForm;
    }
    
    if (targetForm) {
        targetForm.insertBefore(messageDiv, targetForm.firstChild);
        console.log('消息已插入到表单中');
    } else {
        // 备用方案：插入到body中
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
console.log(`
=== 维格表配置说明 ===
1. 请访问 https://vika.cn 注册账号
2. 创建一个新的数据表，包含以下字段：
   - username (单行文本)
   - email (单行文本)
   - password (单行文本)
   - created_at (单行文本)
3. 获取API Token和数据表ID
4. 在script.js文件中替换VIKA_CONFIG中的配置

当前使用本地存储模拟数据库功能
`);