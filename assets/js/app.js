/**
 * HR Pro - Main Application Logic (RBAC Edition)
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const rolePermissions = {
    employee: ['dashboard', 'leaves', 'attendance', 'payslip'],
    gm:       ['dashboard', 'leaves', 'attendance', 'payslip'],
    hr:       ['dashboard', 'directory', 'leaves', 'attendance', 'payroll', 'payslip']
};

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentPage: 'dashboard',
        employees: [],
        leaves: [],
        attendance: [],
        payroll: [],
        isClockedIn: false,
        lastClockInTime: null,
        editingId: null,
        currentUser: null,
        theme: localStorage.getItem('hr_theme') || 'dark',
        notifications: JSON.parse(localStorage.getItem('hr_notifications')) || []
    };

    let globalListenersAttached = false;

    init();

    async function init() {
        applyTheme(state.theme);
        setupGlobalListeners();
        try {
            const user = await apiCall(`${API_BASE_URL}/auth/me`);
            state.currentUser = user;
            showApp();
        } catch (error) {
            // Expected 401 on first load when no session exists
            if (error.message === 'Unauthorized') {
                showLogin();
            } else {
                showLogin();
            }
        }
    }

    async function apiCall(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include'
            });
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            if (response.status === 403) {
                showToast('error', 'Access Denied', 'You do not have permission for this action.');
                throw new Error('Forbidden');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            if (error.message !== 'Unauthorized' && error.message !== 'Forbidden') {
                addNotification('error', 'API Error', error.message);
            }
            throw error;
        }
    }

    function showLogin() {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'flex';
        setupLoginListeners();
        if (window.lucide) lucide.createIcons();
    }

    function showApp() {
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('login-container').style.display = 'none';
        filterNavByRole();
        updateTopBar();
        setupEventListeners();
        loadDataFromAPI().then(() => {
            syncEmployeeStatuses();
            renderCurrentView();
            updateBadge();
        });
    }

    async function handleLogin(empId, password) {
        const user = await apiCall(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emp_id: empId, password })
        });
        state.currentUser = user;
        showApp();
    }

    async function handleLogout() {
        try {
            await apiCall(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        } catch (e) {}
        state.currentUser = null;
        state.currentPage = 'dashboard';
        state.employees = [];
        state.leaves = [];
        state.attendance = [];
        state.payroll = [];
        state.isClockedIn = false;
        state.lastClockInTime = null;
        showLogin();
    }

    function filterNavByRole() {
        const role = (state.currentUser.role || '').toLowerCase();
        const allowed = rolePermissions[role] || [];
        const navItems = document.querySelectorAll('#nav-list li[data-page]');
        let firstActive = null;

        console.log('filterNavByRole - role:', role, 'allowed:', allowed);

        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (allowed.includes(page)) {
                item.style.display = 'list-item';
                if (!firstActive) firstActive = item;
            } else {
                item.style.display = 'none';
                item.classList.remove('active');
            }
        });

        if (firstActive && !allowed.includes(state.currentPage)) {
            state.currentPage = firstActive.getAttribute('data-page');
        }

        if (!allowed.includes(state.currentPage) && allowed.length > 0) {
            state.currentPage = allowed[0];
        }

        navItems.forEach(item => {
            if (item.getAttribute('data-page') === state.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        console.log('filterNavByRole - currentPage:', state.currentPage);
    }

    function updateTopBar() {
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        const userAvatar = document.getElementById('user-avatar');
        const dropdownName = document.getElementById('dropdown-name');
        const dropdownRole = document.getElementById('dropdown-role');
        const dropdownDept = document.getElementById('dropdown-dept');
        const dropdownEmail = document.getElementById('dropdown-email');
        const dropdownJoined = document.getElementById('dropdown-joined');
        const dropdownAvatar = document.getElementById('dropdown-avatar');

        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.currentUser.name}`;

        if (userName) userName.textContent = state.currentUser.name;
        if (userRole) userRole.textContent = state.currentUser.emp_role || state.currentUser.role;
        if (userAvatar) userAvatar.src = avatarUrl;

        if (dropdownName) dropdownName.textContent = state.currentUser.name;
        if (dropdownRole) dropdownRole.textContent = state.currentUser.emp_role || state.currentUser.role;
        if (dropdownDept) dropdownDept.textContent = state.currentUser.department || 'N/A';
        if (dropdownAvatar) dropdownAvatar.src = avatarUrl;

        const emp = state.employees.find(e => e.id === state.currentUser.id);
        if (dropdownEmail) dropdownEmail.textContent = emp?.email || 'N/A';
        if (dropdownJoined) dropdownJoined.textContent = emp?.joinDate || 'N/A';
    }

    function setupLoginListeners() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const empId = parseInt(document.getElementById('login-emp-id').value);
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            const btn = document.getElementById('btn-login');

            btn.disabled = true;
            btn.textContent = 'Logging in...';
            errorDiv.style.display = 'none';

            try {
                await handleLogin(empId, password);
            } catch (error) {
                errorDiv.textContent = error.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="log-in"></i> Login';
                if (window.lucide) lucide.createIcons();
            }
        };
    }

    async function loadDataFromAPI() {
        // Load stats for dashboard (all roles)
        try {
            const stats = await apiCall(`${API_BASE_URL}/stats`);
            state.dashboardStats = stats;
        } catch {
            state.dashboardStats = { total_employees: 0, active_leaves: 0, present_today: 0, on_time: 0 };
        }

        // Only HR can access full employee list
        if (state.currentUser.role === 'hr') {
            try {
                const employees = await apiCall(`${API_BASE_URL}/employees`);
                state.employees = employees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    dept: emp.department,
                    email: emp.contact,
                    joinDate: emp.date_joined,
                    status: emp.status
                }));
            } catch {
                state.employees = [];
            }
        } else {
            // Non-HR users: load current user's employee record for display
            state.employees = [{
                id: state.currentUser.id,
                name: state.currentUser.name,
                role: state.currentUser.emp_role,
                dept: state.currentUser.department,
                email: '',
                joinDate: '',
                status: 'Active'
            }];
        }

        try {
            const leaves = await apiCall(`${API_BASE_URL}/leaves`);
            state.leaves = leaves.map(leave => ({
                id: leave.id,
                empId: leave.employee_id,
                name: leave.employee_name || 'Unknown',
                type: leave.leave_type,
                start: leave.start_date,
                end: leave.end_date,
                reason: leave.reason,
                status: leave.status
            }));
        } catch {
            state.leaves = [];
        }

        try {
            const attendance = await apiCall(`${API_BASE_URL}/attendance`);
            state.attendance = attendance.map(att => ({
                id: att.id,
                employee_id: att.employee_id,
                employee_name: att.employee_name || 'Unknown',
                date: att.date,
                clockIn: att.clock_in_time ? new Date(att.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                clockOut: att.clock_out_time ? new Date(att.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                status: 'On Time'
            }));

            const today = new Date().toISOString().split('T')[0];
            const todayRecord = attendance.find(att =>
                att.employee_id === state.currentUser.id &&
                att.date === today &&
                !att.clock_out_time
            );
            if (todayRecord) {
                state.isClockedIn = true;
                state.lastClockInTime = new Date(todayRecord.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                state.isClockedIn = false;
                state.lastClockInTime = null;
            }
        } catch {
            state.attendance = [];
        }

        try {
            const payroll = await apiCall(`${API_BASE_URL}/payroll`);
            state.payroll = payroll.map(pay => ({
                id: pay.id,
                empId: pay.employee_id,
                employee_name: pay.employee_name || 'Unknown',
                employee_role: pay.employee_role || '',
                month: pay.month,
                basic: pay.basic_salary,
                bonus: pay.bonus,
                deductions: pay.deductions,
                net: pay.net_pay
            }));
        } catch {
            state.payroll = [];
        }

        console.log('Data loaded from API successfully');
        console.log('State employees:', state.employees.length, 'leaves:', state.leaves.length, 'attendance:', state.attendance.length, 'payroll:', state.payroll.length);
        console.log('Current user role:', state.currentUser.role);
    }

    function applyTheme(theme) {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        if (theme === 'light') {
            body.classList.add('light-theme');
            if (themeToggle) themeToggle.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            body.classList.remove('light-theme');
            if (themeToggle) themeToggle.innerHTML = '<i data-lucide="moon"></i>';
        }
        if (window.lucide) lucide.createIcons();
        localStorage.setItem('hr_theme', theme);
    }

    function saveToStorage() {
        localStorage.setItem('hr_notifications', JSON.stringify(state.notifications));
    }

    function addNotification(type, title, message) {
        const notification = {
            id: Date.now(),
            type,
            title,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        };
        state.notifications.unshift(notification);
        saveToStorage();
        updateBadge();
        showToast(type, title, message);
    }

    function updateBadge() {
        const badge = document.querySelector('.notifications .badge');
        const unreadCount = state.notifications.filter(n => !n.read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    }

    function showToast(type, title, message) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: 'check-circle',
            info: 'info',
            warning: 'alert-triangle',
            error: 'x-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}"></i>
            <div class="toast-content">
                <p>${title}</p>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function toggleNotifications() {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('active');
        if (dropdown.classList.contains('active')) {
            renderNotifications();
        }
    }

    function renderNotifications() {
        const list = document.getElementById('notification-list');
        if (!list) return;

        if (state.notifications.length === 0) {
            list.innerHTML = `<div style="padding: 30px; text-align:center; color: var(--text-secondary);">No notifications yet</div>`;
            return;
        }

        const icons = {
            success: 'check-circle',
            info: 'info',
            warning: 'alert-triangle',
            error: 'x-circle'
        };

        list.innerHTML = state.notifications.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window.markRead(${n.id})">
                <i data-lucide="${icons[n.type] || 'info'}" class="${n.type}"></i>
                <div class="notif-info">
                    <h5>${n.title}</h5>
                    <p>${n.message}</p>
                    <span>${n.time}</span>
                </div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }

    window.markRead = (id) => {
        const notif = state.notifications.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            saveToStorage();
            updateBadge();
            renderNotifications();
        }
    };

    window.markAllRead = () => {
        state.notifications.forEach(n => n.read = true);
        saveToStorage();
        updateBadge();
        renderNotifications();
    };

    function toggleSearchPalette() {
        const palette = document.getElementById('search-palette');
        const input = document.getElementById('palette-input');
        if (!palette) return;

        const isVisible = palette.style.display === 'flex';
        palette.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            input.value = '';
            input.focus();
            renderPaletteResults('');
        }
    }

    function renderPaletteResults(query) {
        const resultsContainer = document.getElementById('palette-results');
        if (!resultsContainer) return;

        const term = query.toLowerCase();
        const allowed = rolePermissions[state.currentUser.role] || [];

        const features = [
            { title: 'Go to Dashboard', cat: 'Navigation', icon: 'layout-dashboard', action: () => window.navTo('dashboard'), page: 'dashboard' },
            { title: 'Go to Directory', cat: 'Navigation', icon: 'users', action: () => window.navTo('directory'), page: 'directory' },
            { title: 'Go to Leaves', cat: 'Navigation', icon: 'calendar', action: () => window.navTo('leaves'), page: 'leaves' },
            { title: 'Go to Attendance', cat: 'Navigation', icon: 'clock', action: () => window.navTo('attendance'), page: 'attendance' },
            { title: 'Go to Payroll', cat: 'Navigation', icon: 'credit-card', action: () => window.navTo('payroll'), page: 'payroll' },
            { title: 'Go to Payslip', cat: 'Navigation', icon: 'file-text', action: () => window.navTo('payslip'), page: 'payslip' },
            { title: 'Toggle Light/Dark Mode', cat: 'System', icon: 'sun', action: () => document.getElementById('theme-toggle')?.click() }
        ].filter(f => !f.page || allowed.includes(f.page));

        const employeeResults = state.employees
            .filter(emp => emp.name.toLowerCase().includes(term) || emp.role.toLowerCase().includes(term))
            .map(emp => ({
                title: emp.name,
                cat: `Employee (${emp.role})`,
                icon: 'user',
                action: () => { window.navTo('directory'); setTimeout(() => window.editEmployee(emp.id), 100); }
            }));

        const allResults = [...features.filter(f => f.title.toLowerCase().includes(term)), ...employeeResults].slice(0, 8);

        if (allResults.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 20px; text-align:center; color: var(--text-secondary);">No results found for "${query}"</div>`;
            return;
        }

        resultsContainer.innerHTML = allResults.map((res, idx) => `
            <div class="search-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
                <i data-lucide="${res.icon}"></i>
                <div class="search-item-info">
                    <span class="title">${res.title}</span>
                    <span class="category">${res.cat}</span>
                </div>
            </div>
        `).join('');

        const items = resultsContainer.querySelectorAll('.search-item');
        items.forEach((item, idx) => {
            item.onclick = () => {
                allResults[idx].action();
                toggleSearchPalette();
            };
        });

        if (window.lucide) lucide.createIcons();
        paletteState.currentResults = allResults;
        paletteState.selectedIndex = 0;
    }

    const paletteState = {
        currentResults: [],
        selectedIndex: 0
    };

    function closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.style.display = 'none');
        state.editingId = null;
    }

    function renderCurrentView() {
        const container = document.getElementById('view-container');
        const role = (state.currentUser.role || '').toLowerCase();
        const allowed = rolePermissions[role] || [];
        if (!allowed.includes(state.currentPage)) {
            state.currentPage = allowed[0] || 'dashboard';
            filterNavByRole();
        }

        console.log('renderCurrentView - rendering:', state.currentPage);

        try {
            switch (state.currentPage) {
                case 'dashboard':
                    renderDashboard(container);
                    break;
                case 'directory':
                    renderDirectory(container);
                    break;
                case 'leaves':
                    renderLeaves(container);
                    break;
                case 'attendance':
                    renderAttendance(container);
                    break;
                case 'payroll':
                    renderPayroll(container);
                    break;
                case 'payslip':
                    renderPayslip(container);
                    break;
                default:
                    container.innerHTML = `<h1>${state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}</h1><p>Coming soon...</p>`;
            }
        } catch (error) {
            console.error(`Error rendering ${state.currentPage}:`, error);
            container.innerHTML = `<h1>Error Loading Page</h1><p>There was an error rendering this page. Check the console for details.</p><p style="color:var(--danger)">${error.message}</p>`;
        }

        if (window.lucide) lucide.createIcons();
    }

    // --- Dashboard View ---
    function renderDashboard(container) {
        const stats = state.dashboardStats || { total_employees: 0, active_leaves: 0, present_today: 0, on_time: 0 };
        const onTimePercent = stats.present_today > 0 ? Math.round((stats.on_time / stats.present_today) * 100) : 100;
        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card glass">
                    <div class="stat-icon blue"><i data-lucide="users"></i></div>
                    <div class="stat-info">
                        <h3>Total Employees</h3>
                        <p>${stats.total_employees}</p>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-icon green"><i data-lucide="calendar-check"></i></div>
                    <div class="stat-info">
                        <h3>Active Leaves</h3>
                        <p>${stats.active_leaves}</p>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-icon orange"><i data-lucide="clock"></i></div>
                    <div class="stat-info">
                        <h3>On Time Today</h3>
                        <p>${onTimePercent}%</p>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-icon red"><i data-lucide="alert-circle"></i></div>
                    <div class="stat-info">
                        <h3>Pending Tasks</h3>
                        <p>3</p>
                    </div>
                </div>
            </div>

            <div class="dashboard-sections">
                <div class="content-box glass">
                    <div class="box-header">
                        <h2>Recent Employees</h2>
                        <button class="glass" onclick="window.navTo('directory')" style="padding: 5px 12px; font-size: 0.8rem;">View All</button>
                    </div>
                    ${state.employees.length === 0
                ? '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">No employees added yet.</div>'
                : `<ul class="activity-list">
                            ${state.employees.slice(-3).reverse().map(emp => `
                                <li class="activity-item">
                                    <i data-lucide="user-check"></i>
                                    <div class="activity-details">
                                        <p>${emp.name} joined as ${emp.role}</p>
                                        <span>${emp.joinDate}</span>
                                    </div>
                                </li>
                            `).join('')}
                           </ul>`}
                </div>
                <div class="content-box glass">
                    <div class="box-header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div class="activity-list">
                        <div class="activity-item action-trigger" onclick="window.navTo('directory')" style="cursor:pointer">
                            <i data-lucide="user-plus"></i>
                            <div class="activity-details">
                                <p>Manage Employees</p>
                                <span>Add or update records</span>
                            </div>
                        </div>
                        <div class="activity-item action-trigger" onclick="window.navTo('leaves')" style="cursor:pointer">
                            <i data-lucide="calendar"></i>
                            <div class="activity-details">
                                <p>Leave Management</p>
                                <span>Review applications</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Directory View ---
    function renderDirectory(container) {
        container.innerHTML = `
            <div class="directory-header">
                <h2>Employee Directory</h2>
                <div class="directory-controls">
                    <div class="search-input-group">
                        <i data-lucide="search"></i>
                        <input type="text" id="emp-search" placeholder="Search by name or role...">
                    </div>
                    <div class="filter-group">
                        <select id="status-filter" class="glass-select">
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Terminated">Terminated</option>
                            <option value="Resigned">Resigned</option>
                        </select>
                    </div>
                    <button class="btn-primary" id="btn-add-employee" style="padding: 10px 20px;">
                        <i data-lucide="plus"></i> Add Employee
                    </button>
                </div>
            </div>
            <div class="employee-grid" id="employee-list">
                ${state.employees.map(emp => renderEmployeeCard(emp)).join('')}
            </div>

            <div class="modal-overlay" id="add-modal">
                <div class="modal-content glass">
                    <div class="box-header">
                        <h2 id="modal-title">Add New Employee</h2>
                        <button class="btn-close-icon" id="close-modal"><i data-lucide="x"></i></button>
                    </div>
                    <form id="add-employee-form">
                        <input type="hidden" id="edit-id">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="new-name" required placeholder="e.g. John Doe">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <input type="text" id="new-role" required placeholder="e.g. Developer">
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <select id="new-dept">
                                <option value="Engineering">Engineering</option>
                                <option value="Design">Design</option>
                                <option value="Marketing">Marketing</option>
                                <option value="HR">HR</option>
                                <option value="Operations">Operations</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="new-email" required placeholder="john@example.com">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="new-status">
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Terminated">Terminated</option>
                                <option value="Resigned">Resigned</option>
                            </select>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-outline" id="btn-cancel">Cancel</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 20px;" id="btn-save">Save Employee</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        setupDirectoryListeners();
    }

    function renderEmployeeCard(emp) {
        return `
            <div class="emp-card glass">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}" alt="${emp.name}" class="emp-avatar">
                <div class="emp-info">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3>${emp.name}</h3>
                        <span class="status-badge status-${(emp.status || 'Active').toLowerCase().replace(' ', '-')}">${emp.status || 'Active'}</span>
                    </div>
                    <p>${emp.role}</p>
                </div>
                <div class="emp-meta">
                    <span><i data-lucide="briefcase" style="width:14px;"></i> ${emp.dept}</span>
                    <span><i data-lucide="calendar" style="width:14px;"></i> ${emp.joinDate || '2024-01-01'}</span>
                </div>
                <div class="emp-actions">
                    <button class="btn-icon btn-outline" onclick="window.editEmployee(${emp.id})"><i data-lucide="edit-3"></i> Edit</button>
                    <button class="btn-icon btn-danger-outline" onclick="window.deleteEmployee(${emp.id})"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
    }

    function setupDirectoryListeners() {
        const addBtn = document.getElementById('btn-add-employee');
        const modal = document.getElementById('add-modal');
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('btn-cancel');
        const form = document.getElementById('add-employee-form');
        const searchInput = document.getElementById('emp-search');

        if (addBtn) addBtn.onclick = () => {
            state.editingId = null;
            document.getElementById('modal-title').innerText = 'Add New Employee';
            form.reset();
            modal.style.display = 'flex';
        };

        if (closeBtn) closeBtn.onclick = () => closeAllModals();
        if (cancelBtn) cancelBtn.onclick = () => closeAllModals();

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('new-name').value;
                const role = document.getElementById('new-role').value;
                const dept = document.getElementById('new-dept').value;
                const email = document.getElementById('new-email').value;
                const status = document.getElementById('new-status').value;

                try {
                    if (state.editingId) {
                        await apiCall(`${API_BASE_URL}/employees/${state.editingId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name,
                                role,
                                department: dept,
                                contact: email,
                                status
                            })
                        });

                        const empIndex = state.employees.findIndex(e => e.id === state.editingId);
                        if (empIndex !== -1) {
                            state.employees[empIndex] = {
                                ...state.employees[empIndex],
                                name, role, dept, email, status
                            };
                        }

                        addNotification('success', 'Employee Updated', `${name} has been updated.`);

                        const cards = document.querySelectorAll('.emp-card');
                        for (const card of cards) {
                            const editBtn = card.querySelector(`[onclick*="${state.editingId}"]`);
                            if (editBtn) {
                                card.outerHTML = renderEmployeeCard(state.employees[empIndex]);
                                break;
                            }
                        }
                    } else {
                        const response = await apiCall(`${API_BASE_URL}/employees`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name,
                                role,
                                department: dept,
                                contact: email,
                                status
                            })
                        });

                        const newEmp = {
                            id: response.id,
                            name, role, dept, email,
                            joinDate: response.date_joined || new Date().toISOString().split('T')[0],
                            status
                        };
                        state.employees.push(newEmp);

                        addNotification('success', 'Employee Added', `${name} has been added to the directory.`);

                        const grid = document.getElementById('employee-list');
                        if (grid) {
                            grid.insertAdjacentHTML('beforeend', renderEmployeeCard(newEmp));
                        }
                    }

                    modal.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                } catch (error) {
                    console.error('Failed to save employee:', error);
                }
            };
        }

        if (searchInput || document.getElementById('status-filter')) {
            const filterResults = () => {
                const term = document.getElementById('emp-search').value.toLowerCase();
                const statusFilter = document.getElementById('status-filter').value;

                const filtered = state.employees.filter(emp => {
                    const matchesSearch = emp.name.toLowerCase().includes(term) || emp.role.toLowerCase().includes(term);
                    const matchesStatus = statusFilter === 'All' || (emp.status || 'Active') === statusFilter;
                    return matchesSearch && matchesStatus;
                });

                document.getElementById('employee-list').innerHTML = filtered.map(emp => renderEmployeeCard(emp)).join('');
                if (window.lucide) lucide.createIcons();
            };

            if (searchInput) searchInput.oninput = filterResults;
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) statusFilter.onchange = filterResults;
        }
    }

    // --- Leave Management View ---
    function renderLeaveCard(leave) {
        return `
            <div class="leave-card glass" data-leave-id="${leave.id}">
                <div class="leave-header">
                    <div class="leave-requester">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.name}" alt="${leave.name}">
                        <div>
                            <h4 style="margin:0">${leave.name}</h4>
                            <div style="display:flex; gap:5px; align-items:center;">
                                <span style="font-size:0.8rem; color:var(--text-secondary)">${leave.type || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <span class="status-badge status-${(leave.status || 'pending').toLowerCase()}">${leave.status || 'Pending'}</span>
                </div>
                <div class="leave-details">
                    <p><i data-lucide="calendar" style="width:14px;"></i> ${leave.start || 'N/A'} to ${leave.end || 'N/A'}</p>
                    <p><i data-lucide="info" style="width:14px;"></i> ${leave.reason || 'N/A'}</p>
                </div>
                ${leave.status === 'Pending' ? `
                    <div class="leave-actions">
                        <button class="btn-icon btn-primary" onclick="window.updateLeaveStatus(${leave.id}, 'Approved')">Approve</button>
                        <button class="btn-icon btn-danger-outline" onclick="window.updateLeaveStatus(${leave.id}, 'Rejected')">Reject</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderLeaves(container) {
        const userRole = state.currentUser.role;

        if (userRole === 'hr') {
            renderLeavesHR(container);
        } else {
            renderLeavesEmployee(container);
        }
    }

    function renderLeavesEmployee(container) {
        const ownLeaves = state.leaves.filter(l => l.empId === state.currentUser.id);
        const leaveCount = ownLeaves.length;
        const leaveBalance = Math.max(0, 10 - leaveCount);

        container.innerHTML = `
            <div class="directory-header">
                <h2>My Leave Requests</h2>
                <button class="btn-primary" id="btn-request-leave" style="padding: 10px 20px;">
                    <i data-lucide="calendar-plus"></i> Request Leave
                </button>
            </div>

            <div class="leave-balance-box glass">
                <div class="leave-balance-icon">
                    <i data-lucide="calendar-check"></i>
                </div>
                <div class="leave-balance-info">
                    <h3>Leave Balance</h3>
                    <p>${leaveBalance}</p>
                    <span>of 10 leaves remaining</span>
                </div>
            </div>

            <div class="filter-bar">
                <select id="leave-month-filter" class="glass-select">
                    <option value="all">All Months</option>
                    ${generateMonthOptions()}
                </select>
            </div>

            <div class="content-box glass">
                <div class="attendance-table-container">
                    <table class="leave-history-table" id="leave-history-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Reason</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ownLeaves.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-secondary)">No leave requests found.</td></tr>'
                : ownLeaves.map(leave => `
                                    <tr data-month="${(leave.start || '').substring(0, 7)}">
                                        <td>${leave.type || 'N/A'}</td>
                                        <td>${leave.start || 'N/A'}</td>
                                        <td>${leave.end || 'N/A'}</td>
                                        <td>${leave.reason || 'N/A'}</td>
                                        <td><span class="status-badge status-${(leave.status || 'pending').toLowerCase()}">${leave.status || 'Pending'}</span></td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-overlay" id="leave-modal">
                <div class="modal-content glass">
                    <div class="box-header">
                        <h2>Request Time Off</h2>
                        <button class="btn-close-icon" id="close-leave-modal"><i data-lucide="x"></i></button>
                    </div>
                    <form id="leave-form">
                        <div class="form-group">
                            <label>Leave Type</label>
                            <select id="leave-type" class="glass-select">
                                <option value="Casual Leave">Casual Leave</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Annual Leave">Annual Leave</option>
                                <option value="Unpaid Leave">Unpaid Leave</option>
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="leave-start" required>
                            </div>
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="leave-end" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Reason</label>
                            <input type="text" id="leave-reason" required placeholder="e.g. Vacation">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-outline" id="btn-cancel-leave">Cancel</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 20px;">Submit Request</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        setupLeaveEmployeeListeners();
    }

    function renderLeavesHR(container) {
        container.innerHTML = `
            <div class="tab-bar">
                <button class="tab-button active" data-tab="management">Manage Leaves</button>
                <button class="tab-button" data-tab="my-leaves">My Leaves</button>
            </div>

            <div id="tab-management" class="tab-content">
                <div class="directory-header">
                    <h2>Leave Management</h2>
                    <button class="btn-primary" id="btn-create-leave" style="padding: 10px 20px;">
                        <i data-lucide="calendar-plus"></i> Create Leave
                    </button>
                </div>

                <div class="filter-bar">
                    <select id="leave-status-filter" class="glass-select">
                        <option value="all">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select id="leave-month-filter" class="glass-select">
                        <option value="all">All Months</option>
                        ${generateMonthOptions()}
                    </select>
                    <input type="text" id="leave-name-filter" placeholder="Search by name..." style="padding: 10px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); outline: none; font-family: inherit; font-size: 0.9rem;">
                </div>

                <div class="leave-grid">
                    ${state.leaves.length === 0 ? '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary)">No leave requests found.</div>' : ''}
                    ${state.leaves.slice().reverse().map(leave => renderLeaveCard(leave)).join('')}
                </div>

                <div class="modal-overlay" id="leave-modal">
                    <div class="modal-content glass">
                        <div class="box-header">
                            <h2>Create Leave</h2>
                            <button class="btn-close-icon" id="close-leave-modal"><i data-lucide="x"></i></button>
                        </div>
                        <form id="leave-form">
                            <div class="form-group">
                                <label>Employee</label>
                                <select id="leave-emp-name" class="glass-select" required>
                                    ${state.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Leave Type</label>
                                <select id="leave-type" class="glass-select">
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Annual Leave">Annual Leave</option>
                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                </select>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" id="leave-start" required>
                                </div>
                                <div class="form-group">
                                    <label>End Date</label>
                                    <input type="date" id="leave-end" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Reason</label>
                                <input type="text" id="leave-reason" required placeholder="e.g. Vacation">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn-outline" id="btn-cancel-leave">Cancel</button>
                                <button type="submit" class="btn-primary" style="padding: 10px 20px;">Create Leave</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div id="tab-my-leaves" class="tab-content" style="display:none">
                ${renderHRMyLeavesTab()}
            </div>
        `;

        setupLeaveHRListeners();
    }

    function renderHRMyLeavesTab() {
        const ownLeaves = state.leaves.filter(l => l.empId === state.currentUser.id);
        const leaveCount = ownLeaves.length;
        const leaveBalance = Math.max(0, 10 - leaveCount);

        return `
            <div class="directory-header">
                <h2>My Leaves</h2>
                <button class="btn-primary" id="btn-my-leave-create" style="padding: 10px 20px;">
                    <i data-lucide="calendar-plus"></i> Create Leave
                </button>
            </div>

            <div class="leave-balance-box glass">
                <div class="leave-balance-icon">
                    <i data-lucide="calendar-check"></i>
                </div>
                <div class="leave-balance-info">
                    <h3>Leave Balance</h3>
                    <p>${leaveBalance}</p>
                    <span>of 10 leaves remaining</span>
                </div>
            </div>

            <div class="filter-bar">
                <select id="my-leave-month-filter" class="glass-select">
                    <option value="all">All Months</option>
                    ${generateMonthOptions()}
                </select>
            </div>

            <div class="content-box glass">
                <div class="attendance-table-container">
                    <table class="leave-history-table" id="my-leave-history-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Reason</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ownLeaves.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-secondary)">No leave requests found.</td></tr>'
                : ownLeaves.map(leave => `
                                    <tr data-month="${(leave.start || '').substring(0, 7)}">
                                        <td>${leave.type || 'N/A'}</td>
                                        <td>${leave.start || 'N/A'}</td>
                                        <td>${leave.end || 'N/A'}</td>
                                        <td>${leave.reason || 'N/A'}</td>
                                        <td><span class="status-badge status-${(leave.status || 'pending').toLowerCase()}">${leave.status || 'Pending'}</span></td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-overlay" id="my-leave-modal">
                <div class="modal-content glass">
                    <div class="box-header">
                        <h2>Create Leave</h2>
                        <button class="btn-close-icon" id="close-my-leave-modal"><i data-lucide="x"></i></button>
                    </div>
                    <form id="my-leave-form">
                        <div class="form-group">
                            <label>Leave Type</label>
                            <select id="my-leave-type" class="glass-select">
                                <option value="Casual Leave">Casual Leave</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Annual Leave">Annual Leave</option>
                                <option value="Unpaid Leave">Unpaid Leave</option>
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="my-leave-start" required>
                            </div>
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="my-leave-end" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Reason</label>
                            <input type="text" id="my-leave-reason" required placeholder="e.g. Vacation">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-outline" id="btn-cancel-my-leave">Cancel</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 20px;">Create Leave</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function generateMonthOptions() {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = d.toISOString().substring(0, 7);
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            months.push(`<option value="${value}">${label}</option>`);
        }
        return months.join('');
    }

    function setupLeaveEmployeeListeners() {
        const btn = document.getElementById('btn-request-leave');
        const modal = document.getElementById('leave-modal');
        const form = document.getElementById('leave-form');

        if (btn) btn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-leave-modal').onclick = () => closeAllModals();
        document.getElementById('btn-cancel-leave').onclick = () => closeAllModals();

        const monthFilter = document.getElementById('leave-month-filter');
        if (monthFilter) {
            monthFilter.onchange = () => {
                const rows = document.querySelectorAll('#leave-history-table tbody tr');
                rows.forEach(row => {
                    if (monthFilter.value === 'all' || row.getAttribute('data-month') === monthFilter.value) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            };
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const start = document.getElementById('leave-start').value;
                const end = document.getElementById('leave-end').value;
                const type = document.getElementById('leave-type').value;

                try {
                    const response = await apiCall(`${API_BASE_URL}/leaves`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leave_type: type,
                            start_date: start,
                            end_date: end,
                            reason: document.getElementById('leave-reason').value
                        })
                    });

                    const newLeave = {
                        id: response.id,
                        empId: response.employee_id,
                        name: response.employee_name || state.currentUser.name,
                        type: response.leave_type,
                        start: response.start_date,
                        end: response.end_date,
                        reason: response.reason,
                        status: response.status
                    };
                    state.leaves.push(newLeave);

                    addNotification('success', 'Leave Requested', 'Your leave request has been submitted.');
                    modal.style.display = 'none';
                    renderLeaves(document.getElementById('view-container'));
                } catch (error) {
                    console.error('Failed to request leave:', error);
                }
            };
        }
    }

    function setupLeaveHRListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.onclick = () => switchHRTab(btn.getAttribute('data-tab'));
        });

        const btn = document.getElementById('btn-create-leave');
        const modal = document.getElementById('leave-modal');
        const form = document.getElementById('leave-form');

        if (btn) btn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-leave-modal').onclick = () => closeAllModals();
        document.getElementById('btn-cancel-leave').onclick = () => closeAllModals();

        const statusFilter = document.getElementById('leave-status-filter');
        const monthFilter = document.getElementById('leave-month-filter');
        const nameFilter = document.getElementById('leave-name-filter');

        const filterLeaves = () => {
            const status = statusFilter ? statusFilter.value : 'all';
            const month = monthFilter ? monthFilter.value : 'all';
            const name = nameFilter ? nameFilter.value.toLowerCase() : '';

            const cards = document.querySelectorAll('.leave-card');
            cards.forEach(card => {
                const leaveId = parseInt(card.getAttribute('data-leave-id'));
                const leave = state.leaves.find(l => l.id === leaveId);
                if (!leave) return;

                const matchStatus = status === 'all' || leave.status === status;
                const matchMonth = month === 'all' || (leave.start || '').substring(0, 7) === month;
                const matchName = name === '' || leave.name.toLowerCase().includes(name);

                card.style.display = (matchStatus && matchMonth && matchName) ? '' : 'none';
            });
        };

        if (statusFilter) statusFilter.onchange = filterLeaves;
        if (monthFilter) monthFilter.onchange = filterLeaves;
        if (nameFilter) nameFilter.oninput = filterLeaves;

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const employeeId = parseInt(document.getElementById('leave-emp-name').value);
                const start = document.getElementById('leave-start').value;
                const end = document.getElementById('leave-end').value;
                const type = document.getElementById('leave-type').value;

                try {
                    const response = await apiCall(`${API_BASE_URL}/leaves`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employee_id: employeeId,
                            leave_type: type,
                            start_date: start,
                            end_date: end,
                            reason: document.getElementById('leave-reason').value
                        })
                    });

                    const emp = state.employees.find(e => e.id === employeeId);
                    const newLeave = {
                        id: response.id,
                        empId: response.employee_id,
                        name: emp ? emp.name : 'Unknown',
                        type: response.leave_type,
                        start: response.start_date,
                        end: response.end_date,
                        reason: response.reason,
                        status: response.status
                    };
                    state.leaves.push(newLeave);

                    addNotification('success', 'Leave Created', `Leave created for ${newLeave.name}.`);
                    modal.style.display = 'none';
                    renderLeaves(document.getElementById('view-container'));
                } catch (error) {
                    console.error('Failed to create leave:', error);
                }
            };
        }

        setupHRMyLeavesListeners();
    }

    function switchHRTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        const mgmtTab = document.getElementById('tab-management');
        const myLeavesTab = document.getElementById('tab-my-leaves');

        if (mgmtTab) mgmtTab.style.display = tabName === 'management' ? '' : 'none';
        if (myLeavesTab) myLeavesTab.style.display = tabName === 'my-leaves' ? '' : 'none';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function setupHRMyLeavesListeners() {
        const btn = document.getElementById('btn-my-leave-create');
        const modal = document.getElementById('my-leave-modal');
        const form = document.getElementById('my-leave-form');

        if (btn) btn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-my-leave-modal')?.addEventListener('click', () => closeAllModals());
        document.getElementById('btn-cancel-my-leave')?.addEventListener('click', () => closeAllModals());

        const monthFilter = document.getElementById('my-leave-month-filter');
        if (monthFilter) {
            monthFilter.onchange = () => {
                const rows = document.querySelectorAll('#my-leave-history-table tbody tr');
                rows.forEach(row => {
                    if (monthFilter.value === 'all' || row.getAttribute('data-month') === monthFilter.value) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            };
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const start = document.getElementById('my-leave-start').value;
                const end = document.getElementById('my-leave-end').value;
                const type = document.getElementById('my-leave-type').value;

                try {
                    const response = await apiCall(`${API_BASE_URL}/leaves`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leave_type: type,
                            start_date: start,
                            end_date: end,
                            reason: document.getElementById('my-leave-reason').value
                        })
                    });

                    const newLeave = {
                        id: response.id,
                        empId: response.employee_id,
                        name: response.employee_name || state.currentUser.name,
                        type: response.leave_type,
                        start: response.start_date,
                        end: response.end_date,
                        reason: response.reason,
                        status: response.status
                    };
                    state.leaves.push(newLeave);

                    addNotification('success', 'Leave Created', 'Your leave has been created.');
                    modal.style.display = 'none';
                    renderLeaves(document.getElementById('view-container'));
                } catch (error) {
                    console.error('Failed to create leave:', error);
                }
            };
        }
    }

    window.updateLeaveStatus = async (id, status) => {
        try {
            await apiCall(`${API_BASE_URL}/leaves/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            const leaveIndex = state.leaves.findIndex(l => l.id === id);
            if (leaveIndex !== -1) {
                state.leaves[leaveIndex].status = status;
            }

            addNotification(
                status === 'Approved' ? 'success' : 'error',
                `Leave ${status}`,
                `Leave request has been ${status.toLowerCase()}.`
            );

            if (status === 'Approved') syncEmployeeStatuses();

            const leaveCard = document.querySelector(`.leave-card[data-leave-id="${id}"]`);
            if (leaveCard) {
                const badge = leaveCard.querySelector('.status-badge');
                if (badge) {
                    badge.textContent = status;
                    badge.className = `status-badge status-${status.toLowerCase()}`;
                }
                const actionsDiv = leaveCard.querySelector('.leave-actions');
                if (actionsDiv) actionsDiv.remove();
            }
        } catch (error) {
            console.error('Failed to update leave status:', error);
        }
    };

    // --- Attendance View ---
    function renderAttendance(container) {
        const userRole = state.currentUser.role;
        const records = userRole === 'hr' ? state.attendance : state.attendance.filter(a => a.employee_id === state.currentUser.id);

        container.innerHTML = `
            <div class="directory-header">
                <h2>Attendance Logs</h2>
                <div class="directory-controls">
                     <span style="color:var(--text-secondary); font-size:0.9rem">Current Month: ${new Date().toLocaleString('default', { month: 'long' })}</span>
                </div>
            </div>

            <div class="stats-grid" style="margin-bottom: var(--space-lg); display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-md);">
                ${(() => {
                    const stats = calculateAttendanceStats(records);
                    return `
                        <div class="stat-card glass" style="flex-direction:row; align-items:center; gap:20px;">
                            ${generatePieChart(stats.percentage)}
                            <div class="stat-info">
                                <h3>Efficiency</h3>
                                <p>${stats.percentage}%</p>
                                <span style="font-size:0.8rem; color:var(--text-secondary)">Attendance Rate</span>
                            </div>
                        </div>
                        <div class="stat-card glass" style="flex-direction:column; align-items:stretch;">
                            <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                                <h3>Late Trends</h3>
                                <span style="font-size:0.8rem; color:var(--text-secondary)">Last 7 Days</span>
                            </div>
                            ${generateBarChart(records)}
                        </div>
                    `;
                })()}
            </div>

            <div class="content-box glass">
                <div class="clock-card" style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-md); margin-bottom: var(--space-lg);">
                    <p style="font-size: 0.9rem; color: var(--text-secondary);" id="clock-status">
                        ${state.isClockedIn ? `Clocked in at ${state.lastClockInTime}` : 'Not clocked in yet'}
                    </p>
                    <button class="btn-primary" id="btn-toggle-clock" style="width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                        <i data-lucide="${state.isClockedIn ? 'log-out' : 'log-in'}" style="width: 32px; height: 32px;"></i>
                        <span>${state.isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                    </button>
                </div>

                <div class="attendance-table-container">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                ${userRole === 'hr' ? '<th>Employee</th>' : ''}
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Total Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.length === 0
                ? `<tr><td colspan="${userRole === 'hr' ? 6 : 5}" style="text-align:center; padding:40px; color:var(--text-secondary)">No attendance records found.</td></tr>`
                : records.map(log => {
                    const hasClockOut = log.clockOut && log.clockOut !== '--:--';
                    const diff = hasClockOut && log.clockIn ? calculateHours(log.clockIn, log.clockOut) : '--';
                    return `
                                        <tr>
                                            ${userRole === 'hr' ? `<td>${log.employee_name || 'Unknown'}</td>` : ''}
                                            <td>${log.date || 'N/A'}</td>
                                            <td>${log.clockIn || '--:--'}</td>
                                            <td>${log.clockOut || '--:--'}</td>
                                            <td>${diff}</td>
                                            <td><span class="status-badge status-approved">${log.status || 'N/A'}</span></td>
                                        </tr>
                                    `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        setupAttendanceListeners();
    }

    function calculateAttendanceStats(records) {
        if (!records || records.length === 0) return { percentage: 0, late: 0, absent: 0 };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonthSoFar = now.getDate();

        const monthlyLogs = records.filter(log => {
            if (!log.date) return false;
            const logDate = new Date(log.date);
            return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });

        const uniqueDaysPresent = new Set(monthlyLogs.map(l => l.date)).size;
        const percentage = Math.round((uniqueDaysPresent / Math.max(daysInMonthSoFar, 1)) * 100);
        const lateCount = monthlyLogs.filter(l => l.status === 'Late').length;
        const absentCount = Math.max(0, daysInMonthSoFar - uniqueDaysPresent);

        return { percentage, late: lateCount, absent: absentCount };
    }

    function generatePieChart(percentage) {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        const color = percentage >= 90 ? 'var(--success)' : percentage >= 75 ? 'var(--warning)' : 'var(--danger)';

        return `
            <svg width="80" height="80" viewBox="0 0 80 80" style="transform: rotate(-90deg);">
                <circle cx="40" cy="40" r="${radius}" stroke="var(--border-color)" stroke-width="8" fill="none" opacity="0.3"></circle>
                <circle cx="40" cy="40" r="${radius}" stroke="${color}" stroke-width="8" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"></circle>
                <text x="40" y="40" text-anchor="middle" dy="5" font-size="14" fill="var(--text-primary)" style="transform: rotate(90deg); transform-origin: center;">${percentage}%</text>
            </svg>
        `;
    }

    function generateBarChart(logs) {
        if (!logs) logs = [];
        const today = new Date();
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const log = logs.find(l => l.date === dateStr);
            let height = 0;
            let color = 'var(--border-color)';

            if (log) {
                if (log.status === 'On Time') { height = 40; color = 'var(--success)'; }
                else if (log.status === 'Late') { height = 25; color = 'var(--warning)'; }
                else { height = 10; color = 'var(--danger)'; }
            } else {
                height = 10; color = 'var(--danger)';
            }
            data.push({ date: d.getDate(), height, color });
        }

        return `
            <svg width="100%" height="60" viewBox="0 0 200 60">
                ${data.map((d, i) => `
                    <rect x="${i * 28 + 10}" y="${50 - d.height}" width="16" height="${d.height}" rx="4" fill="${d.color}"></rect>
                    <text x="${i * 28 + 18}" y="60" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${d.date}</text>
                `).join('')}
            </svg>
        `;
    }

    function calculateHours(start, end) {
        if (!start || !end) return '--';
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const d1 = new Date(); d1.setHours(h1, m1);
        const d2 = new Date(); d2.setHours(h2, m2);
        const diff = (d2 - d1) / 1000 / 60 / 60;
        return diff >= 0 ? diff.toFixed(1) + ' hrs' : '--';
    }

    function setupAttendanceListeners() {
        const clockBtn = document.getElementById('btn-toggle-clock');
        if (!clockBtn) return;

        clockBtn.onclick = async () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (!state.isClockedIn) {
                try {
                    const response = await apiCall(`${API_BASE_URL}/attendance/clock-in`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });

                    state.isClockedIn = true;
                    state.lastClockInTime = new Date(response.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    addNotification('success', 'Clocked In', `You clocked in at ${state.lastClockInTime}`);

                    const clockStatus = document.getElementById('clock-status');
                    if (clockStatus) clockStatus.textContent = `Clocked in at ${state.lastClockInTime}`;
                    const icon = clockBtn.querySelector('[data-lucide]');
                    const label = clockBtn.querySelector('span');
                    if (icon) { icon.setAttribute('data-lucide', 'log-out'); lucide.createIcons(); }
                    if (label) label.textContent = 'Clock Out';
                } catch (error) {
                    console.error('Failed to clock in:', error);
                }
            } else {
                try {
                    await apiCall(`${API_BASE_URL}/attendance/clock-out`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });

                    state.isClockedIn = false;
                    state.lastClockInTime = null;

                    addNotification('info', 'Clocked Out', `You clocked out at ${timeStr}`);

                    const clockStatus = document.getElementById('clock-status');
                    if (clockStatus) clockStatus.textContent = 'Not clocked in yet';
                    const icon = clockBtn.querySelector('[data-lucide]');
                    const label = clockBtn.querySelector('span');
                    if (icon) { icon.setAttribute('data-lucide', 'log-in'); lucide.createIcons(); }
                    if (label) label.textContent = 'Clock In';
                } catch (error) {
                    console.error('Failed to clock out:', error);
                }
            }
        };
    }

    // --- Payroll View ---
    function renderPayroll(container) {
        container.innerHTML = `
            <div class="directory-header">
                <h2>Payroll Management</h2>
                <div class="directory-controls">
                     <span style="color:var(--text-secondary); font-size:0.9rem">Cycle: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </div>
            </div>
            <div class="content-box glass">
                <div class="attendance-table-container">
                    <table class="attendance-table payroll-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Role</th>
                                <th>Base Salary</th>
                                <th>Bonuses</th>
                                <th>Deductions</th>
                                <th>Net Pay</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => {
            const pay = state.payroll.find(p => p.empId === emp.id);
            if (!pay) return '';
            return `
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:10px;">
                                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}" style="width:30px; height:30px; border-radius:50%">
                                                <span>${emp.name}</span>
                                            </div>
                                        </td>
                                        <td>${emp.role || 'N/A'}</td>
                                        <td>$${(pay.basic || 0).toLocaleString()}</td>
                                        <td style="color:var(--success)">+$${(pay.bonus || 0).toLocaleString()}</td>
                                        <td style="color:var(--danger)">-$${(pay.deductions || 0).toLocaleString()}</td>
                                        <td style="font-weight:600">$${(pay.net || 0).toLocaleString()}</td>
                                        <td>
                                            <button class="btn-outline btn-icon" onclick="window.generatePayslip(${emp.id})">
                                                <i data-lucide="file-text"></i> Payslip
                                            </button>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-overlay" id="payslip-modal">
                <div class="modal-content glass payslip-modal">
                    <div class="box-header">
                        <h2>Employee Payslip</h2>
                        <button class="btn-close-icon" id="close-payslip"><i data-lucide="x"></i></button>
                    </div>
                    <div id="payslip-content"></div>
                    <div class="modal-footer">
                        <button class="btn-outline" id="btn-cancel-payslip">Close</button>
                        <button class="btn-primary print-btn" onclick="window.printPayslip()">
                            <i data-lucide="printer"></i> Print Payslip
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('close-payslip').onclick = () => closeAllModals();
        document.getElementById('btn-cancel-payslip').onclick = () => closeAllModals();
    }

    // --- Payslip View (Employee/GM) ---
    function renderPayslip(container) {
        const userRole = state.currentUser.role;
        const myPayslips = userRole === 'hr'
            ? state.payroll
            : state.payroll.filter(p => p.empId === state.currentUser.id);

        container.innerHTML = `
            <div class="directory-header">
                <h2>${userRole === 'hr' ? 'All Payslips' : 'My Payslips'}</h2>
            </div>

            <div class="filter-bar">
                <select id="payslip-month-filter" class="glass-select">
                    <option value="all">All Months</option>
                    ${generateMonthOptions()}
                </select>
                ${userRole === 'hr' ? `
                <input type="text" id="payslip-name-filter" placeholder="Search by name..." style="padding: 10px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); outline: none; font-family: inherit; font-size: 0.9rem;">
                ` : ''}
            </div>

            <div class="content-box glass">
                <div class="attendance-table-container">
                    <table class="payslip-history-table" id="payslip-table">
                        <thead>
                            <tr>
                                ${userRole === 'hr' ? '<th>Employee</th><th>Role</th>' : ''}
                                <th>Month</th>
                                <th>Base Salary</th>
                                <th>Bonus</th>
                                <th>Deductions</th>
                                <th>Net Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${myPayslips.length === 0
                ? `<tr><td colspan="${userRole === 'hr' ? 7 : 6}" style="text-align:center; padding:40px; color:var(--text-secondary)">No payslip records found.</td></tr>`
                : myPayslips.map(pay => {
                    const monthStr = pay.month || '';
                    const monthLabel = monthStr ? new Date(monthStr + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A';
                    const empName = pay.employee_name ? pay.employee_name.toLowerCase() : '';
                    return `
                                        <tr data-month="${monthStr}" data-name="${empName}">
                                            ${userRole === 'hr' ? `<td>${pay.employee_name || 'N/A'}</td><td>${pay.employee_role || 'N/A'}</td>` : ''}
                                            <td>${monthLabel}</td>
                                            <td>$${(pay.basic || 0).toLocaleString()}</td>
                                            <td style="color:var(--success)">+$${(pay.bonus || 0).toLocaleString()}</td>
                                            <td style="color:var(--danger)">-$${(pay.deductions || 0).toLocaleString()}</td>
                                            <td style="font-weight:600">$${(pay.net || 0).toLocaleString()}</td>
                                        </tr>
                                    `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const monthFilter = document.getElementById('payslip-month-filter');
        const nameFilter = document.getElementById('payslip-name-filter');

        const filterPayslips = () => {
            const month = monthFilter ? monthFilter.value : 'all';
            const name = nameFilter ? nameFilter.value.toLowerCase() : '';

            const rows = document.querySelectorAll('#payslip-table tbody tr');
            rows.forEach(row => {
                const matchMonth = month === 'all' || row.getAttribute('data-month') === month;
                const matchName = name === '' || (row.getAttribute('data-name') || '').includes(name);
                row.style.display = (matchMonth && matchName) ? '' : 'none';
            });
        };

        if (monthFilter) monthFilter.onchange = filterPayslips;
        if (nameFilter) nameFilter.oninput = filterPayslips;
    }

    window.generatePayslip = (id) => {
        const emp = state.employees.find(e => e.id === id);
        if (!emp) return;

        const pay = state.payroll.find(p => p.empId === id);
        if (!pay) return;

        const monthStr = pay.month || '';
        const month = monthStr ? new Date(monthStr + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A';

        const content = `
            <div class="payslip-header">
                <h3>HR Pro Management</h3>
                <p style="color:var(--text-secondary)">Monthly Salary Statement - ${month}</p>
            </div>
            <div class="payslip-grid">
                <div class="payslip-section">
                    <h4>Employee Details</h4>
                    <div class="payslip-row"><span>Name:</span> <span>${emp.name}</span></div>
                    <div class="payslip-row"><span>ID:</span> <span>#EMP-${emp.id.toString().padStart(4, '0')}</span></div>
                    <div class="payslip-row"><span>Role:</span> <span>${emp.role}</span></div>
                    <div class="payslip-row"><span>Department:</span> <span>${emp.dept}</span></div>
                </div>
                <div class="payslip-section">
                    <h4>Payment Summary</h4>
                    <div class="payslip-row"><span>Basic Salary:</span> <span>$${pay.basic.toLocaleString()}</span></div>
                    <div class="payslip-row"><span>Performance Bonus:</span> <span style="color:var(--success)">+$${pay.bonus.toLocaleString()}</span></div>
                    <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border-color);">
                    <div class="payslip-row"><span>Deductions:</span> <span style="color:var(--danger)">-$${pay.deductions.toLocaleString()}</span></div>
                    <div class="payslip-row total"><span>Net Salary:</span> <span>$${pay.net.toLocaleString()}</span></div>
                </div>
            </div>
        `;

        document.getElementById('payslip-content').innerHTML = content;
        document.getElementById('payslip-modal').style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    };

    window.printPayslip = () => {
        window.print();
    };

    // --- Global Helpers ---
    window.navTo = (page) => {
        const role = (state.currentUser.role || '').toLowerCase();
        const allowed = rolePermissions[role] || [];
        if (!allowed.includes(page)) {
            console.warn('navTo - page not allowed:', page, 'for role:', role);
            return;
        }

        console.log('navTo - navigating to:', page);
        state.currentPage = page;
        const navItems = document.querySelectorAll('#nav-list li[data-page]');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        renderCurrentView();
    };

    window.deleteEmployee = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        try {
            await apiCall(`${API_BASE_URL}/employees/${id}`, {
                method: 'DELETE'
            });

            state.employees = state.employees.filter(emp => emp.id !== id);
            addNotification('success', 'Employee Deleted', 'Employee has been removed from the directory.');

            const cards = document.querySelectorAll('.emp-card');
            for (const card of cards) {
                const deleteBtn = card.querySelector(`[onclick*="${id}"]`);
                if (deleteBtn) {
                    card.remove();
                    break;
                }
            }
        } catch (error) {
            console.error('Failed to delete employee:', error);
        }
    };

    window.editEmployee = (id) => {
        const emp = state.employees.find(e => e.id === id);
        if (!emp) return;

        state.editingId = id;
        document.getElementById('modal-title').innerText = 'Edit Employee';
        document.getElementById('new-name').value = emp.name;
        document.getElementById('new-role').value = emp.role;
        document.getElementById('new-dept').value = emp.dept;
        document.getElementById('new-email').value = emp.email;
        document.getElementById('new-status').value = emp.status || 'Active';

        document.getElementById('add-modal').style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    };

    function setupEventListeners() {
        const navLinks = document.querySelectorAll('#nav-list li[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                window.navTo(page);
            });
        });

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.onclick = () => handleLogout();
        }

        const profileWrapper = document.getElementById('profile-wrapper');
        const profileDropdown = document.getElementById('profile-dropdown');

        if (profileWrapper) {
            profileWrapper.onclick = (e) => {
                e.stopPropagation();
                if (profileDropdown) {
                    profileDropdown.classList.toggle('active');
                    if (profileDropdown.classList.contains('active')) {
                        updateTopBar();
                        if (window.lucide) lucide.createIcons();
                    }
                }
            };
        }

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.onclick = () => {
                state.theme = state.theme === 'dark' ? 'light' : 'dark';
                applyTheme(state.theme);
            };
        }

        const bell = document.querySelector('.notifications');
        if (bell) {
            bell.onclick = (e) => {
                e.stopPropagation();
                toggleNotifications();
            };
        }

        const paletteInput = document.getElementById('palette-input');
        const topSearchBar = document.querySelector('.search-bar input');

        if (topSearchBar) {
            topSearchBar.onclick = (e) => {
                e.preventDefault();
                toggleSearchPalette();
            };
            topSearchBar.onfocus = (e) => {
                e.preventDefault();
                topSearchBar.blur();
                toggleSearchPalette();
            };
        }

        if (paletteInput) {
            paletteInput.oninput = (e) => renderPaletteResults(e.target.value);
            paletteInput.onkeydown = (e) => {
                const results = document.getElementById('palette-results');
                const items = results.querySelectorAll('.search-item');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    paletteState.selectedIndex = (paletteState.selectedIndex + 1) % paletteState.currentResults.length;
                    updatePaletteSelection(items);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    paletteState.selectedIndex = (paletteState.selectedIndex - 1 + paletteState.currentResults.length) % paletteState.currentResults.length;
                    updatePaletteSelection(items);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (paletteState.currentResults[paletteState.selectedIndex]) {
                        paletteState.currentResults[paletteState.selectedIndex].action();
                        toggleSearchPalette();
                    }
                }
            };
        }

        function updatePaletteSelection(items) {
            items.forEach(item => item.classList.remove('selected'));
            if (items[paletteState.selectedIndex]) {
                items[paletteState.selectedIndex].classList.add('selected');
                items[paletteState.selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }

    function setupGlobalListeners() {
        if (globalListenersAttached) return;

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) closeAllModals();
            if (e.target.classList.contains('search-palette')) {
                document.getElementById('search-palette').style.display = 'none';
            }
            const profileDropdown = document.getElementById('profile-dropdown');
            const profileWrapper = document.getElementById('profile-wrapper');
            if (profileDropdown && !profileDropdown.contains(e.target) && e.target !== profileWrapper) {
                profileDropdown.classList.remove('active');
            }
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllModals();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearchPalette();
            }
        });

        globalListenersAttached = true;
    }

    function syncEmployeeStatuses() {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;

        state.employees.forEach(emp => {
            if (emp.status !== 'Active' && emp.status !== 'On Leave' && emp.status !== undefined) return;

            const activeLeave = state.leaves.find(l =>
                l.empId === emp.id &&
                l.status === 'Approved' &&
                today >= l.start &&
                today <= l.end
            );

            const newStatus = activeLeave ? 'On Leave' : 'Active';
            if (emp.status !== newStatus) {
                emp.status = newStatus;
                hasChanges = true;
            }
        });

        if (hasChanges) saveToStorage();
    }
});
