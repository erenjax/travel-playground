# TripJam - CMU Hackathon 2026

<img width="5088" height="3344" alt="image" src="https://github.com/user-attachments/assets/4b6e32d9-177c-402b-94a3-919136b57bcb" />


TripJam is a real-time collaborative trip-planning board. Create a trip, share the
room code with friends, and plan together on a shared canvas: search for hotels,
attractions, and restaurants, drag them onto the board, vote on your favorites,
sketch and leave notes, and chat — then let Grok turn the board into a day-by-day
itinerary you can share or download as a PDF.

## Features

- **Live collaboration** — every board is a Liveblocks room. Cards, votes, notes,
  drawings, stickers, cursors, and chat sync instantly between everyone in the room.
- **Create or join a trip** — pick a destination and dates to create a room, or
  paste a room code / invite link to join one.
- **Place search** — the sidebar searches Google Places for Hotels, Attractions,
  and Food near your destination (or near a spot you've pinned on the board), with
  photos and price levels. Drag a result onto the canvas to add it as a card.
- **Voting & top contenders** — upvote/downvote cards; the board surfaces the
  highest-scoring options per category.
- **Whiteboard tools** — post-it notes, freehand drawing, eraser, stickers, and
  arrows between cards (arrows tell the itinerary generator which places belong
  next to each other).
- **Live chat** — in-room chat with join notices and unread counts.
- **AI itinerary** — the Itinerary tab sends your cards, votes, and arrows to Grok,
  which returns a structured day-by-day plan. The itinerary is published to the
  room so everyone sees it, and can be downloaded as a PDF.

## Tech stack

React 19 + TypeScript + Vite, [Liveblocks](https://liveblocks.io) for real-time
storage and presence, [Google Maps Platform](https://developers.google.com/maps)
(Places API) for place search, and [xAI Grok](https://docs.x.ai) for itinerary
generation. `motion` handles animations and `react-router-dom` handles routing.

## Getting started

```sh
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev
```

Open http://localhost:5173, enter a display name, and create a trip.

Other scripts:

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run build`   | Type-check and build for production       |
| `npm run preview` | Serve the production build locally        |
| `npm run lint`    | Run ESLint                                |
| `npm test`        | Run the Vitest suite                      |

## API keys

Copy [`.env.example`](.env.example) to `.env.local` (gitignored) and fill in the
values. Variables prefixed with `VITE_` are bundled into the browser; the others
are only read by the Vite dev/preview server.

| Variable                    | Required | Where to get it                                                                                                                                                                                                      |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_LIVEBLOCKS_PUBLIC_KEY`| Yes      | [Liveblocks dashboard](https://liveblocks.io/dashboard) → your project → API keys. Use the **public** key (`pk_dev_…` / `pk_prod_…`). The app shows a "Missing Liveblocks key" screen without it.                     |
| `VITE_GOOGLE_API_KEY`       | Yes      | [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) → create an API key with **Maps JavaScript API** and **Places API (New)** enabled. Without it, destination search and the place sidebar are disabled. |
| `GROK_API_KEY`              | Yes      | [xAI console](https://console.x.ai). Server-side only; powers the `/api/itinerary` endpoint. `XAI_API_KEY` and `VITE_GROK_API_KEY` are accepted as aliases for compatibility.                                        |
| `GROK_MODEL`                | No       | Defaults to `grok-4.6`. The model must support structured JSON output (and web search, for the legacy `/api/suggestions` endpoint).                                                                                  |
| `GROK_ITINERARY_MODEL`      | No       | Overrides `GROK_MODEL` for itinerary generation only.                                                                                                                                                               |

### Notes on Google Places

In development, Places REST requests go through a Vite proxy at `/api/places`
(see [`vite.config.ts`](vite.config.ts)) so the browser key works without CORS
issues. In production builds the client calls `https://places.googleapis.com`
directly, so restrict the key by HTTP referrer in the Google Cloud Console.

### Notes on Grok

The `/api/itinerary` and `/api/suggestions` endpoints are implemented as a Vite
plugin in [`server/suggestions.ts`](server/suggestions.ts) and run inside
`npm run dev` and `npm run preview`. A static-only deployment (e.g. just serving
`dist/`) has no server for these routes — you'll need to host them separately and
keep `GROK_API_KEY` private. Itinerary responses are cached in memory for 10
minutes; the cache resets when the server restarts.

## Project layout

```
src/
  components/home/     Create / join trip screen
  components/room/     Room route wrapper (Liveblocks RoomProvider)
  Main/                Board UI: canvas, cards, toolbar, sidebar, chat, itinerary + PDF export
  lib/                 Pure helpers: votes, chat, room ids, place queries
  liveblocks/          Client key + shared storage/presence types
server/
  suggestions.ts       Vite plugin exposing /api/itinerary and /api/suggestions
  placeImages.ts       Fetches a representative image from a place's website
```
