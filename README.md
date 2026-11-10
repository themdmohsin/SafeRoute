# SafeRoute

SafeRoute is a road-hazard reporting app for Bengaluru commuters. It has an analytics dashboard, a Claude-based AI assistant that answers from the stored reports, ML pothole detection, and an admin console.

- Full documentation: [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)
- ML pipeline: [docs/ml-hazard-pipeline.md](docs/ml-hazard-pipeline.md)

Quick start: `cd server && npm install && npm run dev`, then in the repo root `npm install && npm run dev`. See section 11 of the documentation for the environment variables.

## Credits

The road-hazard model (`server/ml/modelArtifact.json`) is trained on **RoadSens-4M** — Khandakar et al., 2026, *Scientific Data*. Dataset: https://doi.org/10.6084/m9.figshare.30341143.v3, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Labels were mapped `bump -> speed_breaker`; windows were resampled and turned into orientation-independent features (see `docs/ml-hazard-pipeline.md`, results in `docs/ml-model-evaluation.md`).
