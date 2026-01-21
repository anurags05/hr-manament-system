/**
 * HR Pro - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial Mock Data
    const initialEmployees = [
        { id: 1, name: 'Alice Johnson', role: 'UX Designer', dept: 'Design', email: 'alice@example.com', joinDate: '2023-05-12' },
        { id: 2, name: 'Bob Smith', role: 'Frontend Developer', dept: 'Engineering', email: 'bob@example.com', joinDate: '2023-08-20' },
        { id: 3, name: 'Charlie Davis', role: 'Project Manager', dept: 'Operations', email: 'charlie@example.com', joinDate: '2024-01-10' }
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
        isClockedIn: JSON.parse(localStorage.getItem('hr_isClockedIn')) || false,
        lastClockInTime: localStorage.getItem('hr_lastClockInTime') || null,
        editingId: null,
        currentUser: {
            name: 'Admin User',
            role: 'Administrator'
        }
    };

    // Initialize UI
    init();

    function init() {
        renderCurrentView();
        setupEventListeners();
    }

    // Persistence
    function saveToStorage() {
        localStorage.setItem('hr_employees', JSON.stringify(state.employees));
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
                        <p>${state.employees.length}</p>
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
                } else {
                    state.isClockedIn = false;
                    const lastRecord = state.attendance[state.attendance.length - 1];
                    if (lastRecord) lastRecord.clockOut = timeStr;
                    state.lastClockInTime = null;
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
                        <i data-lucide="x" id="close-modal" style="cursor:pointer;"></i>
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
                    <h3>${emp.name}</h3>
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

        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        if (cancelBtn) cancelBtn.onclick = () => modal.style.display = 'none';

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('new-name').value;
                const role = document.getElementById('new-role').value;
                const dept = document.getElementById('new-dept').value;
                const email = document.getElementById('new-email').value;

                if (state.editingId) {
                    const idx = state.employees.findIndex(emp => emp.id === state.editingId);
                    if (idx !== -1) {
                        state.employees[idx] = { ...state.employees[idx], name, role, dept, email };
                    }
                } else {
                    state.employees.push({
                        id: Date.now(),
                        name, role, dept, email,
                        joinDate: new Date().toISOString().split('T')[0]
                    });
                }

                saveToStorage();
                modal.style.display = 'none';
                renderCurrentView();
            };
        }

        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = state.employees.filter(emp =>
                    emp.name.toLowerCase().includes(term) ||
                    emp.role.toLowerCase().includes(term)
                );
                document.getElementById('employee-list').innerHTML =
                    filtered.map(emp => renderEmployeeCard(emp)).join('');
                lucide.createIcons();
            };
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
                                    <span style="font-size:0.8rem; color:var(--text-secondary)">${leave.type}</span>
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
                        <i data-lucide="x" id="close-leave-modal" style="cursor:pointer;"></i>
                    </div>
                    <form id="leave-form">
                        <div class="form-group">
                            <label>Employee Name</label>
                            <select id="leave-emp-name" required>
                                ${state.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Leave Type</label>
                            <select id="leave-type">
                                <option value="Annual Leave">Annual Leave</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Personal Leave">Personal Leave</option>
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

        setupLeaveListeners();
    }

    function setupLeaveListeners() {
        const btn = document.getElementById('btn-request-leave');
        const modal = document.getElementById('leave-modal');
        const form = document.getElementById('leave-form');

        if (btn) btn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-leave-modal').onclick = () => modal.style.display = 'none';
        document.getElementById('btn-cancel-leave').onclick = () => modal.style.display = 'none';

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const newLeave = {
                    id: Date.now(),
                    name: document.getElementById('leave-emp-name').value,
                    type: document.getElementById('leave-type').value,
                    start: document.getElementById('leave-start').value,
                    end: document.getElementById('leave-end').value,
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

    function calculateHours(start, end) {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const d1 = new Date(); d1.setHours(h1, m1);
        const d2 = new Date(); d2.setHours(h2, m2);
        const diff = (d2 - d1) / 1000 / 60 / 60;
        return diff >= 0 ? diff.toFixed(1) + ' hrs' : '--';
    }

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
    }
});
