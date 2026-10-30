# SLAS web app: LFB Staff Loan Application System

The browser app for Letshego Faidika Bank's staff loan system. Requirements are in `docs\BRD_v0.8.md` in the parent workspace, the visual reference is `docs\LFB_Staff_Loans_Prototype.html`, and the API contract is `openapi.json` in `staff_loans_backend`.

Stack: React 18 with Vite, React Router 6, Redux Toolkit (session only), axios with a refresh interceptor, React Hook Form, MUI 5 themed to the prototype tokens (`src/styles/tokens.css`, `src/theme.js`), and Vitest with Testing Library.

## Run locally (Windows, Laragon)

1. Start the API first. See `staff_loans_backend\README.md`: Node 22, a MongoDB replica set, `npm run seed`, `npm run dev`.
2. In this folder:
   ```powershell
   copy .env.example .env
   npm install
   npm run dev        # http://localhost:5173
   ```
The dev server forwards `/api` to `http://localhost:4000`, so the app and the API share one origin. The refresh cookie (`SameSite=Strict`, httpOnly) and the CSRF cookie only work that way. In production, serve `dist/` and the API behind one reverse proxy under the same host name.

For plain-http local development, set `COOKIE_SECURE=false` in the backend's `.env`. Browsers drop `Secure` cookies on `http://`, except on `localhost` in Chrome and Edge.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit and component tests |
| `npm run lint` | ESLint |
| `npm run build` | Production build into `dist/` |
| `npm run ci` | Lint, then test, then build |
| `npm run e2e` | Playwright end-to-end runs (see below) |
| `npm run e2e:report` | Opens the last Playwright report |

## End-to-end runs (Playwright)

The runs drive the real screens against a real API:

| Spec | What it covers |
| --- | --- |
| `e2e/01-guided-journey.spec.js` | The prototype's guided journey: Rehema Ally completes her profile, applies and signs, Credit Analyst, Head of People and Culture and CEO approve, and OPS disburses (non-management route) |
| `e2e/02-routes.spec.js` | The management, CEO and Head of People and Culture routes, with the Credit Analyst's limited view (FR-55) |
| `e2e/03-branches.spec.js` | Return for correction and resubmission; approval at revised terms, acceptance of the revised agreement and disbursement |
| `e2e/04-maker-checker.spec.js` | A product change prepared by the maker, refused to them as checker, approved by the Product Checker and live for applicants |

The backend repo must sit next to this one (`..staff_loans_backend`, or set `E2E_BACKEND_DIR`). `npm run e2e` starts the API with `scripts/e2e-server.js` (in-memory MongoDB replica set with the prototype's fictional sample data, port 4100) and Vite on port 5180, then runs the specs one after another. Reviewers enrol their authenticator through the real enrolment screen; the run computes codes from the key shown there.

```powershell
npx playwright install chromium    # once; or use an installed browser:
$env:PW_CHANNEL = 'chrome'         # or 'msedge'
npm run e2e
```

A full run takes 10 to 15 minutes on a laptop. Failures keep a trace and screenshots in `test-results/`; open them with `npm run e2e:report`.

## Production

Serve `dist/` and the API under one host name over HTTPS behind the reverse proxy, and add the security headers listed in `staff_loans_backendSECURITY.md` (Content-Security-Policy, HSTS, nosniff, Referrer-Policy).

## How the session works

- The access token is held in memory (`src/api/client.js`) and is never written to localStorage. A page reload restores the session through `/auth/refresh` using the httpOnly cookie.
- Concurrent requests that get a 401 wait for a single refresh, then retry once.
- The client signs the user out after the configured inactivity time. While the user is active, it pings `/auth/me` every few minutes, which keeps the server session open and picks up permission changes.
- Screens are hidden from users without the permission, but the API is the control: it checks every request.
- Links that come from data (notifications, the page to return to after sign-in) pass through `src/lib/safePath.js`, so they can only lead to pages inside the app.
