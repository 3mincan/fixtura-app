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
