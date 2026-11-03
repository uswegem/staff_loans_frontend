# Changelog

## Unreleased – Calmer loan details step (3 Nov 2026)

- Loan details opens without errors: a field's error shows once it has been left or Continue was pressed, and clears as soon as the value changes; Continue lists every missing field and focuses the first one. The rules are still the API's.
- Payslip: neutral "Upload your latest payslip…" with "PDF · From the Seamless HR System · Not older than 45 days"; after upload, the file name with a tick and Replace. Red only for a real upload problem, or a missing payslip after Continue.
- Retirement cutoff (D-82) as a neutral note; a tenor longer than allowed says "The longest tenor you can take is N months."
- "Your loan estimate" shows a short explanation instead of a dash and zeros until there is an amount, tenor and payslip. Calculations unchanged.
- "Fix this before you continue" always describes the values on screen: it shows the API's checks only for the values it last checked, marks them "Checking your changes…" while newer values are on their way, and goes when the answer has nothing left. A save that fails says so ("Your latest changes are not saved or checked yet", with Try again) instead of leaving old checks looking current. Answers that arrive out of order are dropped, and a payslip upload is no longer undone by a save that was still on its way.
- Same behaviour across the app: required fields wait until left or submitted, then follow every change (My profile, staff form phones); a server's field error goes when its field is changed, and "Check the highlighted fields" goes with the last of them (staff record, salary, product versions and new product, product change, workflow settings, temporary password); check messages that follow choices clear as soon as the choice is put right (sign-in, review decision, disbursement, delegation, date of birth and product rejections); double submits are blocked on those dialogs.
- Lists that load as you choose (districts and wards, delegate search, report filter, agreement preview) ignore answers for an earlier choice.

## 0.12.0 – Profile formats, address, language and theme (2 Nov 2026)

- One validation behaviour for every form: red only when empty-and-required or wrong, normal as soon as valid, a specific message for the format (D-93).
- Phone fields with a fixed +255; NIDA with hyphens added while typing; searchable country list (default Tanzania); Region → District → Ward → Street → House/Plot Number; P.O. Box removed.
- English/Kiswahili and light/dark switches on the sign-in screen and in the header, remembered after refresh and at the next sign-in (D-94).
- "You cannot apply for a loan yet" on My profile, Home and Apply lists what People and Culture still have to do; saving a complete profile only says "You can now apply" when nothing is in the way (D-97).
- The staff form no longer asks for a retirement date; profile and review screens show the one worked out from the verified date of birth (D-98).
- Sign-in panel: Letshego logo, "Staff Loan Application System", "Internal use only | Contact IT for Support" on a yellow and black gradient (D-96). Reports: "Report Filter".

## 0.11.0 – Salary deduction, combined cap, Legal and product approvals (2 Nov 2026)

- Apply: drag-and-drop payslip with "The PDF from the Seamless HR System, not older than 45 days. Your limit is worked out from your salary slip."; the repayment step is gone (salary deduction, D-84); top-up picks a running Staff Loans loan; the calculator shows the combined cap breakdown and remaining capacity (D-87).
- First Name and Surname for staff and next of kin on My profile, staff records and review screens (D-85).
- Credit Analyst: first name, surname, NIDA number and mobile only; no recommended amount or tenor; drag-and-drop bureau report; one appraisal note box (the doubled textarea outline is fixed) (D-86).
- Agreement templates: upload and edit (Legal Officer), review, approve or reject with a reason (Head of Legal); status Pending Legal Approval, Approved or Rejected (D-88).
- Products: approval stages and history on the version page; form without repayment methods, documents and disbursement conditions; "Minimum number of Months Before Applying for Topup" (D-89). Disbursement without the conditions checklist.

## 0.10.0 – Date of birth verification and retirement cutoff (2 Nov 2026)

- My profile and staff records show the verified date of birth and any change waiting for People and Culture; the submitter can withdraw it.
- Date of birth checks: People and Culture's queue with approve and reject (reason required).
- The application form shows the retirement cutoff and the longest tenor allowed; the tenor slider stops there.
- Workflow and calendar: retirement age, buffer days and the allowed age range for a date of birth.

## 0.9.1 – Staff numbers are employee codes (1 Nov 2026)

- Sign-in, Users and Staff records accept the employee code on the payslip (for example AT637) as the staff number (D-81).

## 0.9.0 – Affordability from the payslip (31 Oct 2026)

