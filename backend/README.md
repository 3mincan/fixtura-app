# Fixtura Backend

Small cloud support layer for Fixtura.

The mobile app keeps the tournament simulation engine local. This backend is responsible for:

- anonymous sessions
- simulation sync
- remote config
- analytics events
- secure AI match-score proxy
- daily-cached World Cup fixture/results data from OpenFootball

## Setup

```bash
cp backend/.env.example backend/.env
npm install --prefix backend
npm run dev --prefix backend
```

For local simulator smoke tests, use:

```bash
HOST=127.0.0.1 PORT=4000 npm run start --prefix backend
```

## Dokploy / Traefik

Use either Nixpacks or the Dockerfile in this folder. Dokploy's Nixpacks builder will read
`nixpacks.toml` automatically.

Recommended Dokploy settings for Nixpacks:

- Build type: Nixpacks
- Build path / root directory: `.`
- Install command: leave empty
- Build command: leave empty
- Start command: leave empty
- App port / target port: `4000`
- Domain: `https://fixtura-backend.redsoft.uk`
- Do not include `:4000` in the public HTTPS URL.

Recommended Dokploy settings for Dockerfile:

- Build type: Dockerfile
- Dockerfile path: `Dockerfile`
- Build context: `.`
- App port / target port: `4000`
- Domain: `https://fixtura-backend.redsoft.uk`
- Do not include `:4000` in the public HTTPS URL.

Environment variables:

```bash
HOST=0.0.0.0
PORT=4000
DATA_DIR=/app/data
GEMINI_API_KEY=
WORLD_CUP_2026_SOURCE_URL=https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json
WORLD_CUP_2026_CACHE_TTL_MS=86400000
```

If Dokploy exposes build environment variables, also set:

```bash
NIXPACKS_NODE_VERSION=20
```

Traefik should terminate HTTPS and proxy traffic to the container's internal `4000` port:

```txt
https://fixtura-backend.redsoft.uk -> fixtura-backend:4000
```

If `https://fixtura-backend.redsoft.uk/` returns `Bad Gateway`, check that Dokploy's target port is `4000` and the container logs show `Server listening at ...:4000`.

## Endpoints

### Sessions

- `POST /sessions`
- Body: `{ "anonymousId": "device-or-install-id" }`

### Current User

- `GET /me`
- `PATCH /me/settings`
- Header: `x-user-id: <user-id>`

### Simulation Sync

- `GET /simulations`
- `GET /simulations/:id`
- `POST /simulations`
- `PATCH /simulations/:id`
- `DELETE /simulations/:id`
- Header: `x-user-id: <user-id>`

Simulation body:

```json
{
  "selectedTeamId": "brazil",
  "gameMode": "predict",
  "tournamentPhase": "group",
  "currentStage": "group",
  "championId": null,
  "progress": {}
}
```

### Remote Config

- `GET /remote-config`

### Events

- `POST /events`
- Body: `{ "name": "screen_view", "payload": { "screen": "home" } }`

### AI Proxy

- `POST /ai/match-score`
- Requires `GEMINI_API_KEY` in `backend/.env`
- Body: `{ "fixture": { "id": "fixture-1", "homeTeamId": "brazil", "awayTeamId": "germany" } }`

### World Cup Data

- `GET /worldcup/2026`
- Fetches OpenFootball's `2026/worldcup.json` when the backend cache is older than 24 hours.
- Stores the cached copy in `DATA_DIR/worldcup-2026.json`.

Manual refresh:

- `POST /worldcup/2026/refresh`

## Storage

This first version uses `backend/data/fixtura.json`.

That keeps the API contract simple while the app is still MVP-stage. Move the `JsonStore` implementation to PostgreSQL when production sync volume matters.
