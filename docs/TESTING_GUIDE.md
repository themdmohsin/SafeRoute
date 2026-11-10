# SafeRoute — How to test everything

## 0. Start the app

Two terminals:

```sh
cd server && node index.js            # API on http://localhost:5000
node node_modules/vite/bin/vite.js    # app on http://localhost:3000 (run from repo root)
```

Leave the server terminal visible. Password-reset links are printed there.

## 1. Become an admin

Pick one of these.

**A. Script (easiest).** Register in the app first, then:

```sh
cd server
npm run make-admin -- you@example.com
```

Log out and back in. **Profile → Open admin console** now appears.

**B. MongoDB Atlas website.**
1. Log in at <https://cloud.mongodb.com>, then open your project and cluster.
2. Click **Browse Collections**.
3. Open database **`test`**. Your connection string has no database name, so Mongoose uses `test`. Then open collection **`users`**.
4. Filter with `{ "email": "you@example.com" }`, click the pencil icon, change `"role": "commuter"` to `"role": "admin"`, and click **Update**.
5. Log out and back in to the app.

**C. Seeded demo admin.** `demo.admin@saferoute.example`. Its password was printed once when `npm run seed` ran. If you lost it, use **Forgot password?** on the login page (section 3).

## 2. Admin console (`/admin`)

| Test | Expected |
|---|---|
| Open as a commuter (type `/admin` in the URL) | Sent back to Home. The API also returns 403 |
| **Reports** tab, "Waiting for review" | New reports, with photos when attached |
| Change a report's Status to Verified | It leaves the list and a toast confirms. The reporter's bell shows "verified" |
| Delete report | Asks to confirm, then the report is gone |
| **Users** tab: change someone's role | Toast confirms. Your own role dropdown is locked |
| **Messages** tab | Messages sent from the landing-page contact form |

## 3. Login, register, reset password

| Test | Expected |
|---|---|
| Register with a password under 8 characters | Error message |
| Log in with a wrong password | "Email or password is incorrect." |
| **Forgot password?** → enter your email | Success message. The server terminal prints `Password reset link for …` |
| Open that link and set a new password | Logged in and taken to Home. The same link fails if used a second time |

## 4. Analytics dashboard (`/dashboard`)

| Test | Expected |
|---|---|
| Change Date range / Hazard type / Severity, type an area such as `Koramangala` | KPI tiles, resolution ring, all charts and the recent list update together |
| Filters that match nothing | "No … match these filters" messages, no crash |
| Refresh | Toast confirms, data reloads |
| Ask the assistant "Which high severity hazards are in Koramangala?" | The answer uses the same data. Its count matches the dashboard with Severity = High, Area = Koramangala |

## 5. Home

| Test | Expected |
|---|---|
| Bell (top right) | Panel with updates on your reports and new high-severity hazards. The red count clears once opened |
| Locate button | Asks for location permission, then shows your coordinates |
| Filter chips | List reloads by type |
| Quick report (Pothole / Waterlog / Manhole) | Asks for location, saves with the real road name, and the list refreshes |

## 6. Ride flow

Browsers only allow GPS and motion sensors on `https://` or `localhost`. Two ways to test:

- **Laptop (easiest):** in Chrome open DevTools → ⋮ → More tools → **Sensors** and set *Location* to a Bengaluru point, e.g. lat `12.9352`, lng `77.6245`. Change the numbers during a ride to "move".
- **Phone:** use the deployed HTTPS site (Vercel + a public backend). Plain `http://<PC-IP>:3000` will not get GPS.

| Test | Expected |
|---|---|
| Start Ride → type a place or tap a chip | Real road routes drawn on the map. Each card shows km, minutes and hazards on that route. The safest route comes first |
| Map buttons: locate, layers, +, − | Recenter on GPS, hide/show hazard pins, zoom. You can drag to pan. Tap a pin to see its details |
| Auto-detect switch | Its default comes from Profile. Sets whether the ride uses motion sensors |
| Begin ride | Opens Active Ride with your planned route |
| Active Ride: move around | Distance, speed and the orange track update. "X in N m" warns about the next hazard |
| Voice on/off | When on, warnings are spoken (and it says "Voice alerts on") |
| Quick tags (Pothole, Waterlog, …) | Saves a report at your location, and a toast shows the road name |
| Reroute button | Switches to the next route option, or says there is no other route |
| Report button | Opens the full report form. After saving, it returns to the ride |
| End & save ride → Save & finish | Ride Summary with real distance, time, average speed and the recorded route |
| Summary: Replay route | Animates your recorded track on the map |
| Summary: Share | Phone opens the share sheet. Desktop copies the text to the clipboard |

## 7. Manual report (`/report`)

| Test | Expected |
|---|---|
| Choose type, optional severity, add a photo, submit | Saved with the road name. Without a severity, Claude suggests one. The photo shows in Admin → Reports |
| Pick a non-image file | "Choose an image file." |

## 8. Profile

| Test | Expected |
|---|---|
| Stats and badges | Counts come from your reports and rides. Badges you have not earned are grey, with a hint for how to earn them |
| Pencil icon | Edit name, vehicle, registration number and home area. They save and stay after a reload |
| Each preference switch | Saved to your account (a toast confirms). **Night map theme** darkens every map. **Voice alerts** sets the default for Voice on/off. **Auto-detect** sets the Start Ride switch. **Save ride GPS tracks** off means the next ride saves totals only |
| Export CSV | Downloads your reports as a spreadsheet |
| Log out | Back to Login |

## 9. Landing page (`/`)

The nav links scroll to their sections. **Get Started** goes to Login. The contact form saves a message, which shows in Admin → Messages. The footer's Contact / Report a bug links scroll to the contact form.

## 10. Automated checks

```sh
cd server && npm test                          # 10 unit tests (ML + admin guard)
node node_modules/typescript/bin/tsc --noEmit  # frontend type check (repo root)
```