- Loan details: attach the latest payslip; see the Basic Pay and LFB deductions read from it, the new calculator steps, and the maximum amount over the longest tenor and the chosen one.
- Product cards and editor no longer use a salary multiple; the review screen shows the payslip; the HR check confirms its Basic Pay.
- Profile Pay tab keeps only existing staff loans; Workflow and calendar edits the payslip age limit and the labels the reader looks for.
- E2E runs attach a fictional payslip through the real upload control.

## 0.8.0 – Milestone 8: Hardening (30 Oct 2026)

- Playwright end-to-end runs: the guided journey, the management, CEO and Head of P&C routes, return and resubmit, revised terms, and product maker-checker.
- `safePath` keeps data-driven navigation inside the app (React Router advisory GHSA-wrjc-x8rr-h8h6).
- README: e2e runs and production headers.

## 0.7.0 – Milestone 7: Reports, admin screens and exports (30 Oct 2026)

- Reports: overview with time per stage and disbursed by product, report tabs with filters, CSV, Excel and PDF export, and notes when rows are limited.
- Workflow and calendar, Agreement templates (preview before loading, Legal approval) and Audit log (filters, paging, before and after values) screens.

## 0.6.0 – Milestone 6: Disbursement and notifications (30 Oct 2026)

- Disbursements for OPS: ready and disbursed tabs, Outside SLA flags, confirm dialog with the summary, checklist, date, reference and comment, details view, and the disbursed register export.
- Notifications inbox; the bell links to it.
- Application page shows the disbursement and the repayment schedule.

## 0.5.0 – Milestone 5: Review (30 Oct 2026)

- Review queue with waiting, overdue and handled tabs and the working-hours clock; limited rows show only the name.
- Review screen: full view (request, signed agreement, affordability steps, rule checks, applicant, documents, history) and the limited view for the Credit Analyst on management routes; decision panel per stage (bureau check, recommendation, staff-record checks, probation verification, CEO recommendations).
- My delegation; accept or decline revised terms with the revised agreement; revised-terms banner on the application page.

## 0.4.0 – Milestone 4: Apply (29 Oct 2026)

- Apply wizard in the prototype's five steps: product cards with limits and closure reasons, loan details with the live calculator (same module as the API), documents, review with the route, and read-and-sign with the scroll gate, Swahili consents and password.
- My applications, application page with route chevrons and history, agreement page with evidence and PDF download; Home lists open applications.

## 0.3.0 – Milestone 3: Staff records (29 Oct 2026)

- My profile in five tabs with the completeness meter, missing counts per tab, server messages next to fields, and the jump to the next incomplete tab.
- Home shows profile completeness and, per product, whether you can apply now or in how many days, including the top-up countdown (NS-03).
- Staff records: searchable and filterable list, detail page with employment form, salary history, status change, and profile summary; Add staff.
- Upload from Excel: template download, drop zone, checked-row preview with filters, error-row download, and apply valid rows.

## 0.2.0 – Milestone 2: Products and pricing (29 Oct 2026)

- Products and pricing screen in the prototype layout: pricing figures and PAYE bands, the sample-values banner, the products table with status and open changes, and the waiting-for-approval banner.
- Version page for maker and checker: full FR-57 editor (limits, eligibility, repayment, documents, application fields, OPS conditions), pricing editor in % with PAYE bands, comparison with the live version, and the maker-checker actions with a mandatory rejection reason.
- New product page and per-product version history.
- Money input (TZS, thousands separators, whole shillings) and the notification bell.

## 0.1.0 – Milestone 1: Foundation (29 Oct 2026)

- Vite + React 18 app with MUI 5 themed to the prototype tokens (Source Sans 3; Letshego yellow and black). App shell: top bar with yellow rule, black side navigation that becomes a drawer below 860 px, skip link, visible focus ring.
- Session code ported from ESS (`ApiFunction.js`, `authService`, `authSlice`/`userInfo`). The access token lives in memory only, the refresh cookie handles silent restore, refresh is single-flight, and CSRF is sent on refresh and logout.
- Sign-in in the prototype layout (login logic ported from ESS `Login.jsx`): staff-number validation, remaining attempts, locked screen, 6-digit code step, first-time authenticator enrolment with a QR code.
- Forced change of temporary passwords; Change password; inactivity sign-out with keep-alive (NFR-04); account menu ported from ESS (`UserProfileMenu`); My roles and permissions (FR-52).
- Users and roles (ported from ESS `Users.js` and `UserDetails.js`): search, paging, assign roles with end dates, live SoD preview and MFA flag, add user, unlock, MFA reset, temporary password, activate and deactivate.
- Roles and permissions: role-by-permission matrix with a live SoD check, roles list (create, rename, deactivate, delete custom), and the SoD rules tab.
