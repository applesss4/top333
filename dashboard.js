// 全局变量
let currentUser = null;
let scheduleData = [];
let currentPage = 1;
let itemsPerPage = 10;
let editingScheduleId = null;
let shopData = [];
let editingShopId = null;

// API配置 - 根据环境动态设置
const API_CONFIG = {
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    get baseURL() {
        const override = (typeof window !== 'undefined' && (window.__API_BASE_URL__ || localStorage.getItem('API_BASE_URL')));
        if (override) return override;
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            return 'http://localhost:3002/api';
        }
        if (this.isDevelopment) {
            const protocol = window.location.protocol || 'http:';
            const hostname = window.location.hostname || 'localhost';
            const port = window.location.port || '3002';
            return `${protocol}//${hostname}:${port}/api`;
        }
        return '/api';
    }
};

const VIKA_CONFIG = {
    // 保留业务表名配置（如需要）
    scheduleTable: 'work_schedule'
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    bindEventListeners();
    initializeTimeSelectors();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// 初始化时间选择器
function initializeTimeSelectors() {
    const startTimeSelect = document.getElementById('startTime');
    const endTimeSelect = document.getElementById('endTime');
    
    if (!startTimeSelect || !endTimeSelect) return;
    
    // 生成时间选项（00:00 到 23:30，每30分钟一个选项）
    const timeOptions = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeOptions.push(timeStr);
        }
    }
    
    // 清空现有选项并添加新选项
    startTimeSelect.innerHTML = '<option value="">请选择开始时间</option>';
    endTimeSelect.innerHTML = '<option value="">请选择结束时间</option>';
    
    timeOptions.forEach(time => {
        const startOption = document.createElement('option');
        startOption.value = time;
        startOption.textContent = time;
        startTimeSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = time;
        endOption.textContent = time;
        endTimeSelect.appendChild(endOption);
    });
}

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
    
    // 初始化酒店信息功能
    initializeHotelInfoEvents();
    
    // 加载工作日程数据
    loadScheduleData();
    
    // 加载店铺数据
    loadShopData();
    
    // 加载个人信息
    loadProfileData();
    
    // 加载酒店信息
    loadHotelInfo();
    
    // 绑定今日概览卡片点击事件
    const todayOverviewCard = document.getElementById('todayOverviewCard');
    if (todayOverviewCard) {
        todayOverviewCard.addEventListener('click', toggleTodayOverview);
    }
    
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
    
    // 时间验证和格式化
    document.getElementById('startTime').addEventListener('change', function() {
        formatTimeToHalfHour(this);
        validateTimeRange();
    });
    document.getElementById('endTime').addEventListener('change', function() {
        formatTimeToHalfHour(this);
        validateTimeRange();
    });
    
    // 系统设置相关事件
    document.getElementById('editProfileBtn').addEventListener('click', openProfileModal);
    document.getElementById('profileModalClose').addEventListener('click', closeProfileModal);
    document.getElementById('profileCancelBtn').addEventListener('click', closeProfileModal);
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
    
    // 店铺管理相关事件
    document.getElementById('addShopBtn').addEventListener('click', () => openShopModal());
    document.getElementById('shopModalClose').addEventListener('click', closeShopModal);
    document.getElementById('shopCancelBtn').addEventListener('click', closeShopModal);
    document.getElementById('shopForm').addEventListener('submit', handleShopSubmit);
    
    // 店铺删除确认模态框
    document.getElementById('shopConfirmCancelBtn').addEventListener('click', closeShopConfirmModal);
    document.getElementById('shopConfirmDeleteBtn').addEventListener('click', confirmShopDelete);
    
    // 绑定周导航事件
    document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
        navigateWeek(-1);
    });
    
    document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
        navigateWeek(1);
    });
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
        const response = await fetch(`${API_CONFIG.baseURL}/schedule`);
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const data = await response.json();
        scheduleData = data.records || [];
        
        renderScheduleTable();
        updateDashboardStats();
        
        // 初始化周日程
        initializeWeeklySchedule();
        
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
        
        // 格式化日期显示（处理时间戳转换）
        let formattedDate;
        if (typeof schedule.workDate === 'number') {
            const date = new Date(schedule.workDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
        } else {
            formattedDate = schedule.workDate;
        }
        
        return `
            <tr>
                <td><span class="store-badge ${schedule.workStore}">${storeName}</span></td>
                <td>${formattedDate}</td>
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
            
            // 处理日期格式（时间戳转换为YYYY-MM-DD格式）
            const workDateValue = typeof schedule.workDate === 'number' 
                ? new Date(schedule.workDate).toISOString().split('T')[0]
                : schedule.workDate;
            document.getElementById('workDate').value = workDateValue;
            
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
            url = `${API_CONFIG.baseURL}/schedule/${editingScheduleId}`;
            method = 'PUT';
        } else {
            // 创建新记录
            url = `${API_CONFIG.baseURL}/schedule`;
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
            
            // 刷新周日程视图
            const currentWeekStart = getCurrentWeekStart();
            renderWeeklySchedule(currentWeekStart);
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
        const response = await fetch(`${API_CONFIG.baseURL}/schedule?scheduleId=${window.pendingDeleteId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        showMessage('日程删除成功', 'success');
        closeConfirmModal();
        loadScheduleData();
        
        // 刷新周日程视图
        const currentWeekStart = getCurrentWeekStart();
        renderWeeklySchedule(currentWeekStart);
        
    } catch (error) {
        console.error('删除日程失败:', error);
        showMessage('删除失败，请重试', 'error');
    }
}

