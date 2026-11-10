# SafeRoute — Project Documentation (draft)

Course: 24CIE554 Full Stack Development

## 1. Overview

SafeRoute is a road-hazard reporting app for Bengaluru commuters. Riders report potholes, waterlogging, open manholes and speed breakers by hand, or let phone sensors and an ML model detect them during a ride. Every report goes into MongoDB. The data feeds three things: an analytics dashboard with filters, an AI assistant (Claude) that answers questions from the stored reports, and an admin console where reports are checked and marked fixed.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, GSAP / Motion for animation |
| Backend | Node.js, Express 4 (ES modules) |
| Database | MongoDB with Mongoose 8 (2dsphere index on hazard locations) |
| Auth | JWT (7-day tokens), bcryptjs password hashing (12 rounds) |
| AI | Anthropic Claude via `@anthropic-ai/sdk` |
| ML | Random-forest classifier over sensor windows (`server/ml/`), see [ml-hazard-pipeline.md](ml-hazard-pipeline.md) |
| Hosting | Frontend on Vercel (`https://safe-route-seven-beryl.vercel.app`) |

## 3. Architecture

```
 React SPA (Vite)                       Express API (/api)                     MongoDB
 ───────────────                        ──────────────────                     ───────
 Landing, Login/Register ─┐             /auth       register, login, me        users
 Home, Ride, Report       │  fetch +    /hazards    CRUD + filters             hazardreports
 Dashboard (charts)       ├─ Bearer ──▶ /rides      ride sessions (per user)   ridesessions
 AI assistant chat        │  JWT        /analytics  filtered aggregates        contactmessages
 Admin console            ┘             /assistant  Claude + DB context ──▶ Anthropic API
                                        /ml         sensor-window inference
                                        /admin      users, roles, messages (admin only)
                                        /contact    public contact form
```

The frontend calls the API through one helper, `src/lib/api.ts`. It adds the JWT and signs the user out on any 401.

## 4. Features and where they live

| Feature | Frontend | Backend |
|---|---|---|
| Landing page + contact form | `src/landing/*` | `routes/contactRoutes.js` |
| Register / login / session | `pages/LoginScreen.tsx`, `pages/RegisterScreen.tsx`, `auth/AuthContext.tsx` | `controllers/authController.js` |
| Ride tracking + summary | `pages/StartRideScreen.tsx`, `ActiveRideScreen.tsx`, `RideSummaryScreen.tsx` | `controllers/rideController.js` |
| Manual hazard report (AI suggests severity) | `pages/ManualReportScreen.tsx` | `controllers/hazardController.js`, `services/anthropic.js` |
| ML hazard detection | ride screens | `controllers/mlController.js`, `services/mlHazardService.js` |
| Analytics dashboard | `pages/DashboardScreen.tsx` | `controllers/analyticsController.js` |
| AI assistant | `components/AssistantChat.tsx` | `controllers/assistantController.js` |
| Admin console | `pages/AdminScreen.tsx` | `controllers/adminController.js` |

## 5. Data model

**User**: `name`, `email` (unique), `password` (hashed, never returned), `role` (`commuter` | `admin`), `vehicleType`, `createdAt`.

**HazardReport**: `reportedBy` (User, null for ML reports), `hazardType` (`pothole`, `waterlogging`, `open_manhole`, `speed_breaker`, `other`), `severity` (`low`/`medium`/`high`), `description`, `photoUrl`, `location` (GeoJSON Point), `roadName`, `area`, `status` (`reported` → `verified` → `resolved`), `source` (`manual`, `sensor-detected`, `ml`), ML fields (`mlLabel`, `mlConfidence`, `modelVersion`, `rideId`, `windowId`), timestamps.

**RideSession**: `user`, `startTime`, `endTime`, `distanceKm`, `durationMinutes`, `hazardsDetectedCount`, `hazardsReportedCount`, `safetyScore` (0–100), `route` (lat/lng points).

**ContactMessage**: `name`, `email`, `message`, `source`, `createdAt`.

## 6. API reference

All paths start with `/api`. 🔒 = needs `Authorization: Bearer <token>`. 👑 = admin only.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account, returns token + user |
| POST | `/auth/login` | Log in, returns token + user |
| GET 🔒 | `/auth/me` | Current user |
| PATCH 🔒 | `/auth/me` | Update name, vehicle, registration, home area, preferences |
| GET 🔒 | `/auth/me/stats` | My report/ride counts, points, badges |
| POST | `/auth/forgot-password` | Create a 30-minute reset link (printed to the server console in development) |
| POST | `/auth/reset-password` | `{ token, password }`. Sets a new password and logs in |
| GET / POST 🔒 | `/notifications`, `/notifications/read` | Updates on my reports + new high-severity hazards; mark all read |
| POST 🔒 | `/hazards` | Create report. If severity is missing, Claude suggests one |
| GET 🔒 | `/hazards` | List with filters: `hazardType`, `severity`, `status`, `area`, `startDate`, `endDate`, `page`, `limit`, `mine=true`, `photos=true` |
| GET 🔒 | `/hazards/:id` | One report |
| PATCH 🔒 | `/hazards/:id` | Update. Reporter or admin only |
| DELETE 🔒 | `/hazards/:id` | Delete. Reporter or admin only |
| POST 🔒 | `/rides` | Start ride |
| GET 🔒 | `/rides` | My rides |
| GET / PATCH 🔒 | `/rides/:id` | Read / end my ride |
| GET 🔒 | `/analytics/summary` | Aggregates; same filters as `/hazards` |
| POST 🔒 | `/assistant/ask` | `{ question }` → AI answer from DB data |
| POST | `/ml/infer` | Classify one sensor window |
| POST 🔒 | `/ml/hazard` | Save an ML-detected hazard (skips duplicates) |
| GET 👑 | `/admin/users` | All users with report counts |
| PATCH 👑 | `/admin/users/:id` | `{ role }`. Admins cannot change their own role |
| GET 👑 | `/admin/messages` | Latest 50 contact messages |
| POST | `/contact` | Public contact form |
| GET | `/health` | Health check |

