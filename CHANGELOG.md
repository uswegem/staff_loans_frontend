# Changelog

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
