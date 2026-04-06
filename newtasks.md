# TO DO TASKS

# [Database role changes] 
### change role generations in seed script to following [DONE]

	finance - controller, Accountant
	sales & marketing - account manger, contract manager
	it/engg - designer,  developer
	hr - HR manager, Recruiter,
-----------

# [RBAC Login page system]

### role based division of pages from login phase (empl/hr/GM) [DONE]
### create a simple login table including empID and passID for authentication and login [DONE]
### create double pages with backend IDs that correpond to only specific roles (ex: GM/emp ->leaves page that only shows the his own leaves history and request leave button. hr -> leaves page that shows leaves status for all employees and request/create leave button. link this function to the rbac system. [DONE]

---
# [Profile View Changes]
### when clicking on profile, show role, department [DONE]
###

---
# [Page distribution for different roles]

### HR General manager -> dashboard + leaves(request) + attendance(own) [DONE]
### HR -> all existing pages + new payroll generation page [DONE] 
### Normal Employees -> leaves(request) + attendance(own) + new personal payslip page [DONE]

---

# [Module changes/edits]
### clock in -> attndance page [DONE]
### static -> dynamic page loads for ui change [(TARGETED_DOM_UPDATES_NOT_WORKING)]
------------------------------------------

# [Changes and additions to dashboard]
### Create a line growth chart showing the growth rate of employee capacity from the employees table
### Create a box showing recent employees in specifc month + add a filter button to filter by monthwise
### Create a stacked bar chart showing no of leaves of employees by month(x-axis), count(y-axis), type(stack segment)
### Create a button in the quick actions box to send a customizable notification (editable message body) to any employee by empID. (eg. notify emp of annual leave coming soong)
### Move clock in-out button to attendance page

--------------------------------------------------------------------------------------------------------

# [LEAVE PAGE CHANGES]
### [ALL] - create popup notifications in bottom right showing leave requested/created/approved/rejected messages [DONE]

### [GM + EMP] Create a leave balance box that shows remaining leaves (calc by 10- no of leaves applied by empID) [DONE]
### [GM + EMP] revamp leaves page - request leave buton for empl + table view of history of past leaves request (startdate, enddate, reason, accept/reject status) + filter by month button for table [DONE]

### [HR] leaves page - keep existing page for hr [DONE]
### [HR] change request to create leaves button + keep accept/reject button on request cards [DONE]
### [HR] add seperate filter buttons for status(accepted/reject) and by month and by name [DONE]
### [HR] create a my leaves tab and management tab for other employees [DONE]
-------------------------------------------------------------------
# [Attendance page changes]
### [EMP+GM] filter by button for month, [DONE]

### [HR] filter by buttons for name and month [DONE]
 


----------------------------------------------------------------
# [Payroll and Payslip pages]
	make seperate pages for payroll generation and payslip viewing. use RBAC to implement GM + EMP -> payslip, hr -> payslip + payroll 
[DONE]
""
## payroll(HR) - existing page + dialogue box + add filter by month and name
### [HR] payroll edit stub/box-
	

	L gen func -> conv basesal parameters (like performance bonus, tax deductions and health insurance deductions which are calculcated as specified percentage of basesalary by HR)
	L duplicate edit stub and give as option from directory/new employee creation button/edit payroll button
	L add bank name entry for employees in edit stub (db table +  ui entry)
	
	

## [EMP + GM]

### new payslip page - monthwise history of past payslips in table ui format similar to attendance records style
### gm + employee can only see his own history of salary slips
	
	L table colums -> name, role, month, base, sal, bank name
	L bank name to sal creditation (table+ui entry)


# [MISC changes and other updates]

### logo branding css
### dynamic page loading
### add a clear all button in notifications tab

# [Database population]
### populate db with multiple months:
	#### [HR]
		of atleast 3 months of attendance, 
		1 years of payslips, 
		1 year of leaves
	#### [GM + EMP]
		of atleast 3 months of attendance, 
		1 year of payslips, 
		1 year of leaves

### rescript seed_db.py to repopulate indian numbers with proper syntax
### rescript seed_db.py to repopulate proper leave reasons instead of random word strings
### database doesnt have a no of hours in attend table (clockout-clockin func)

# [Debug]
### debug: user1 doesn't have numb and date in profile dropdown





currently the database doesn't have enough data for the filter functions to work. @seed_db.py i want to adjust this script to add multiple changes: 
1. populate db with multiple months of attendance (atleast 3) and atleast 1 year of payslips. 
2. attendance data restructure: one set of attendacne pair (clockin,clockout) per day per month.
3. payslip restructure: weekwise payslips for each month (12 months) 