# Phase 5 — UX regression and accessibility verification

## Scope and safety
This checklist applies to `feature/balanced-ux-foundation`. Use seeded fictional users and applications. Do **not** perform real loan disbursements or merge into `main` until checks pass.

## Automated checks (Node.js 22)
```bash
npm ci
npm run lint
npm test
npm run build
```
Run browser tests with the sibling backend checkout installed and seeded test environment available:
```bash
npx playwright install chromium
npm run e2e
```
See `playwright.config.js` for backend directory and ports.

## Manual browser matrix
Repeat key screens at desktop 1440px, tablet 768px, and mobile 375px; in light and dark themes; in English and Kiswahili. Also test with OS/browser reduced motion enabled and keyboard-only navigation.

- [ ] Wizard steps advance/back without clearing typed values, attachments, or validations; no accidental double submit.
- [ ] Submission success appears only after the API-confirmed signed submission, with correct reference, amount and current stage.
- [ ] Approve at intermediate stage shows *moved*, not *finally approved*.
- [ ] Final approval shows final outcome; revised approval says applicant must accept revised terms.
- [ ] Return/reject show neutral feedback, never a celebratory success screen.
- [ ] Review queue never exposes restricted management application details to Credit Analyst.
- [ ] OPS confirmation is blocked for ineligible applications; confirmation shown only after API response.
- [ ] Disbursement summary matches reference, amount, date, optional transaction reference.
- [ ] Profile save feedback follows a successful save; server validation errors remain visible and editable.
- [ ] Notifications mark-all-read shows success only after server response; failures retain error.
- [ ] Reports filters and export formats work; restricted data stays restricted.
- [ ] Loading skeletons are replaced by data or error messages, without endless loading.
- [ ] Tab, Enter, Escape, and focus order work on success actions, dialogs, and forms.
- [ ] Reduced-motion setting disables decorative step and success animations.
- [ ] Swahili labels fit on narrow screens; no clipping or horizontal page overflow.
- [ ] No new errors in browser console; no unexpected network calls or duplicate writes.

## Release gate
Record test command exit codes, Playwright report, screenshots for both themes/languages, and any unresolved defects. Keep the branch unmerged if any calculation, RBAC, workflow, submission, or disbursement regression is detected.

**Status at creation:** Test cases and GitHub Actions workflow committed. Results are not yet available; this document does not claim that tests passed.
