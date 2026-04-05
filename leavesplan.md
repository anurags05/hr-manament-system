# Leaves Page Plan - HR Two-Tab View

## Objective
Modify the HR leaves page (line 55 of newtasks.md) to have two tabs:
1. **Management Tab** - Existing HR leave management view (all employees' leaves, create leave, approve/reject)
2. **My Leaves Tab** - Same view as regular employees/GM have (own leave balance, request leave, personal leave history table)

## Current Architecture
- `renderLeaves()` (app.js:908) branches based on role → `renderLeavesHR()` or `renderLeavesEmployee()`
- HR view: Card-based grid with filters (status, month, name), Create Leave modal with employee selector, approve/reject buttons
- Employee view: Leave balance box, month filter, table-based history, Request Leave modal (no employee selector)
- No tab/switching mechanism exists anywhere in the codebase

## Implementation Plan

### Subtask 1: Add Tab UI to HR Leaves Page
**File:** `assets/js/app.js` - `renderLeavesHR()`
- Add tab bar HTML above the existing content with two tabs: "Management" and "My Leaves"
- Tab bar styling: Use existing glass/card styling patterns, active tab highlighted
- Default active tab: "Management" (existing view)
- Add `data-tab` attributes to both tab buttons
- Wrap existing HR content in a `<div id="tab-management">` container
- Create a new `<div id="tab-my-leaves">` container (initially hidden) with employee-style content

### Subtask 2: Create "My Leaves" Tab Content for HR
**File:** `assets/js/app.js` - new function `renderHRMyLeavesTab()`
- Replicate the employee view structure inside the "My Leaves" tab:
  - Leave balance box (calc: 10 - HR user's own leaves count, filtered by `state.currentUser.id`)
  - Month filter dropdown (reuse `generateMonthOptions()`)
  - Table-based leave history (reuse `.leave-history-table` CSS)
  - Columns: Type, Start Date, End Date, Reason, Status
  - "Create Leave" button (opens a duplicated modal specific to My Leaves tab)
- Modal for personal leave: Duplicate of the employee modal (no employee selector, just type/dates/reason)
  - Modal ID: `#my-leave-modal` (separate from `#leave-modal` to avoid conflicts)
  - Form ID: `#my-leave-form`
  - Button text: "Create Leave" (creates Approved entry for self, not a pending request)

### Subtask 3: Add Tab Switching Logic
**File:** `assets/js/app.js`
- Add `switchHRTab(tabName)` function that:
  - Toggles `active` class on tab buttons
  - Shows/hides `#tab-management` and `#tab-my-leaves` containers
  - Re-initializes lucide icons after DOM update
- Attach click handlers to tab buttons in `setupLeaveHRListeners()`

### Subtask 4: Create "My Leaves" Tab Event Listeners
**File:** `assets/js/app.js` - new function `setupHRMyLeavesListeners()`
- "Create Leave" button → opens `#my-leave-modal`
- Month filter → filters table rows by `data-month` attribute (same logic as employee view)
- Form submission → POST to `/api/leaves` WITHOUT `employee_id` (backend auto-assigns from session, status = 'Approved')
- On success: Update `state.leaves`, show notification, re-render HR leaves page
- Close/cancel buttons → close `#my-leave-modal`
- Called from `setupLeaveHRListeners()` after tab switch setup

### Subtask 5: Update Existing HR Management Tab Listeners
**File:** `assets/js/app.js` - `setupLeaveHRListeners()`
- Scope all existing listeners to `#tab-management` container
- Ensure filters only affect management tab content
- No changes to existing management functionality (create leave, approve/reject, 3-way filtering)

### Subtask 6: Add Tab CSS Styles
**File:** `assets/css/styles.css`
- Add `.tab-bar` container styles (flex row, gap, border-bottom)
- Add `.tab-button` styles (padding, background, border, active state with accent color)
- Add `.tab-button.active` styles (highlighted background, accent underline or border)
- Use existing CSS variables (`--accent-primary`, `--bg-secondary`, `--border-color`, `--text-primary`)
- Add `.tab-content` class for show/hide behavior (`display: none` by default, `display: block` when active)

## Key Design Decisions

1. **Separate modals**: Use separate modal IDs to avoid conflicts
   - Management modal: `#leave-modal` (existing, with employee selector)
   - My Leaves modal: `#my-leave-modal` (new, without employee selector)

2. **State management**: Both tabs share `state.leaves` array but filter differently
   - Management: Shows all leaves
   - My Leaves: Filters by `state.currentUser.id`

3. **Leave balance calculation**: Same formula as employee view
   - `Math.max(0, 10 - state.leaves.filter(l => l.empId === state.currentUser.id).length)`

4. **Backend compatibility**: No backend changes needed
   - HR creating leave for others: sends `employee_id` → status = 'Approved'
   - HR requesting personal leave: no `employee_id` → status = 'Approved' (auto-approved)

## Files to Modify
1. `assets/js/app.js` - Main logic changes
2. `assets/css/styles.css` - Tab styling

## No Backend Changes Required
The existing `/api/leaves` endpoints already handle both scenarios:
- POST with `employee_id` → HR creates for others (Approved)
- POST without `employee_id` → HR creates for self (Approved)
