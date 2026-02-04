/**
 * HR Pro - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial Mock Data
    const initialEmployees = [
        { id: 1, name: 'Alice Johnson', role: 'UX Designer', dept: 'Design', email: 'alice@example.com', joinDate: '2023-05-12', status: 'Active' },
        { id: 2, name: 'Bob Smith', role: 'Frontend Developer', dept: 'Engineering', email: 'bob@example.com', joinDate: '2023-08-20', status: 'Active' },
        { id: 3, name: 'Charlie Davis', role: 'Project Manager', dept: 'Operations', email: 'charlie@example.com', joinDate: '2024-01-10', status: 'Active' }
    ];

    // Core App State
    const state = {
        currentPage: 'dashboard',
        employees: JSON.parse(localStorage.getItem('hr_employees')) || initialEmployees,
        leaves: JSON.parse(localStorage.getItem('hr_leaves')) || [
            { id: 1, empId: 1, name: 'Alice Johnson', type: 'Annual Leave', start: '2024-02-10', end: '2024-02-15', status: 'pending', reason: 'Family vacation' },
            { id: 2, empId: 2, name: 'Bob Smith', type: 'Sick Leave', start: '2024-01-20', end: '2024-01-22', status: 'approved', reason: 'Flu' }
        ],
        attendance: JSON.parse(localStorage.getItem('hr_attendance')) || [],
        payroll: JSON.parse(localStorage.getItem('hr_payroll')) || [
            { empId: 1, basic: 4500, allowance: 800, bonus: 200, tax: 150, insurance: 100 },
            { empId: 2, basic: 5200, allowance: 900, bonus: 300, tax: 200, insurance: 120 },
            { empId: 3, basic: 5800, allowance: 1000, bonus: 400, tax: 250, insurance: 150 }
        ],
        isClockedIn: JSON.parse(localStorage.getItem('hr_isClockedIn')) || false,
        lastClockInTime: localStorage.getItem('hr_lastClockInTime') || null,
        editingId: null,
        currentUser: {
            name: 'Admin User',
            role: 'Administrator'
        },
        theme: localStorage.getItem('hr_theme') || 'dark',
        notifications: JSON.parse(localStorage.getItem('hr_notifications')) || []
    };

    // Initialize UI
    init();

    function init() {
        applyTheme(state.theme);
        syncEmployeeStatuses();
        renderCurrentView();
        setupEventListeners();
        updateBadge();
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

    // Persistence
    function saveToStorage() {
        localStorage.setItem('hr_employees', JSON.stringify(state.employees));
        localStorage.setItem('hr_notifications', JSON.stringify(state.notifications));
        localStorage.setItem('hr_payroll', JSON.stringify(state.payroll));
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

        // 1. Static Feature Actions
        const features = [
            { title: 'Go to Dashboard', cat: 'Navigation', icon: 'layout-dashboard', action: () => window.navTo('dashboard') },
            { title: 'Go to Directory', cat: 'Navigation', icon: 'users', action: () => window.navTo('directory') },
            { title: 'Go to Leaves', cat: 'Navigation', icon: 'calendar', action: () => window.navTo('leaves') },
            { title: 'Go to Attendance', cat: 'Navigation', icon: 'clock', action: () => window.navTo('attendance') },
            { title: 'Go to Payroll', cat: 'Navigation', icon: 'credit-card', action: () => window.navTo('payroll') },
            { title: 'Add New Employee', cat: 'Action', icon: 'user-plus', action: () => { window.navTo('directory'); setTimeout(() => document.getElementById('btn-add-employee')?.click(), 100); } },
            { title: 'Request Leave', cat: 'Action', icon: 'calendar-plus', action: () => { window.navTo('leaves'); setTimeout(() => document.getElementById('btn-request-leave')?.click(), 100); } },
            { title: 'Toggle Light/Dark Mode', cat: 'System', icon: 'sun', action: () => document.getElementById('theme-toggle')?.click() }
        ];

        // 2. Employee Results
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
            default:
                container.innerHTML = `<h1>${state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}</h1><p>Coming soon...</p>`;
        }

        if (window.lucide) lucide.createIcons();
    }

    // --- Dashboard View ---
    function renderDashboard(container) {
        const activeLeaves = state.leaves.filter(l => l.status === 'approved').length;
        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card glass">
                    <div class="stat-icon blue"><i data-lucide="users"></i></div>
                    <div class="stat-info">
                        <h3>Total Employees</h3>
                        <p>${state.employees.filter(e => (e.status || 'Active') !== 'Terminated' && (e.status || 'Active') !== 'Resigned').length}</p>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-icon green"><i data-lucide="calendar-check"></i></div>
                    <div class="stat-info">
                        <h3>Active Leaves</h3>
                        <p>${activeLeaves}</p>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-icon orange"><i data-lucide="clock"></i></div>
                    <div class="stat-info">
                        <h3>On Time Today</h3>
                        <p>100%</p>
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
                <!-- Personal Records / Attendance Widget -->
                <div class="content-box glass">
                    <div class="box-header">
                        <h2>Personal Records</h2>
                    </div>
                    <div class="clock-card" style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-md);">
                        <p style="font-size: 0.9rem; color: var(--text-secondary);" id="clock-status">
                            ${state.isClockedIn ? `Clocked in at ${state.lastClockInTime}` : 'Not clocked in yet'}
                        </p>
                        <button class="btn-primary" id="btn-toggle-clock" style="width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                            <i data-lucide="${state.isClockedIn ? 'log-out' : 'log-in'}" style="width: 32px; height: 32px;"></i>
                            <span>${state.isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        setupDashboardListeners();
    }

    function setupDashboardListeners() {
        const clockBtn = document.getElementById('btn-toggle-clock');
        if (clockBtn) {
            clockBtn.onclick = () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = now.toISOString().split('T')[0];

                if (!state.isClockedIn) {
                    state.isClockedIn = true;
                    state.lastClockInTime = timeStr;
                    state.attendance.push({
                        id: Date.now(),
                        date: dateStr,
                        clockIn: timeStr,
                        clockOut: '--:--',
                        status: 'On Time'
                    });
                    addNotification('success', 'Clocked In', `You clocked in at ${timeStr}`);
                } else {
                    state.isClockedIn = false;
                    const lastRecord = state.attendance[state.attendance.length - 1];
                    if (lastRecord) lastRecord.clockOut = timeStr;
                    state.lastClockInTime = null;
                    addNotification('info', 'Clocked Out', `You clocked out at ${timeStr}`);
                }

                localStorage.setItem('hr_isClockedIn', state.isClockedIn);
                localStorage.setItem('hr_lastClockInTime', state.lastClockInTime);
                localStorage.setItem('hr_attendance', JSON.stringify(state.attendance));
                renderCurrentView();
            };
        }
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

            <!-- Modal for Add/Edit -->
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
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('new-name').value;
                const role = document.getElementById('new-role').value;
                const dept = document.getElementById('new-dept').value;
                const email = document.getElementById('new-email').value;
                const status = document.getElementById('new-status').value;

                if (state.editingId) {
                    const idx = state.employees.findIndex(emp => emp.id === state.editingId);
                    if (idx !== -1) {
                        state.employees[idx] = { ...state.employees[idx], name, role, dept, email, status };
                    }
                } else {
                    state.employees.push({
                        id: Date.now(),
                        name, role, dept, email, status,
                        joinDate: new Date().toISOString().split('T')[0]
                    });
                    addNotification('success', 'Employee Added', `${name} has been added to the directory.`);
                }

                saveToStorage();
                modal.style.display = 'none';
                renderCurrentView();
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
    function renderLeaves(container) {
        container.innerHTML = `
            <div class="directory-header">
                <h2>Leave Requests</h2>
                <button class="btn-primary" id="btn-request-leave" style="padding: 10px 20px;">
                    <i data-lucide="calendar-plus"></i> Request Leave
                </button>
            </div>
            <div class="leave-grid">
                ${state.leaves.length === 0 ? '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary)">No leave requests found.</div>' : ''}
                ${state.leaves.slice().reverse().map(leave => `
                    <div class="leave-card glass">
                        <div class="leave-header">
                            <div class="leave-requester">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.name}" alt="${leave.name}">
                                <div>
                                    <h4 style="margin:0">${leave.name}</h4>
                                    <div style="display:flex; gap:5px; align-items:center;">
                                        <span style="font-size:0.8rem; color:var(--text-secondary)">${leave.type}</span>
                                        ${leave.isHalfDay ? '<span class="status-badge" style="background:rgba(134,239,172,0.1); color:var(--accent-color); font-size:0.65rem; padding: 2px 6px;">Half-Day</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            <span class="status-badge status-${leave.status}">${leave.status}</span>
                        </div>
                        <div class="leave-details">
                            <p><i data-lucide="calendar" style="width:14px;"></i> ${leave.start} to ${leave.end}</p>
                            <p><i data-lucide="info" style="width:14px;"></i> ${leave.reason}</p>
                        </div>
                        ${leave.status === 'pending' ? `
                            <div class="leave-actions">
                                <button class="btn-icon btn-primary" onclick="window.updateLeaveStatus(${leave.id}, 'approved')">Approve</button>
                                <button class="btn-icon btn-danger-outline" onclick="window.updateLeaveStatus(${leave.id}, 'rejected')">Reject</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- Leave Request Modal -->
            <div class="modal-overlay" id="leave-modal">
                <div class="modal-content glass">
                    <div class="box-header">
                        <h2>Request Time Off</h2>
                        <button class="btn-close-icon" id="close-leave-modal"><i data-lucide="x"></i></button>
                    </div>
                    <form id="leave-form">
                        <div class="form-group">
                            <label>Employee Name</label>
                            <select id="leave-emp-name" class="glass-select" required>
                                ${state.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                            <div style="flex:1;">
                                <label>Leave Type</label>
                                <select id="leave-type" class="glass-select">
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                </select>
                            </div>
                            <div style="margin-left: 20px; display: flex; align-items: center; gap: 8px; margin-top: 15px;">
                                <input type="checkbox" id="leave-half-day" style="width:18px; height:18px; cursor:pointer;">
                                <label style="margin:0; cursor:pointer;" for="leave-half-day">Half-Day</label>
                            </div>
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

        setupLeaveListeners();
    }

    function setupLeaveListeners() {
        const btn = document.getElementById('btn-request-leave');
        const modal = document.getElementById('leave-modal');
        const form = document.getElementById('leave-form');

        if (btn) btn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-leave-modal').onclick = () => closeAllModals();
        document.getElementById('btn-cancel-leave').onclick = () => closeAllModals();

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const empName = document.getElementById('leave-emp-name').value;
                const start = document.getElementById('leave-start').value;
                const end = document.getElementById('leave-end').value;
                const type = document.getElementById('leave-type').value;
                const isHalfDay = document.getElementById('leave-half-day').checked;

                // --- Conflict Detection ---
                const hasConflict = state.leaves.some(l => {
                    if (l.name !== empName || l.status === 'rejected') return false;
                    // Check if [start, end] overlaps with [l.start, l.end]
                    return (start <= l.end && end >= l.start);
                });

                if (hasConflict) {
                    addNotification('warning', 'Leave Conflict', `Already has a leave scheduled during this period.`);
                    return; // Stop submission
                }

                const newLeave = {
                    id: Date.now(),
                    name: empName,
                    type: type,
                    start: start,
                    end: end,
                    isHalfDay: isHalfDay,
                    reason: document.getElementById('leave-reason').value,
                    status: 'pending'
                };
                state.leaves.push(newLeave);
                localStorage.setItem('hr_leaves', JSON.stringify(state.leaves));
                modal.style.display = 'none';
                renderCurrentView();
            };
        }
    }

    window.updateLeaveStatus = (id, status) => {
        const leave = state.leaves.find(l => l.id === id);
        if (leave) {
            leave.status = status;
            localStorage.setItem('hr_leaves', JSON.stringify(state.leaves));
            addNotification(
                status === 'approved' ? 'success' : 'error',
                `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                `Request for ${leave.name} has been ${status}.`
            );

            if (status === 'approved') syncEmployeeStatuses();
            renderCurrentView();
        }
    };

    // --- Attendance View ---
    function renderAttendance(container) {
        container.innerHTML = `
            <div class="directory-header">
                <h2>Attendance Logs</h2>
                <div class="directory-controls">
                     <span style="color:var(--text-secondary); font-size:0.9rem">Current Month: ${new Date().toLocaleString('default', { month: 'long' })}</span>
                </div>
            </div>

            <!-- Attendance Stats Cards -->
            <div class="stats-grid" style="margin-bottom: var(--space-lg); display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-md);">
                ${(() => {
                const stats = calculateAttendanceStats();
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
                            ${generateBarChart(state.attendance)}
                        </div>
                    `;
            })()}
            </div>

            <div class="content-box glass">
                <div class="attendance-table-container">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Total Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.attendance.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-secondary)">No attendance records found.</td></tr>'
                : state.attendance.slice().reverse().map(log => {
                    const diff = log.clockOut !== '--:--' ? calculateHours(log.clockIn, log.clockOut) : '--';
                    return `
                                        <tr>
                                            <td>${log.date}</td>
                                            <td>${log.clockIn}</td>
                                            <td>${log.clockOut}</td>
                                            <td>${diff}</td>
                                            <td><span class="status-badge ${log.status === 'On Time' ? 'status-approved' : 'status-warning'}">${log.status}</span></td>
                                        </tr>
                                    `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function calculateAttendanceStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonthSoFar = now.getDate(); // Simple logic: days elapsed

        const monthlyLogs = state.attendance.filter(log => {
            const logDate = new Date(log.date);
            return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });

        // Filter unique days present
        const uniqueDaysPresent = new Set(monthlyLogs.map(l => l.date)).size;

        // Calculate Stats
        const percentage = Math.round((uniqueDaysPresent / Math.max(daysInMonthSoFar, 1)) * 100);
        const lateCount = monthlyLogs.filter(l => l.status === 'Late').length;
        const absentCount = Math.max(0, daysInMonthSoFar - uniqueDaysPresent); // Simplified absence logic

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
        // Get last 7 days data
        const today = new Date();
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const log = logs.find(l => l.date === dateStr);
            // 100% height for on-time service, 50% for late, 0 for absent/no-record
            let height = 0;
            let color = 'var(--border-color)';

            if (log) {
                if (log.status === 'On Time') { height = 40; color = 'var(--success)'; }
                else if (log.status === 'Late') { height = 25; color = 'var(--warning)'; }
                else { height = 10; color = 'var(--danger)'; } // Absent/Other
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
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const d1 = new Date(); d1.setHours(h1, m1);
        const d2 = new Date(); d2.setHours(h2, m2);
        const diff = (d2 - d1) / 1000 / 60 / 60;
        return diff >= 0 ? diff.toFixed(1) + ' hrs' : '--';
    }

    // --- Payroll View ---
    function renderPayroll(container) {
        container.innerHTML = `
            <div class="directory-header">
                <h2>Payroll Management</h2>
                <div class="directory-controls">
                     <span style="color:var(--text-secondary); font-size:0.9rem">Cycle: Jan 2024</span>
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
            let pay = state.payroll.find(p => p.empId === emp.id);
            if (!pay) {
                // Default structure if missing
                pay = { basic: 0, allowance: 0, bonus: 0, tax: 0, insurance: 0 };
            }
            const totalDeductions = pay.tax + pay.insurance;
            const net = pay.basic + pay.allowance + pay.bonus - totalDeductions;

            return `
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:10px;">
                                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}" style="width:30px; height:30px; border-radius:50%">
                                                <span>${emp.name}</span>
                                            </div>
                                        </td>
                                        <td>${emp.role}</td>
                                        <td>$${pay.basic.toLocaleString()}</td>
                                        <td style="color:var(--success)">+$${(pay.bonus + pay.allowance).toLocaleString()}</td>
                                        <td style="color:var(--danger)">-$${totalDeductions.toLocaleString()}</td>
                                        <td style="font-weight:600">$${net.toLocaleString()}</td>
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

            <!-- Payslip Modal -->
            <div class="modal-overlay" id="payslip-modal">
                <div class="modal-content glass payslip-modal">
                    <div class="box-header">
                        <h2>Employee Payslip</h2>
                        <button class="btn-close-icon" id="close-payslip"><i data-lucide="x"></i></button>
                    </div>
                    <div id="payslip-content">
                        <!-- Dynamic Content -->
                    </div>
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

    window.generatePayslip = (id) => {
        const emp = state.employees.find(e => e.id === id);
        if (!emp) return;

        let pay = state.payroll.find(p => p.empId === id);
        if (!pay) pay = { basic: 0, allowance: 0, bonus: 0, tax: 0, insurance: 0 };

        const totalEarnings = pay.basic + pay.allowance + pay.bonus;
        const totalDeductions = pay.tax + pay.insurance;
        const net = totalEarnings - totalDeductions;
        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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
                    <div class="payslip-row"><span>House Rent Allowance:</span> <span>$${pay.allowance.toLocaleString()}</span></div>
                    <div class="payslip-row"><span>Performance Bonus:</span> <span style="color:var(--success)">+$${pay.bonus.toLocaleString()}</span></div>
                    <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border-color);">
                    <div class="payslip-row"><span>Tax Deductions:</span> <span style="color:var(--danger)">-$${pay.tax.toLocaleString()}</span></div>
                    <div class="payslip-row"><span>Health Insurance:</span> <span style="color:var(--danger)">-$${pay.insurance.toLocaleString()}</span></div>
                    <div class="payslip-row total"><span>Net Salary:</span> <span>$${net.toLocaleString()}</span></div>
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
        state.currentPage = page;
        const navLinks = document.querySelectorAll('#sidebar nav ul li');
        navLinks.forEach(l => {
            l.classList.remove('active');
            if (l.innerText.trim().toLowerCase() === page) l.classList.add('active');
        });
        renderCurrentView();
    };

    window.deleteEmployee = (id) => {
        if (confirm('Are you sure you want to delete this employee?')) {
            state.employees = state.employees.filter(emp => emp.id !== id);
            saveToStorage();
            renderCurrentView();
        }
    };

    window.editEmployee = (id) => {
        const emp = state.employees.find(e => e.id === id);
        if (emp) {
            state.editingId = id;
            document.getElementById('modal-title').innerText = 'Edit Employee';
            document.getElementById('new-name').value = emp.name;
            document.getElementById('new-role').value = emp.role;
            document.getElementById('new-dept').value = emp.dept;
            document.getElementById('new-email').value = emp.email;
            document.getElementById('new-status').value = emp.status || 'Active';
            document.getElementById('add-modal').style.display = 'flex';
            if (window.lucide) lucide.createIcons();
        }
    };

    function setupEventListeners() {
        // Sidebar Navigation
        const navLinks = document.querySelectorAll('#sidebar nav ul li');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const page = link.innerText.trim().toLowerCase();
                window.navTo(page);
            });
        });

        // Modal UX: Close on Escape or Overlay Click
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllModals();

            // Global Search Trigger (Ctrl+K)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearchPalette();
            }
        });

        // Search Palette Logic
        const paletteInput = document.getElementById('palette-input');
        const topSearchBar = document.querySelector('.search-bar input');

        if (topSearchBar) {
            topSearchBar.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSearchPalette();
            });
            // Also handle focus for keyboard users tabbing through
            topSearchBar.addEventListener('focus', (e) => {
                e.preventDefault();
                topSearchBar.blur();
                toggleSearchPalette();
            });
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

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) closeAllModals();
            if (e.target.classList.contains('search-palette')) {
                document.getElementById('search-palette').style.display = 'none';
            }
        });

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                state.theme = state.theme === 'dark' ? 'light' : 'dark';
                applyTheme(state.theme);
            });
        }

        // Notification Bell
        const bell = document.querySelector('.notifications');
        if (bell) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleNotifications();
            });
        }

        window.addEventListener('click', () => {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        });
    }

    function syncEmployeeStatuses() {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;

        state.employees.forEach(emp => {
            // Only sync Active/On Leave employees
            if (emp.status !== 'Active' && emp.status !== 'On Leave' && emp.status !== undefined) return;

            const activeLeave = state.leaves.find(l =>
                l.name === emp.name &&
                l.status === 'approved' &&
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
