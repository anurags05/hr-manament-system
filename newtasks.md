# TO DO TASKS

# [Database role changes] 
### change role generations in seed script to following

	finance - controller, Accountant
	sales & marketing - account manger, contract manager
	it/engg - designer,  developer
	hr - HR manager, Recruiter,
-----------

# [RBAC Login page system]

### role based division of pages from login phase (empl/hr/GM)
### create a simple login table including empID and passID for authentication and login
### create double pages with backend IDs that correpond to only specific roles (ex: GM/emp ->leaves page that only shows the his own leaves history and request leave button. hr -> leaves page that shows leaves status for all employees and request/create leave button. link this function to the rbac system.

---

# [Page distribution for different roles]

### HR General manager -> dashboard + leaves(request) + attendance(own)
### HR -> all existing pages + new payroll generation page
### Normal Employees -> leaves(request) + attendance(own) + new personal payslip page

---

# [Module changes/edits]
### clock in -> attndance page
### static -> dynamic page loads for ui change
------------------------------------------

# [Changes and additions to dashboard]
### Create a line growth chart showing the growth rate of employee capacity from the employees table
### Create a box showing recent employees in specifc month + add a filter button to filter by monthwise
### Create a stacked bar chart showing no of leaves of employees by month(x-axis), count(y-axis), type(stack segment)
### Create a button in the quick actions box to send a customizable notification (editable message body) to any employee by empID. (eg. notify emp of annual leave coming soong)
### Move clock in-out button to attendance page

--------------------------------------------------------------------------------------------------------

# [LEAVE PAGE CHANGES]
### [ALL] - create popup notifications in botto right showing leave requested/created/approved/rejected messages

### [GM + EMP] Create a leave balance box that shows remaining leaves (calc by 10- no of leaves applied by empID)
### [GM + EMP] revamp leaves page - request leave buton for empl + table view of history of past leaves request (startdate, enddate, reason, accept/reject status) + filter by month button for table

### [HR] leaves page - keep existing page for hr
### [HR] change request to create leaves button + keep accept/reject button on request cards
### [HR] add seperate filter buttons for status(accepted/reject) and by month and by name

---

# [Payroll and Payslip pages]
	make seperate pages for payroll generation and payslip viewing. use RBAC to implement GM + EMP -> payslip, hr -> payslip + payroll

## payroll(HR) - existing page + dialogue box
### [HR] payroll edit stub/box-
	

	L gen func -> conv basesal parameters (like performance bonus, tax deductions and health insurance deductions which are calculcated as specified percentage of basesalary by HR)
	L duplicate edit stub and give as option from directory/new employee creation button/edit payroll button
	L add bank name entry for employees in edit stub (db table +  ui entry)
	
	

# [EMP + GM]

### new payslip page - monthwise history of past payslips in table ui format similar to attendance records style
### gm + employee can only see his own history of salary slips
	
	L table colums -> name, role, month, base, sal, bank name
	L bank name to sal creditation (table+ui entry)


# [MISC changes and other updates]

### logo branding css
### dynamic page loading