// 格式化时间为半小时间隔（00分或30分）
function formatTimeToHalfHour(timeInput) {
    if (!timeInput.value) return;
    
    const [hours, minutes] = timeInput.value.split(':');
    const minutesNum = parseInt(minutes);
    
    let adjustedMinutes;
    if (minutesNum <= 15) {
        adjustedMinutes = '00';
    } else if (minutesNum <= 45) {
        adjustedMinutes = '30';
    } else {
        // 如果超过45分钟，进位到下一小时的00分
        const hoursNum = parseInt(hours);
        const nextHour = (hoursNum + 1) % 24;
        timeInput.value = `${nextHour.toString().padStart(2, '0')}:00`;
        return;
    }
    
    timeInput.value = `${hours}:${adjustedMinutes}`;
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
    const thisMonthStart = getMonthStart(new Date());
    const thisMonthEnd = getMonthEnd(new Date());
    
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
    
    // 计算本月工作时长
    const monthSchedules = scheduleData.filter(s => {
        const scheduleDate = new Date(s.workDate);
        return scheduleDate >= thisMonthStart && scheduleDate <= thisMonthEnd;
    });
    const monthHours = monthSchedules.reduce((total, schedule) => {
        return total + calculateDuration(schedule.startTime, schedule.endTime);
    }, 0);
    
    document.getElementById('todayWorkHours').textContent = `${todayHours.toFixed(1)}小时`;
    document.getElementById('weekWorkHours').textContent = `${weekHours.toFixed(1)}小时`;
    document.getElementById('monthWorkHours').textContent = `${monthHours.toFixed(1)}小时`;
}

// 今日概览卡片切换状态
let isOverviewExpanded = false;

// 切换今日概览显示模式
function toggleTodayOverview() {
    const contentDiv = document.getElementById('todayOverviewContent');
    
    if (!isOverviewExpanded) {
        // 切换到店铺月统计模式
        showShopMonthlyStats(contentDiv);
        isOverviewExpanded = true;
    } else {
        // 恢复到原始模式
        showOriginalStats(contentDiv);
        isOverviewExpanded = false;
    }
}