Errors return `{ message }` with status 400 (bad input), 401 (no/expired token), 403 (not allowed), 404, 409 or 5xx.

## 7. Authentication and authorization

- Passwords are hashed with bcrypt before saving. The `password` field is excluded from queries by default.
- Login returns a JWT signed with `JWT_SECRET` (`sub` = user id, `role`). The `protect` middleware checks it on every private route.
- **Ownership:** a commuter can edit or delete only their own reports and rides. Admins can edit or delete any report.
- **Admin routes** use `requireAdmin`. It reads the role from the database rather than the token, so a demoted admin loses access at once even though their token is still valid.
- The frontend hides `/admin` from non-admins (`RequireAuth adminOnly`). The server enforces the same rule on its own.

## 8. Data analytics module

`GET /api/analytics/summary` runs MongoDB aggregations on the filtered set. Filters are **date range**, **hazard type**, **severity** and **area/road**. All are checked on the server, and the area text is regex-escaped.

Dashboard outputs:

| Output | Type |
|---|---|
| Total reports, low-severity count, high-severity hotspots | KPI tiles |
| Resolution rate (resolved ÷ total) | KPI ring |
| Reports by day | Bar chart |
| Severity mix | Stacked percentage bar |
| Reports by hazard type | Horizontal bar chart |
| Repair pipeline (reported → verified → resolved) | Step chart |
| Detection source (manual / sensor / ML) | Horizontal bar chart |
| Top 10 hazard zones | Ranked table |
| Recent reports | Filtered list |

Every chart updates when a filter changes.

## 9. AI integration

1. **AI assistant** (`POST /assistant/ask`): picks area, severity and time words out of the question (e.g. "high severity in Koramangala this week") and turns them into a MongoDB filter. It then loads up to 30 matching reports plus per-zone counts and sends them to Claude. The system prompt tells Claude to answer **only from that data**. The reply also returns `dataUsed`, so the user can see which filters were applied.
2. **AI severity suggestion:** if a manual report has no severity, Claude classifies the description as low, medium or high. If the AI is unavailable, it falls back to `medium` and says so.
3. **ML hazard detection:** a trained classifier labels sensor windows as `normal`, `speed_breaker` or `pothole`. See [ml-hazard-pipeline.md](ml-hazard-pipeline.md).

**Demo (AI + analytics together):** open the Dashboard, set Severity = High and Area = Koramangala, then ask the assistant "Which high severity hazards are in Koramangala?" The assistant's count matches the dashboard total.

## 10. Admin console

Opened from **Profile → Open admin console** (admins only). It has three tabs:

- **Reports:** a review queue filtered by status. Change status (reported / verified / resolved) or delete a report.
- **Users:** every user with their report count. Promote to admin or demote to commuter.
- **Messages:** messages sent through the landing-page contact form.

## 11. Setup and running

Requirements: Node.js 20+, a MongoDB database (Atlas or local), and an Anthropic API key for the AI features.

```sh
# backend
cd server
npm install
cp .env.example .env      # set MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, ANTHROPIC_API_KEY, ANTHROPIC_MODEL
npm run seed              # optional: 2 demo accounts (one admin) + 18 Bengaluru reports
npm run dev               # http://localhost:5000

# frontend (repo root)
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:3000
```

Demo accounts after seeding: `demo.commuter@saferoute.example` and `demo.admin@saferoute.example`. The seed prints the passwords once, unless you set `SEED_COMMUTER_PASSWORD` / `SEED_ADMIN_PASSWORD`.

## 12. Deployment

- **Frontend:** Vercel. Set `VITE_API_URL` to the public API URL.
- **Backend:** any Node host (e.g. Render or Railway). Start command `npm start` in `server/`. Set the same variables as `server/.env`, and add the frontend URL to `CLIENT_ORIGIN`.
- **Database:** MongoDB Atlas. Allow the backend host's IP.

## 13. Testing

```sh
cd server
node --test
```

- `tests/mlService.test.js`: ML feature extraction and inference (7 tests).
- `tests/requireAdmin.test.js`: admin guard, including the demoted-admin case (3 tests).
- Type check for the frontend: `npm run lint`.

## 13a. Maps, routing and live ride

- Maps are drawn from OpenStreetMap tiles by `src/components/HazardMap.tsx`, with real hazard pins, drag, zoom, a layer toggle and recenter.
- Place search and road names use OpenStreetMap Nominatim. Driving routes and alternatives come from the public OSRM server. Each route is scored by how many open hazards lie within 40 m of it.
- Active Ride uses `watchPosition` for distance, speed and the track. It speaks a warning 200 m before a reported hazard. With auto-detect on, it sends 2-second motion-sensor windows to `/api/ml/hazard`.

See [TESTING_GUIDE.md](TESTING_GUIDE.md) to test every screen and to make a user an admin.

## 14. Known limits / future work

- Password-reset links are printed to the server console; there is no email service yet.
- Nominatim and OSRM are free public services with rate limits, fine for a demo but not for heavy traffic.

- The assistant finds areas from a fixed list of Bengaluru localities. Other place names are not filtered.
- The JWT is stored in `localStorage`. An httpOnly cookie would be safer against XSS.
- No rate limiting on the login or contact endpoints yet.
- The main JS bundle is over 500 kB; route-level code splitting would cut it.
