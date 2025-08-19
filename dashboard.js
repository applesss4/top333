// 全局变量
let currentUser = null;
let scheduleData = [];
let currentPage = 1;
let itemsPerPage = 10;
let editingScheduleId = null;

// API配置 - 根据环境动态设置
const VIKA_CONFIG = {
    // 检测是否为本地开发环境
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    get baseURL() {
        if (this.isDevelopment) {
            return 'http://localhost:3001/api';
        } else {
            // 生产环境使用相对路径，指向Vercel无服务器函数
            return '/api';
        }
    },
    
    scheduleTable: 'work_schedule'
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    bindEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// 初始化页面
function initializePage() {
    // 检查登录状态
    const userData = localStorage.getItem('userData');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    document.getElementById('currentUser').textContent = currentUser.username || '管理员';
    
    // 加载工作日程数据
    loadScheduleData();
    
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('workDate').value = today;
}

// 绑定事件监听器
function bindEventListeners() {
    // 侧边栏导航
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            handleNavigation(e);
            // 在移动端点击导航后关闭菜单
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
    
    // 移动端菜单切换
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // 窗口大小变化监听
    window.addEventListener('resize', handleWindowResize);
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // 快速操作按钮
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    
    // 添加日程按钮（修复误传事件对象问题）
    document.getElementById('addScheduleBtn').addEventListener('click', () => openScheduleModal(null));
    
    // 筛选器
    document.getElementById('storeFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // 模态框相关
    document.getElementById('modalClose').addEventListener('click', closeScheduleModal);
    document.getElementById('cancelBtn').addEventListener('click', closeScheduleModal);
    document.getElementById('scheduleForm').addEventListener('submit', handleScheduleSubmit);
    
    // 确认删除模态框
    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // 点击模态框外部关闭
    document.getElementById('scheduleModal').addEventListener('click', function(e) {
        if (e.target === this) closeScheduleModal();
    });
    
    document.getElementById('confirmModal').addEventListener('click', function(e) {
        if (e.target === this) closeConfirmModal();
    });
    
    // 时间验证
    document.getElementById('startTime').addEventListener('change', validateTimeRange);
    document.getElementById('endTime').addEventListener('change', validateTimeRange);
}

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

// 处理导航
function handleNavigation(e) {
    e.preventDefault();
    const targetSection = e.target.closest('a').dataset.section;
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.target.closest('.nav-item').classList.add('active');
    
    // 显示对应内容
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(targetSection + '-section').classList.add('active');
    
    // 更新页面标题
    const titles = {
        dashboard: '仪表盘',
        schedule: '工作日程',
        rooms: '房间管理',
        staff: '员工管理',
        settings: '系统设置'
    };
    document.getElementById('pageTitle').textContent = titles[targetSection] || '管理后台';
    
    // 如果是工作日程页面，刷新数据
    if (targetSection === 'schedule') {
        loadScheduleData();
    }
}

// 切换移动端菜单
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || createSidebarOverlay();
    
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    
    // 防止背景滚动
    if (sidebar.classList.contains('mobile-open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// 创建侧边栏遮罩层
function createSidebarOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeMobileMenu);
    document.body.appendChild(overlay);
    return overlay;
}

// 关闭移动端菜单
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }
}

// 处理窗口大小变化
function handleWindowResize() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
}

// 处理退出登录
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    }
}

// 处理快速操作
function handleQuickAction(e) {
    const action = e.target.closest('button').dataset.action;
    
    switch (action) {
        case 'add-schedule':
            openScheduleModal(null); // 明确传递 null 避免事件对象误传
            break;
        case 'view-schedule':
            // 切换到工作日程页面
            document.querySelector('[data-section="schedule"]').click();
            break;
    }
}

// 加载工作日程数据
async function loadScheduleData() {
    try {
        showLoading();
        const response = await fetch(`${VIKA_CONFIG.baseURL}/schedule`);
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const data = await response.json();
        scheduleData = data.records || [];
        
        renderScheduleTable();
        updateDashboardStats();
        hideLoading();
        
    } catch (error) {
        console.error('加载工作日程数据失败:', error);
        showMessage('加载数据失败，请检查网络连接', 'error');
        hideLoading();
    }
}

