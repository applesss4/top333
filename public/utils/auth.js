// JWT认证工具函数
class AuthUtils {
    // 获取存储的JWT token
    static getToken() {
        return localStorage.getItem('authToken');
    }

    // 设置JWT token
    static setToken(token) {
        localStorage.setItem('authToken', token);
    }

    // 移除JWT token
    static removeToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }

    // 检查用户是否已登录
    static isLoggedIn() {
        const token = this.getToken();
        const userData = localStorage.getItem('userData');
        return !!(token && userData);
    }

    // 获取当前用户信息
    static getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // 设置当前用户信息
    static setCurrentUser(userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
    }

    // 创建带有认证头的请求选项
    static createAuthHeaders(additionalHeaders = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // 发送带认证的API请求
    static async authenticatedFetch(url, options = {}) {
        const headers = this.createAuthHeaders(options.headers);
        
        const response = await fetch(url, {
            ...options,
            headers
        });

        // 如果返回401未授权，清除本地token并重定向到登录页
        if (response.status === 401) {
            this.removeToken();
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = '/index.html';
            }
            throw new Error('认证失败，请重新登录');
        }

        return response;
    }
    
    // fetchWithAuth作为authenticatedFetch的别名，保持兼容性
    static async fetchWithAuth(url, options = {}) {
        return this.authenticatedFetch(url, options);
    }

    // 检查token是否过期
    static isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;

        try {
            // 简单的JWT解码（仅用于检查过期时间）
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch (error) {
            console.error('Token解析失败:', error);
            return true;
        }
    }

    // 自动刷新token（如果需要的话）
    static async refreshTokenIfNeeded() {
        if (this.isTokenExpired()) {
            this.removeToken();
            return false;
        }
        return true;
    }

    // 登出
    static logout() {
        this.removeToken();
        window.location.href = '/index.html';
    }
}

// 页面加载时检查认证状态
if (typeof window !== 'undefined') {
    // 检查是否在需要认证的页面
    const protectedPages = ['/dashboard.html'];
    const currentPath = window.location.pathname;
    
    if (protectedPages.includes(currentPath)) {
        document.addEventListener('DOMContentLoaded', () => {
            if (!AuthUtils.isLoggedIn() || AuthUtils.isTokenExpired()) {
                AuthUtils.logout();
            }
        });
    }
}

// 导出给其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUtils;
} else if (typeof window !== 'undefined') {
    window.AuthUtils = AuthUtils;
}