# Changelog

## 0.1.0 – Milestone 1: Foundation (29 Oct 2026)

- Vite + React 18 app with MUI 5 themed to the prototype tokens (Source Sans 3; Letshego yellow and black). App shell: top bar with yellow rule, black side navigation that becomes a drawer below 860 px, skip link, visible focus ring.
- Session code ported from ESS (`ApiFunction.js`, `authService`, `authSlice`/`userInfo`). The access token lives in memory only, the refresh cookie handles silent restore, refresh is single-flight, and CSRF is sent on refresh and logout.
- Sign-in in the prototype layout (login logic ported from ESS `Login.jsx`): staff-number validation, remaining attempts, locked screen, 6-digit code step, first-time authenticator enrolment with a QR code.
- Forced change of temporary passwords; Change password; inactivity sign-out with keep-alive (NFR-04); account menu ported from ESS (`UserProfileMenu`); My roles and permissions (FR-52).
- Users and roles (ported from ESS `Users.js` and `UserDetails.js`): search, paging, assign roles with end dates, live SoD preview and MFA flag, add user, unlock, MFA reset, temporary password, activate and deactivate.
- Roles and permissions: role-by-permission matrix with a live SoD check, roles list (create, rename, deactivate, delete custom), and the SoD rules tab.