// 显示店铺月统计
function showShopMonthlyStats(contentDiv) {
    const thisMonthStart = getMonthStart(new Date());
    const thisMonthEnd = getMonthEnd(new Date());
    
    // 获取本月所有日程
    const monthSchedules = scheduleData.filter(s => {
        const scheduleDate = new Date(s.workDate);
        return scheduleDate >= thisMonthStart && scheduleDate <= thisMonthEnd;
    });
    
    // 按店铺分组统计
    const shopStats = {};
    monthSchedules.forEach(schedule => {
        const shopName = getStoreName(schedule.storeCode);
        if (!shopStats[shopName]) {
            shopStats[shopName] = 0;
        }
        shopStats[shopName] += calculateDuration(schedule.startTime, schedule.endTime);
    });
    
    // 生成新的HTML内容
    let newContent = '';
    Object.keys(shopStats).forEach(shopName => {
        newContent += `
            <div class="stat-item">
                <span class="stat-label">${shopName} 本月时长</span>
                <span class="stat-value">${shopStats[shopName].toFixed(1)}小时</span>
            </div>`;
    });
    
    // 如果没有店铺数据，显示提示
    if (Object.keys(shopStats).length === 0) {
        newContent = `
            <div class="stat-item">
                <span class="stat-label">本月暂无工作记录</span>
                <span class="stat-value">0小时</span>
            </div>`;
    }
    
    contentDiv.innerHTML = newContent;
}

