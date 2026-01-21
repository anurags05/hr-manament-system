# Simple & Intuitive HR Management System Plan

The goal is to build a modern, user-friendly Employee/HR Management System. It will focus on core HR tasks while maintaining a premium aesthetic with smooth interactions.

## Proposed Features

### 1. Dashboard (The Command Center)
-   **Overview Cards**: Total employees, active leave requests, and upcoming events (birthdays/anniversaries).
-   **Recent Activities**: A log of recent system changes or updates.

### 2. Employee Directory
-   **Card & List Views**: Searchable and filterable list of all employees.
-   **Dynamic Profiles**: Detailed view for each employee including job roles, contact info, and department.
-   **Quick Actions**: Add, edit, or remove employee records seamlessly.

### 3. Leave Management
-   **Leave Request Portal**: Simple form for employees to request time off.
-   **Approval Workflow**: Manager-specific view to approve or reject requests with one click.
-   **Leave Balance**: Visual representation of remaining leave days.

### 4. Attendance & Time Tracking
-   **Smart Clock-In**: One-click check-in/out button on the dashboard.
-   **Attendance Logs**: Daily logs showing clock-in/out times.

### 5. Basic Payroll
-   **Salary Details**: Fixed salary and bonus tracking.
-   **Pay-slip Generator**: Generate a printable pay-slip for any given month.

---

## Design Aesthetics (Premium & Modern)
-   **Typography**: Using `Outfit` or `Inter` from Google Fonts for a professional look.
-   **Color Palette**: Sleek dark mode or a "Glassmorphic" light mode with soft blues and grays.
-   **Interactions**: Smooth CSS transitions for hover states, modal popups, and tab switching.
-   **Responsiveness**: Mobile-first design that works perfectly on tablets and desktops.

---

## Technical Stack
-   **Frontend**: HTML5, Vanilla CSS (Custom properties for theming), Vanilla JavaScript (ES6+).
-   **Storage**: Browser `localStorage` for immediate persistence (no setup required).
-   **Icons**: Lucide or FontAwesome for high-quality iconography.

## Verification Plan
### Manual Verification
-   **Test Employee Flow**: Add a new employee and verify they appear in the directory.
-   **Test Leave Flow**: Request leave and verify it appears in the admin approval list.
-   **Test Responsive Design**: Resize the browser to ensure the layout adapts correctly.
-   **Test Print**: Verify the pay-slip generator produces a clean, printable layout.
