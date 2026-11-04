# Session isolation and upload inventory — implementation review

## Confirmed code findings
- Authenticated application screens previously had no user/session-specific remount key.
- Axios requests previously had no session-generation guard; delayed responses could resolve after a different login.
- The background session keeper previously dispatched profile results without checking the initiating session.
- The access token is kept in memory; the refresh cookie is HTTP-only.
- The backend already sets Cache-Control: no-store for all responses.
- Existing FileDrop already supports drag-and-drop for payslips.
- Staff imports previously used a separate drag-and-drop input.
- Application supporting documents previously used native file inputs without drag-and-drop.

## Current branch changes
- Request generation, abort-on-session-change and stale-response rejection.
- Authenticated-route remounting when the user changes.
- Session-aware background profile updates.
- BroadcastChannel logout/expiry notification between tabs; no tokens or private data in messages.
- Shared FileDrop on product-specific and optional documents and staff import.
- Request-generation regression tests.

## Remaining release blockers
- Execute CI and cross-account browser tests, including AT637 -> AT656 without refresh.
- Validate delayed refresh responses and pending uploads across session changes.
- Verify behavior across browser tabs, including browsers without BroadcastChannel support.
- Add complete drag-and-drop file validation/progress/retry/multiple-file tests and check all upload locations.
- Coordinate any necessary backend security changes only after tests identify a gap.
- Malware scanning is currently a stub and is not production-ready.

No merge, deployment or enforcement activation is authorized by this work.
