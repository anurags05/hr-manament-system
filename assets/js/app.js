/**
 * HR Pro - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('HR Pro initialized');

    // Core App State
    const state = {
        currentPage: 'dashboard',
        employees: JSON.parse(localStorage.getItem('hr_employees')) || [],
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

    function renderCurrentView() {
        const container = document.getElementById('view-container');

        if (state.currentPage === 'dashboard') {
            renderDashboard(container);
        } else {
            container.innerHTML = `<h1>${state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}</h1><p>Coming soon...</p>`;
        }

        // Re-initialize icons for newly added elements
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function renderDashboard(container) {
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
                        <p>0</p>
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
                        <button class="glass" style="padding: 5px 12px; font-size: 0.8rem;">View All</button>
                    </div>
                    ${state.employees.length === 0
                ? '<div style="text-align:center; padding: 40px; color: var(--text-secondary);">No employees added yet.</div>'
                : '<ul class="activity-list"></ul>'}
                </div>
                <div class="content-box glass">
                    <div class="box-header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div class="activity-list">
                        <div class="activity-item">
                            <i data-lucide="user-plus"></i>
                            <div class="activity-details">
                                <p>Add New Employee</p>
                                <span>Fast track onboarding</span>
                            </div>
                        </div>
                        <div class="activity-item">
                            <i data-lucide="file-text"></i>
                            <div class="activity-details">
                                <p>Generate Report</p>
                                <span>Monthly attendance summary</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function setupEventListeners() {
        // Navigation link clicking
        const navLinks = document.querySelectorAll('#sidebar nav ul li');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                const page = link.innerText.trim().toLowerCase();
                state.currentPage = page;
                renderCurrentView();
            });
        });
    }
});
