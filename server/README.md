# SafeRoute API

## Seed demo data

From this directory, run:

```sh
npm run seed
```

The command uses `MONGODB_URI` from `server/.env` and inserts two demo accounts plus 18 Bengaluru hazard reports. User passwords are hashed by the existing `User` model's bcryptjs save hook. To choose passwords before the first run, set `SEED_COMMUTER_PASSWORD` and `SEED_ADMIN_PASSWORD` in the environment; otherwise the script generates strong random demo passwords and prints them once.

The seed is insert-only and safe to rerun. It uses stable IDs for its own reports, skips exact records already present, and aborts on a conflicting account or document rather than updating or deleting it. It does not clear collections or touch unrelated users and hazards.

Demo account emails:

- `demo.commuter@saferoute.example`
- `demo.admin@saferoute.example`
