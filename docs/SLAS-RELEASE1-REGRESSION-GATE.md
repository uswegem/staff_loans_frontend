# SLAS-007 / SLAS-010 — Release regression gate

## Automated verification (isolated test data only)
Run frontend: `npm ci && npm run ci && npm run e2e`.
Run backend: `npm ci && npm run ci`.
Capture exit codes, logs, test reports and screenshots. **No tests have been executed by creation of this checklist.**

## Transaction recovery matrix
For each scenario record expected state, observed state, application reference, API response and audit entry.

| Flow | Failure injection | Expected behavior |
|---|---|---|
| Draft autosave | Network offline / timeout | Unsaved changes clearly shown; no false saved indicator |
| Draft autosave | Out-of-order responses | Latest values win; reload reflects latest confirmed values |
| Draft cancel | HTTP 409/500 | Stay on wizard, show error, no false cancellation |
| Signing | Response lost after server commit | Retry checks current application status; no duplicate agreement |
| Documents | Invalid type, oversize, scanner down | Explicit failure, no accepted unscanned document |
| Documents | File uploaded then reload | Valid files persist, checklist recalculates |
| Review | Two reviewers submit concurrently | One valid state transition; other sees conflict |
| Role matrix | First/last update fails | Partial save disclosed; failed changes remain retryable |
| Disbursement | Blank reference | Rejected at frontend and backend |
| Disbursement | Double click or retry | Exactly one confirmation and audit decision |
| Disbursement | Core banking completed, SLAS unavailable | Reconciliation exception documented; no duplicate core banking action |
| Notifications | Mark read fails | Error shown; item remains unread |
| Delegation | Lookup/end fails | Actionable error shown, no false success |

## Role-by-role UAT
- Employee: profile, choose product, application wizard, signing, withdrawal, returned application, revised agreement, status history.
- Credit Analyst: review queues, limited management view, credit bureau outcome, return/reject/approve.
- Head of HR: staff record checks, approval, conflicts, delegation.
- CEO: final approval and segregation of duties.
- OPS: pending queue, cap recheck, top-up settlement, mandatory core banking reference, disbursement register.
- Admin: staff import, products and pricing maker-checker, templates, role matrix partial failures, audit logs and reports.
- Exceptional applicant routes (CEO and Head of HR): require policy sign-off before UAT approval.

## UX and accessibility matrix
Check desktop 1440px, tablet 768px, mobile 375px; English and Kiswahili; light and dark themes; keyboard-only and reduced motion. Verify loading, empty, success, validation, server error and retry states for each role.

## Release decision
Do not merge or deploy until: scanner infrastructure and EICAR/outage tests pass; frontend/backend paired changes are integrated in staging; CI and UAT evidence are attached; policy decisions for exceptional routes are signed off; P0/P1 issues are resolved or formally waived. This checklist is not evidence of a passing test run.