// 显示原始统计
function showOriginalStats(contentDiv) {
    contentDiv.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">今日工作时长</span>
            <span class="stat-value" id="todayWorkHours">0小时</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">本周工作时长</span>
            <span class="stat-value" id="weekWorkHours">0小时</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">本月工作时长</span>
            <span class="stat-value" id="monthWorkHours">0小时</span>
        </div>`;
    
    // 重新更新统计数据
    updateDashboardStats();
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

// 获取本月开始日期
function getMonthStart(date) {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
}

// 获取本月结束日期
function getMonthEnd(date) {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
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
window.API_CONFIG = API_CONFIG;

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

// ========== 系统设置相关函数 ==========

// 加载个人信息数据
function loadProfileData() {
    const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
    const username = profileData.username || currentUser.username || '管理员';
    const welcome = profileData.welcome || '欢迎，777777';
    
    document.getElementById('profileUsername').textContent = username;
    document.getElementById('profileWelcome').textContent = welcome;
}

// 打开个人信息编辑模态框
function openProfileModal() {
    const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
    const username = profileData.username || currentUser.username || '管理员';
    const welcome = profileData.welcome || '欢迎，777777';
    
    document.getElementById('editUsername').value = username;
    document.getElementById('editWelcome').value = welcome;
    
    document.getElementById('profileModal').classList.add('active');
}

// 关闭个人信息编辑模态框
function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('profileForm').reset();
}

// 处理个人信息提交
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        username: formData.get('username'),
        welcome: formData.get('welcome')
    };
    
    try {
        // 保存到本地存储
        localStorage.setItem('profileData', JSON.stringify(profileData));
        
        // 更新显示
        document.getElementById('profileUsername').textContent = profileData.username;
        document.getElementById('profileWelcome').textContent = profileData.welcome;
        document.getElementById('currentUser').textContent = profileData.username;
        
        closeProfileModal();
        showMessage('个人信息更新成功！', 'success');
    } catch (error) {
        console.error('更新个人信息失败:', error);
        showMessage('更新个人信息失败，请重试', 'error');
    }
}

// 加载店铺数据
function loadShopData() {
    const savedShops = localStorage.getItem('shopData');
    if (savedShops) {
        shopData = JSON.parse(savedShops);
    } else {
        // 默认店铺数据
        shopData = [
            { id: 'main', name: '主店', code: 'main' },
            { id: 'branch1', name: '分店1', code: 'branch1' },
            { id: 'branch2', name: '分店2', code: 'branch2' }
        ];
        localStorage.setItem('shopData', JSON.stringify(shopData));
    }
    
    renderShopList();
    updateShopSelectors();
}

// 渲染店铺列表
function renderShopList() {
    const shopList = document.getElementById('shopList');
    
    if (shopData.length === 0) {
        shopList.innerHTML = `
            <div class="empty-shops">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9,22 9,12 15,12 15,22"></polyline>
                </svg>
                <p>暂无店铺，点击上方按钮添加店铺</p>
            </div>
        `;
        return;
    }
    
    shopList.innerHTML = shopData.map(shop => `
        <div class="shop-item">
            <div class="shop-info">
                <div class="shop-name">${shop.name}</div>
                <div class="shop-code">代码: ${shop.code}</div>
            </div>
            <div class="shop-actions">
                <button class="btn btn-secondary" onclick="editShop('${shop.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    编辑
                </button>
                <button class="btn btn-danger" onclick="deleteShop('${shop.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                    </svg>
                    删除
                </button>
            </div>
        </div>
    `).join('');
}

// 更新店铺选择器
function updateShopSelectors() {
    const selectors = ['workStore', 'storeFilter'];
    
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            // 保存当前选中值
            const currentValue = selector.value;
            
            // 清空选项（保留第一个默认选项）
            const firstOption = selector.firstElementChild;
            selector.innerHTML = '';
            if (firstOption) {
                selector.appendChild(firstOption);
            }
            
            // 添加店铺选项
            shopData.forEach(shop => {
                const option = document.createElement('option');
                option.value = shop.code;
                option.textContent = shop.name;
                selector.appendChild(option);
            });
            
            // 恢复选中值
            if (currentValue && shopData.find(shop => shop.code === currentValue)) {
                selector.value = currentValue;
            }
        }
    });
}

// 打开店铺管理模态框
function openShopModal(shopId = null) {
    editingShopId = shopId;
    
    if (shopId) {
        const shop = shopData.find(s => s.id === shopId);
        if (shop) {
            document.getElementById('shopModalTitle').textContent = '编辑店铺';
            document.getElementById('shopName').value = shop.name;
            document.getElementById('shopCode').value = shop.code;
        }
    } else {
        document.getElementById('shopModalTitle').textContent = '添加店铺';
        document.getElementById('shopForm').reset();
    }
    
    document.getElementById('shopModal').classList.add('active');
}

// 关闭店铺管理模态框
function closeShopModal() {
    document.getElementById('shopModal').classList.remove('active');
    document.getElementById('shopForm').reset();
    editingShopId = null;
}

// 处理店铺提交
async function handleShopSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const shopName = formData.get('shopName').trim();
    const shopCode = formData.get('shopCode').trim();
    
    // 验证输入
    if (!shopName || !shopCode) {
        showMessage('请填写完整的店铺信息', 'error');
        return;
    }
    
    // 检查代码是否重复（编辑时排除自己）
    const existingShop = shopData.find(shop => shop.code === shopCode && shop.id !== editingShopId);
    if (existingShop) {
        showMessage('店铺代码已存在，请使用其他代码', 'error');
        return;
    }
    
    try {
        if (editingShopId) {
            // 编辑店铺
            const shopIndex = shopData.findIndex(shop => shop.id === editingShopId);
            if (shopIndex !== -1) {
                shopData[shopIndex] = {
                    ...shopData[shopIndex],
                    name: shopName,
                    code: shopCode
                };
            }
        } else {
            // 添加新店铺
            const newShop = {
                id: Date.now().toString(),
                name: shopName,
                code: shopCode
            };
            shopData.push(newShop);
        }
        
        // 保存到本地存储
        localStorage.setItem('shopData', JSON.stringify(shopData));
        
        // 更新显示
        renderShopList();
        updateShopSelectors();
        
        closeShopModal();
        showMessage(editingShopId ? '店铺更新成功！' : '店铺添加成功！', 'success');
    } catch (error) {
        console.error('保存店铺失败:', error);
        showMessage('保存店铺失败，请重试', 'error');
    }
}

// 编辑店铺
function editShop(shopId) {
    openShopModal(shopId);
}

// 删除店铺
function deleteShop(shopId) {
    editingShopId = shopId;
    document.getElementById('shopConfirmModal').classList.add('active');
}

// 关闭店铺删除确认模态框
function closeShopConfirmModal() {
    document.getElementById('shopConfirmModal').classList.remove('active');
    editingShopId = null;
}

// 确认删除店铺
async function confirmShopDelete() {
    if (!editingShopId) return;
    
    try {
        // 从数组中移除店铺
        shopData = shopData.filter(shop => shop.id !== editingShopId);
        
        // 保存到本地存储
        localStorage.setItem('shopData', JSON.stringify(shopData));
        
        // 更新显示
        renderShopList();
        updateShopSelectors();
        
        closeShopConfirmModal();
        showMessage('店铺删除成功！', 'success');
    } catch (error) {
        console.error('删除店铺失败:', error);
        showMessage('删除店铺失败，请重试', 'error');
    }
}

// 导出函数到全局作用域
window.editShop = editShop;
window.deleteShop = deleteShop;

// ========== 周日程相关函数 ==========

// 初始化周日程
function initializeWeeklySchedule() {
    // 如果有日程数据，显示包含最新日程的周，否则显示当前周
    let weekStart;
    if (scheduleData && scheduleData.length > 0) {
        // 找到最新的日程日期
        const latestSchedule = scheduleData.reduce((latest, current) => {
            return new Date(current.workDate) > new Date(latest.workDate) ? current : latest;
        });
        weekStart = getWeekStart(new Date(latestSchedule.workDate));
    } else {
        weekStart = getWeekStart(new Date());
    }
    renderWeeklySchedule(weekStart);
    updateWeekDisplay(weekStart);
}

// 渲染周日程
function renderWeeklySchedule(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // 获取本周的日程数据
    const weekSchedules = scheduleData.filter(schedule => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
    });
    
    const weeklyGrid = document.getElementById('weeklyGrid');
    if (!weeklyGrid) return;
    
    // 生成一周的日期
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        weekDays.push(day);
    }
    
    // 渲染周日程网格
    weeklyGrid.innerHTML = weekDays.map(day => {
        const dateStr = day.toISOString().split('T')[0];
        const daySchedules = weekSchedules.filter(s => {
            // 处理时间戳格式的日期
            const scheduleDate = typeof s.workDate === 'number' 
                ? new Date(s.workDate).toISOString().split('T')[0]
                : s.workDate;
            return scheduleDate === dateStr;
        });
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        return `
            <div class="day-row ${isToday ? 'today' : ''}">
                <div class="day-header">
                    <div class="day-name">${getWeekDay(day)}</div>
                    <div class="day-date">${day.getMonth() + 1}月${day.getDate()}日</div>
                </div>
                <div class="day-schedules">
                    ${daySchedules.map(schedule => `
                        <div class="schedule-item">
                            <div class="schedule-store">${getStoreName(schedule.workStore)}</div>
                            <div class="schedule-time">${schedule.startTime} - ${schedule.endTime}</div>
                            <div class="schedule-duration">${calculateDuration(schedule.startTime, schedule.endTime).toFixed(1)}h</div>
                        </div>
                    `).join('')}
                    ${daySchedules.length === 0 ? '<div class="no-schedule">无安排</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 更新周显示
function updateWeekDisplay(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekDisplay = document.getElementById('weekDisplay');
    if (weekDisplay) {
        const startStr = `${weekStart.getMonth() + 1}月${weekStart.getDate()}日`;
        const endStr = `${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
        weekDisplay.textContent = `${startStr} - ${endStr}`;
    }
}

// 导航到上一周或下一周
function navigateWeek(direction) {
    const currentWeekDisplay = document.getElementById('weekDisplay');
    if (!currentWeekDisplay) return;
    
    // 获取当前显示的周开始日期
    const currentWeekStart = getCurrentWeekStart();
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    
    renderWeeklySchedule(newWeekStart);
    updateWeekDisplay(newWeekStart);
}

// 获取当前显示的周开始日期
function getCurrentWeekStart() {
    // 尝试从周显示元素中解析当前周，如果失败则返回本周开始
    const weekDisplay = document.getElementById('weekDisplay');
    if (weekDisplay && weekDisplay.textContent) {
        try {
            // 解析显示的周范围，例如 "1月1日 - 1月7日"
            const text = weekDisplay.textContent;
            const match = text.match(/(\d+)月(\d+)日/);
            if (match) {
                const month = parseInt(match[1]) - 1; // 月份从0开始
                const day = parseInt(match[2]);
                const year = new Date().getFullYear();
                const date = new Date(year, month, day);
                return getWeekStart(date);
            }
        } catch (e) {
            console.warn('解析当前周失败，使用默认值');
        }
    }
    return getWeekStart(new Date());
}



// 获取星期几的中文名称
function getWeekDay(date) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
}

// 获取店铺名称
function getStoreName(storeId) {
    const storeNames = {
        'main': '主店',
        'branch1': '分店1',
        'branch2': '分店2'
    };
    return storeNames[storeId] || storeId;
}



// 获取周开始日期（周一）
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    return new Date(d.setDate(diff));
}

// 导出周日程相关函数
window.navigateWeek = navigateWeek;

// ==================== 酒店信息管理 ====================

// 加载酒店信息
function loadHotelInfo() {
    try {
        const hotelInfo = JSON.parse(localStorage.getItem('hotelInfo')) || {
            name: 'URO Hotel',
            description: 'Hotel & Cafe & Bar'
        };
        
        document.getElementById('hotelName').textContent = hotelInfo.name;
        document.getElementById('hotelDescription').textContent = hotelInfo.description;
        
        // 更新侧边栏标题
        const sidebarTitle = document.querySelector('.sidebar-header h2');
        if (sidebarTitle) {
            sidebarTitle.textContent = hotelInfo.name;
        }
        
        // 更新页面标题
        document.title = `${hotelInfo.name} 管理后台`;
        
    } catch (error) {
        console.error('加载酒店信息失败:', error);
    }
}

// 打开酒店信息编辑模态框
function openHotelInfoModal() {
    const modal = document.getElementById('hotelInfoModal');
    const hotelName = document.getElementById('hotelName').textContent;
    const hotelDescription = document.getElementById('hotelDescription').textContent;
    
    document.getElementById('editHotelName').value = hotelName;
    document.getElementById('editHotelDescription').value = hotelDescription;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 关闭酒店信息编辑模态框
function closeHotelInfoModal() {
    const modal = document.getElementById('hotelInfoModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 处理酒店信息表单提交
async function handleHotelInfoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const hotelInfo = {
        name: formData.get('hotelName').trim(),
        description: formData.get('hotelDescription').trim()
    };
    
    // 验证输入
    if (!hotelInfo.name) {
        showMessage('请输入酒店名称', 'error');
        return;
    }
    
    if (!hotelInfo.description) {
        showMessage('请输入酒店描述', 'error');
        return;
    }
    
    try {
        // 保存到本地存储
        localStorage.setItem('hotelInfo', JSON.stringify(hotelInfo));
        
        // 更新页面显示
        document.getElementById('hotelName').textContent = hotelInfo.name;
        document.getElementById('hotelDescription').textContent = hotelInfo.description;
        
        // 更新侧边栏标题
        const sidebarTitle = document.querySelector('.sidebar-header h2');
        if (sidebarTitle) {
            sidebarTitle.textContent = hotelInfo.name;
        }
        
        // 更新页面标题
        document.title = `${hotelInfo.name} 管理后台`;
        
        closeHotelInfoModal();
        showMessage('酒店信息更新成功', 'success');
        
    } catch (error) {
        console.error('保存酒店信息失败:', error);
        showMessage('保存失败，请重试', 'error');
    }
}

// 在页面初始化时添加酒店信息相关的事件监听器
function initializeHotelInfoEvents() {
    // 编辑酒店信息按钮
    const editHotelInfoBtn = document.getElementById('editHotelInfoBtn');
    if (editHotelInfoBtn) {
        editHotelInfoBtn.addEventListener('click', openHotelInfoModal);
    }
    
    // 关闭模态框按钮
    const hotelInfoModalClose = document.getElementById('hotelInfoModalClose');
    if (hotelInfoModalClose) {
        hotelInfoModalClose.addEventListener('click', closeHotelInfoModal);
    }
    
    // 取消按钮
    const hotelInfoCancelBtn = document.getElementById('hotelInfoCancelBtn');
    if (hotelInfoCancelBtn) {
        hotelInfoCancelBtn.addEventListener('click', closeHotelInfoModal);
    }
    
    // 表单提交
    const hotelInfoForm = document.getElementById('hotelInfoForm');
    if (hotelInfoForm) {
        hotelInfoForm.addEventListener('submit', handleHotelInfoSubmit);
    }
    
    // 点击模态框背景关闭
    const hotelInfoModal = document.getElementById('hotelInfoModal');
    if (hotelInfoModal) {
        hotelInfoModal.addEventListener('click', function(e) {
            if (e.target === hotelInfoModal) {
                closeHotelInfoModal();
            }
        });
    }
}

// 导出酒店信息相关函数
window.openHotelInfoModal = openHotelInfoModal;
window.closeHotelInfoModal = closeHotelInfoModal;