# Saifuzzaman Kaif — Portfolio

Personal portfolio website for **Saifuzzaman Kaif**, Computer Science and Engineering undergraduate at Independent University, Bangladesh (2024–2028).

- **Frontend:** semantic HTML5, CSS3 (Grid/Flexbox, custom properties), vanilla ES modules. No frameworks.
- **Backend:** Node.js + Express 5 REST API.
- **Database:** PostgreSQL via `pg`, parameterized queries only.
- **Dependencies:** `express` and `pg`, nothing else. Tests use Node's built-in test runner.

The site contains **only verified information**. Projects start empty, and the public page shows a designed empty state until real projects are added.

---

## Project structure

```
Portfolio/
├── package.json              # convenience scripts (delegate to backend/)
├── backend/
│   ├── package.json
│   ├── .env.example          # copy to backend/.env
│   ├── scripts/
│   │   └── create-admin.js   # create/reset an admin account
│   ├── src/
│   │   ├── server.js         # entry point (starts HTTP server)
│   │   ├── app.js            # Express app factory (DB injected → testable)
│   │   ├── config/env.js     # environment configuration
│   │   ├── db/
│   │   │   ├── pool.js       # pg pool + transaction helper
│   │   │   ├── schema.sql    # tables, constraints, indexes, trigger
│   │   │   ├── seed.sql      # verified data only (no projects)
│   │   │   └── init.js       # applies schema + seed
│   │   ├── middleware/       # auth, rate limit, security headers, errors
│   │   ├── repositories/     # all SQL lives here
│   │   ├── routes/           # health, portfolio, projects, contact, admin
│   │   └── utils/            # validation, password hashing, SEO, HttpError
│   └── tests/                # node:test API + unit tests (no DB needed)
└── frontend/
    ├── index.html            # the portfolio
    ├── admin.html            # admin dashboard (noindex)
    ├── 404.html
    ├── assets/favicon.svg
    ├── css/                  # base (tokens) · components · sections · admin
    └── js/                   # ES modules, one per feature
```

## Requirements

- **Node.js 20.12+** (uses `process.loadEnvFile`)
- **PostgreSQL 12+**

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create the database

```sql
-- in psql as a superuser
CREATE USER portfolio_user WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE portfolio OWNER portfolio_user;
```

### 3. Configure the environment

```bash
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
```

Edit `backend/.env` and set `PGPASSWORD`, or set `DATABASE_URL` instead. All variables are documented in [backend/.env.example](backend/.env.example).

### 4. Create the tables and seed the verified data

```bash
npm run db:init          # schema + seed (safe to re-run)
```

### 5. Create an admin account (optional, needed to manage projects)

```bash
npm run admin:create     # prompts for username and password (min 12 chars)
```

### 6. Run

```bash
npm start                # production-style
npm run dev              # auto-restart on file changes
```

Open **http://localhost:3000**. The admin dashboard is at **http://localhost:3000/admin**.

All commands can also be run from the repository root (`npm start`, `npm test`, …).

## Tests

```bash
cd backend
npm test
```

The 56 tests run without PostgreSQL, because the app factory accepts an injected fake database. They cover:

- public endpoints, 404/400 handling, 503 when the DB is down (no internal details leaked)
- contact validation, length limits, malformed JSON, oversized bodies, wrong content type, honeypot, rate limiting, and SQL-injection payloads passed only as parameters
- admin auth: 401 without a session, forged cookies, generic login errors, cookie flags, cross-origin write rejection, logout invalidation
- validation helpers, scrypt hashing, cookie parsing and the rate limiter

## REST API

All responses are JSON: `{ "data": … }` on success, `{ "error": { "status", "message", "details?" } }` on failure.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Service and database status (200 / 503) |
| GET | `/api/profile` | Profile (name, university, department, years, CGPA) |
| GET | `/api/skills` | Skills + `meta.categories` |
| GET | `/api/achievements` | Achievements |
| GET | `/api/projects` | All projects (newest first) |
| GET | `/api/projects/:id` | One project |
| POST | `/api/contact` | Store a contact message `{ name, email, message }` → 201 |

**Admin (session required)**

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/admin/login` | `{ username, password }` → sets HttpOnly session cookie |
| POST | `/api/admin/logout` | Ends the session → 204 |
| GET | `/api/admin/session` | Current admin |
| GET / POST | `/api/admin/projects` | List / create a project |
| PUT / PATCH | `/api/admin/projects/:id` | Full / partial update |
| DELETE | `/api/admin/projects/:id` | Delete → 204 |
| GET | `/api/admin/messages?limit=&offset=` | Paginated contact messages |
| DELETE | `/api/admin/messages/:id` | Delete a message → 204 |
| GET | `/api/admin/achievements` | Achievements |
| PUT | `/api/admin/achievements/:id/certificate` | `{ certificate_url }` (empty string removes it) |

Project fields: `title` (required, ≤150), `description` (required, ≤5000), `technologies` (array or comma-separated, ≤20), `image_url` (http(s) or `/path`), `github_url`, `demo_url` (http(s)), `project_date` (`YYYY-MM-DD`).

## Adding content later

- **Projects:** sign in at `/admin` and use the *Projects* tab. They appear on the public site immediately. To use local screenshots, put images in `frontend/assets/projects/` and use a path such as `/assets/projects/my-app.webp`.
- **Award certificate:** put the real file in `frontend/assets/certificates/` (or host it elsewhere), then add its link in the *Achievements* tab. A "View certificate" link only appears when a URL is set.
- **Skills / profile:** edit `backend/src/db/seed.sql` and re-run `npm run db:init`. Also update the matching static fallback markup in `frontend/index.html`, which is shown if the API is unreachable.

## Security

- Parameterized SQL everywhere. Dynamic column names come from a fixed whitelist.
- Server-side validation and sanitization (control characters stripped, length limits, http(s)-only URLs, real calendar dates). The frontend renders API data with `textContent` only.
- Admin passwords are hashed with **scrypt** (N=2¹⁵, random salt) and compared in constant time. Login timing is the same for unknown usernames.
- Sessions use 256-bit random tokens. Only their SHA-256 is stored in `admin_sessions`, and they expire (`SESSION_TTL_HOURS`). The cookie is `HttpOnly; SameSite=Strict; Path=/api/admin`, plus `Secure` in production.
- Authorization middleware protects every admin route except login. State-changing requests also require a same-origin `Origin`/`Sec-Fetch-Site`.
- Rate limits: general API (300 / 15 min), contact form (5 / 15 min), login (10 / 15 min) per IP.
- Security headers: strict CSP (no inline scripts), `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS in production.
- Centralized error handling returns safe messages. Internals are only logged on the server.
- The contact form **stores** messages in PostgreSQL. It does not send email, and the UI never claims it does.

## Deployment notes

- Set `NODE_ENV=production`, `HOST=0.0.0.0`, a real `SITE_URL` (used for `sitemap.xml` and `robots.txt`) and serve over HTTPS.
- Behind a reverse proxy, set `TRUST_PROXY=1` so rate limiting sees client IPs.
- Managed Postgres usually needs `PGSSL=true`.
- The in-memory rate limiter assumes a single instance. Use a shared store if you scale horizontally.

## Accessibility & performance

Semantic landmarks, one `h1`, skip link, visible focus states, labelled form fields with `aria-invalid` and live-region feedback, keyboard-operable menu (Esc closes) and filters (`aria-pressed`), and a `prefers-reduced-motion` mode that disables all animation. Content never depends on animation: a boot failsafe reveals everything if scripts fail. There are no animation libraries; scroll effects use `IntersectionObserver`.