// 渲染工作日程表格
function renderScheduleTable() {
    const tbody = document.getElementById('scheduleTableBody');
    
    if (scheduleData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3>暂无工作日程</h3>
                    <p>点击"添加日程"按钮创建第一条工作记录</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // 应用筛选和分页
    const filteredData = applyFiltersToData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(schedule => {
        const workDate = new Date(schedule.workDate);
        const weekDay = getWeekDay(workDate);
        const duration = calculateDuration(schedule.startTime, schedule.endTime);
        const storeName = getStoreName(schedule.workStore);
        
        return `
            <tr>
                <td><span class="store-badge ${schedule.workStore}">${storeName}</span></td>
                <td>${schedule.workDate}</td>
                <td>${weekDay}</td>
                <td>${schedule.startTime}</td>
                <td>${schedule.endTime}</td>
                <td><span class="duration-badge ${getDurationClass(duration)}">${duration}小时</span></td>
                <td>${schedule.notes || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="editSchedule('${schedule.id}')">编辑</button>
                        <button class="action-btn delete-btn" onclick="deleteSchedule('${schedule.id}')">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // 更新分页
    renderPagination(filteredData.length);
}

// 应用筛选条件
function applyFiltersToData() {
    const storeFilter = document.getElementById('storeFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    return scheduleData.filter(schedule => {
        const storeMatch = !storeFilter || schedule.workStore === storeFilter || (Array.isArray(schedule.workStore) && schedule.workStore.includes(storeFilter));
        const dateMatch = !dateFilter || schedule.workDate === dateFilter;
        return storeMatch && dateMatch;
    });
}

// 应用筛选器
function applyFilters() {
    currentPage = 1;
    renderScheduleTable();
}

// 重置筛选器
function resetFilters() {
    document.getElementById('storeFilter').value = '';
    document.getElementById('dateFilter').value = '';
    currentPage = 1;
    renderScheduleTable();
}

// 渲染分页
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            上一页
        </button>
    `;
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    // 下一页按钮
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            下一页
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    currentPage = page;
    renderScheduleTable();
}

// 打开日程模态框
function openScheduleModal(scheduleId = null) {
    // 防御：若误传入事件对象，则视为新增模式
    if (scheduleId && typeof scheduleId === 'object' && 'target' in scheduleId) {
        scheduleId = null;
    }
    const modal = document.getElementById('scheduleModal');
    const form = document.getElementById('scheduleForm');
    const title = document.getElementById('modalTitle');
    
    editingScheduleId = scheduleId;
    
    if (scheduleId) {
        // 编辑模式
        title.textContent = '编辑工作日程';
        const schedule = scheduleData.find(s => s.id === scheduleId);
        if (schedule) {
            // 处理 workStore 字段（可能是字符串或数组）
            let storeValue = schedule.workStore;
            if (Array.isArray(storeValue)) {
                // 如果是数组，取第一个值作为选中项
                storeValue = storeValue[0] || '';
            }
            document.getElementById('workStore').value = storeValue;
            document.getElementById('workDate').value = schedule.workDate;
            document.getElementById('startTime').value = schedule.startTime;
            document.getElementById('endTime').value = schedule.endTime;
            document.getElementById('notes').value = schedule.notes || '';
        }
    } else {
        // 新增模式
        title.textContent = '添加工作日程';
        form.reset();
        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('workDate').value = today;
    }
    
    modal.classList.add('active');
}

// 关闭日程模态框
function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    modal.classList.remove('active');
    editingScheduleId = null;
    document.getElementById('scheduleForm').reset();
}

// 处理日程表单提交
async function handleScheduleSubmit(e) {
    e.preventDefault();
    
    // 清除之前的错误
    clearFormErrors();
    
    const formData = new FormData(e.target);
    const scheduleData = {
        workStore: formData.get('workStore'),
        workDate: formData.get('workDate'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        notes: formData.get('notes') || ''
    };
    
    // 验证时间范围
    let hasErrors = false;
    
    if (!scheduleData.workStore) {
        showFormError('workStore', '请选择工作店铺');
        hasErrors = true;
    }
    
    if (!scheduleData.workDate) {
        showFormError('workDate', '请选择工作日期');
        hasErrors = true;
    }
    
    if (!scheduleData.startTime) {
        showFormError('startTime', '请选择开始时间');
        hasErrors = true;
    }
    
    if (!scheduleData.endTime) {
        showFormError('endTime', '请选择结束时间');
        hasErrors = true;
    }
    
    // 时间范围验证
    if (scheduleData.startTime && scheduleData.endTime) {
        const startTime = new Date(`2000-01-01T${scheduleData.startTime}`);
        const endTime = new Date(`2000-01-01T${scheduleData.endTime}`);
        
        if (startTime >= endTime) {
            showFormError('endTime', '结束时间必须晚于开始时间');
            hasErrors = true;
        }
    }
    
    if (hasErrors) {
        return;
    }
    
    try {
        showLoading();
        
        let response;
        let url;
        let method;
        
        // 将日期转换为UTC时间戳格式（维格表要求）
        const workDateUTC = new Date(scheduleData.workDate + 'T00:00:00.000Z').getTime();
        scheduleData.workDate = workDateUTC;
        
        // 计算工作时长并添加到提交数据中
        const duration = calculateDuration(scheduleData.startTime, scheduleData.endTime);
        scheduleData.duration = duration;
        
        if (editingScheduleId) {
            // 更新现有记录
            url = `${VIKA_CONFIG.baseURL}/schedule/${editingScheduleId}`;
            method = 'PUT';
        } else {
            // 创建新记录
            url = `${VIKA_CONFIG.baseURL}/schedule`;
            method = 'POST';
        }
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '保存失败');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // 关闭模态框
            closeScheduleModal();
            
            // 显示成功消息
            showMessage(editingScheduleId ? '日程更新成功！' : '日程添加成功！', 'success');
            
            // 重新加载数据
            await loadScheduleData();
        } else {
            throw new Error(result.message || '保存失败');
        }
        
    } catch (error) {
        console.error('保存日程失败:', error);
        showMessage(error.message || '保存失败，请检查网络连接并重试', 'error');
    } finally {
        hideLoading();
    }
}

// 编辑日程
function editSchedule(scheduleId) {
    openScheduleModal(scheduleId);
}

// 删除日程
function deleteSchedule(scheduleId) {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('active');
    
    // 设置删除确认回调
    window.pendingDeleteId = scheduleId;
}

// 关闭确认模态框
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('active');
    window.pendingDeleteId = null;
}

