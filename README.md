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

## How the session works

- The access token is held in memory (`src/api/client.js`) and is never written to localStorage. A page reload restores the session through `/auth/refresh` using the httpOnly cookie.
- Concurrent requests that get a 401 wait for a single refresh, then retry once.
- The client signs the user out after the configured inactivity time. While the user is active, it pings `/auth/me` every few minutes, which keeps the server session open and picks up permission changes.
- Screens are hidden from users without the permission, but the API is the control: it checks every request.
