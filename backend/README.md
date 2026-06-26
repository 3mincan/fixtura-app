# Fixtura Backend

Small cloud support layer for Fixtura.

The mobile app keeps the tournament simulation engine local. This backend is responsible for:

- anonymous sessions
- simulation sync
- remote config
- analytics events
- secure AI match-score proxy

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

Use the Dockerfile in this folder.

Recommended Dokploy settings:

- Build type: Dockerfile
- Dockerfile path: `Dockerfile`
- App port / target port: `4000`
- Domain: `https://fixtura-backend.redsoft.uk`
- Do not include `:4000` in the public HTTPS URL.

Environment variables:

```bash
HOST=0.0.0.0
PORT=4000
DATA_DIR=/app/data
GEMINI_API_KEY=
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

## Storage

This first version uses `backend/data/fixtura.json`.

That keeps the API contract simple while the app is still MVP-stage. Move the `JsonStore` implementation to PostgreSQL when production sync volume matters.