// 确认删除
async function confirmDelete() {
    if (!window.pendingDeleteId) return;
    
    try {
        const response = await fetch(`${VIKA_CONFIG.baseURL}/schedule/${window.pendingDeleteId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        showMessage('日程删除成功', 'success');
        closeConfirmModal();
        loadScheduleData();
        
    } catch (error) {
        console.error('删除日程失败:', error);
        showMessage('删除失败，请重试', 'error');
    }
}

// 验证时间范围
function validateTimeRange() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (startTime && endTime && startTime >= endTime) {
        showMessage('结束时间必须晚于开始时间', 'error');
        return false;
    }
    
    return true;
}

// 计算工作时长
function calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10; // 保留一位小数
}

// 获取星期几
function getWeekDay(date) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
}

// 获取店铺名称
function getStoreName(storeCode) {
    const storeNames = {
        main: '主店',
        branch1: '分店1',
        branch2: '分店2'
    };
    
    // 处理数组格式（维格表多选字段返回数组）
    if (Array.isArray(storeCode)) {
        return storeCode.map(code => storeNames[code] || code).join(', ');
    }
    
    return storeNames[storeCode] || storeCode;
}

// 获取工作时长样式类
function getDurationClass(duration) {
    if (duration >= 10) return 'long';
    if (duration >= 6) return 'normal';
    return '';
}

// 更新仪表盘统计数据
function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = getWeekStart(new Date());
    const thisWeekEnd = getWeekEnd(new Date());
    
    // 计算今日工作时长
    const todaySchedules = scheduleData.filter(s => s.workDate === today);
    const todayHours = todaySchedules.reduce((total, schedule) => {
        return total + calculateDuration(schedule.startTime, schedule.endTime);
    }, 0);
    
    // 计算本周工作时长
    const weekSchedules = scheduleData.filter(s => {
        const scheduleDate = new Date(s.workDate);
        return scheduleDate >= thisWeekStart && scheduleDate <= thisWeekEnd;
    });
    const weekHours = weekSchedules.reduce((total, schedule) => {
        return total + calculateDuration(schedule.startTime, schedule.endTime);
    }, 0);
    
    document.getElementById('todayWorkHours').textContent = `${todayHours}小时`;
    document.getElementById('weekWorkHours').textContent = `${weekHours}小时`;
}

// 获取本周开始日期
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
    return new Date(d.setDate(diff));
}

// 获取本周结束日期
function getWeekEnd(date) {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
}

// 显示加载状态
function showLoading() {
    const tbody = document.getElementById('scheduleTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                正在加载数据...
            </td>
        </tr>
    `;
}

// 隐藏加载状态
function hideLoading() {
    // 检查是否存在加载状态的行，如果存在则移除
    const tbody = document.getElementById('scheduleTableBody');
    const loadingRow = tbody.querySelector('tr td.loading');
    if (loadingRow) {
        loadingRow.parentElement.remove();
    }
}

// 显示消息
function showMessage(message, type = 'success') {
    // 移除现有消息
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 插入到内容区域顶部
    const contentWrapper = document.querySelector('.content-wrapper');
    contentWrapper.insertBefore(messageDiv, contentWrapper.firstChild);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 导出函数供HTML调用
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
window.changePage = changePage;

// 优化移动端表单交互
function optimizeMobileFormInputs() {
    // 为日期和时间输入框设置移动端优化属性
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="time"]');
    dateInputs.forEach(input => {
        input.setAttribute('inputmode', 'none');
        input.style.fontSize = '16px'; // 防止iOS缩放
    });
    
    // 为选择框设置移动端优化
    const selectInputs = document.querySelectorAll('select');
    selectInputs.forEach(select => {
        select.style.fontSize = '16px';
        if (window.innerWidth <= 768) {
            select.setAttribute('size', '1');
        }
    });
    
    // 为文本区域设置移动端优化
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.style.fontSize = '16px';
        if (window.innerWidth <= 768) {
            textarea.style.resize = 'none';
        }
    });
}

// 显示表单错误信息
function showFormError(fieldName, message) {
    clearFormErrors();
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '5px';
        
        field.parentNode.appendChild(errorDiv);
        field.style.borderColor = '#e74c3c';
        
        // 移动端滚动到错误字段
        if (window.innerWidth <= 768) {
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// 清除表单错误信息
function clearFormErrors() {
    const errors = document.querySelectorAll('.form-error');
    errors.forEach(error => error.remove());
    
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });
}