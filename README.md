# GymApp — Personal Workout Journal (PWA)

A PWA app for tracking your gym progress. Your own exercises, your own workout
templates, history and analysis — no accounts, no servers, no paid
subscriptions.

All data is stored locally in your browser (IndexedDB) and belongs to you:
at any time you can export your history to JSON, CSV, or the custom `.gymapp`
format and restore it anywhere.

## Features (stage 1)

- Create your own exercises (muscle group, type, weight units)
- Create your own workout templates
- Log workouts: sets, weights, reps, time, notes
- Workout history
- Edit and delete workouts
- Data export: JSON, CSV, custom `.gymapp` format
- `.gymapp` import (data recovery)
- Installable as an app and works offline (PWA)

## Quick start

```bash
npm install     # install dependencies
npm run dev     # start dev server
npm run build   # production build
npm run test    # run tests
```

## Tech stack

- TypeScript + React + Vite
- PWA: `vite-plugin-pwa` (manifest, service worker, offline)
- Local DB: IndexedDB (Dexie.js)
- Tests: Vitest + Testing Library

## Documentation

- `PROJECT_SPEC.md` — technical specification (requirements)
- `AGENTS.md` — architecture and rules for AI agents (development process)
- `ARCHITECTURE.md` — architecture reference and code review checklist