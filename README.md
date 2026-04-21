# OrbitNow

OrbitNow is a hardened Next.js 14 + TypeScript dashboard for live orbital data. It uses the App Router, Tailwind CSS, Leaflet, a local SQLite-backed account store, and server-side proxy routes so third-party API keys stay on the server.

## Features

- Live ISS tracker with a Leaflet world map
- ISS client polling every 5 seconds through `/api/iss`
- People in Space card via `/api/astronauts`
- Satellite lookup by NORAD ID via `/api/satellite`
- Visible ISS pass forecasts via `/api/passes`
- Next launch card via `/api/launches`
- Optional AI viewing brief via `/api/weather`
- Latest space news via `/api/news`, enhanced with an OpenAI current brief
- Astronomy Picture of the Day via `/api/apod`
- AI Mission Brief via `/api/mission-brief`
- My Orbit personalization with account-backed sync and local-first fallback
- Account recovery, password rotation, and account deletion flows
- Home location lookup with server-side geocoding and timezone resolution
- Account-aware alerts for ISS passes, launches, and major space news
- Persistent rate limiting for auth, AI, and location-search routes
- Typed API responses, loading states, and error states throughout
- Vitest coverage for core auth and rate-limit flows

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Leaflet
- Launch Library 2
- Open Notify
- N2YO
- OpenAI Responses API
- Open-Meteo geocoding

## Required Environment Variables

Create `.env.local` in the project root:

```bash
N2YO_API_KEY=your_n2yo_key
NASA_API_KEY=your_nasa_api_key
OPENAI_API_KEY=your_openai_api_key
ORBITNOW_SESSION_SECRET=your_long_random_session_secret
```

Notes:

- `N2YO_API_KEY` is required for satellite search and visible pass forecasts.
- `NASA_API_KEY` is required for the APOD route.
- `OPENAI_API_KEY` enables the AI mission cards, including the viewing brief at `/api/weather`.
- `ORBITNOW_SESSION_SECRET` is strongly recommended in local development and required in production for secure My Orbit sessions.
- No `NEXT_PUBLIC_` secrets are used, so the browser never receives these keys.
- Location lookup uses Open-Meteo geocoding and does not require an additional API key.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Add `.env.local` using the variables above.

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run start
```

## API Routes

- `/api/iss`: Proxies the Open Notify ISS current location endpoint
- `/api/astronauts`: Proxies the Open Notify astronauts endpoint
- `/api/satellite/[norad]`: Proxies N2YO satellite position lookups
- `/api/passes?lat=...&lon=...`: Proxies N2YO visible pass forecasts
- `/api/launches`: Proxies the next upcoming launch from Launch Library 2
- `/api/news`: Proxies recent articles from the Spaceflight News API and adds an OpenAI-generated current briefing
- `/api/weather?lat=...&lon=...`: Generates an AI skywatching brief from location and live dashboard context
- `/api/apod`: Proxies NASA Astronomy Picture of the Day
- `/api/mission-brief`: Generates an AI summary from the live dashboard data
- `/api/auth/session`: Returns the current OrbitNow session state
- `/api/auth/register`: Creates a lightweight OrbitNow account and starts a session
- `/api/auth/login`: Signs in to a synced OrbitNow account
- `/api/auth/logout`: Ends the current OrbitNow session
- `/api/auth/forgot-password`: Starts password recovery and returns a reset link in development
- `/api/auth/reset-password`: Resets a password with a valid recovery token
- `/api/auth/change-password`: Rotates the current account password
- `/api/auth/delete-account`: Deletes the signed-in OrbitNow account
- `/api/preferences`: Reads and writes synced My Orbit preferences
- `/api/location/search?q=...`: Looks up places and resolves timezones server-side
- `/api/alerts/poll`: Polls account-aware alerts for browser delivery

## Notes

- Polling is handled on the client against local Next.js routes rather than third-party APIs.
- Server-side proxying keeps rate-limiting logic, error handling, and secrets on the server.
- Open Notify uses plain HTTP, so those requests are intentionally made server-side only.
- The `/api/weather` endpoint is now an AI-generated viewing brief, not a live meteorological feed, so it should be presented as guidance rather than measured weather.
- My Orbit remains local-first via `localStorage`, then upgrades into account-backed sync when the user signs in.
- Synced account data, password reset tokens, and rate-limit buckets persist in `data/orbitnow.sqlite`. The app automatically migrates legacy JSON user data from `data/orbitnow-db.json` on first boot.
- Browser notifications work while OrbitNow is open and the user is signed in; the alert preferences are ready to evolve into push notifications later.
- Password reset email delivery is not wired yet; development builds surface a direct reset link in My Orbit so the recovery flow is still testable end-to-end.
