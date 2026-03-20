# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Notes app with Expo mobile frontend and Express API backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── mobile/             # Expo React Native app (Notes App)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Notes App Features

- List all notes sorted by last updated
- Search/filter notes
- Create new notes (auto-saves after 800ms debounce)
- Edit existing notes (auto-saves)
- Delete notes (long press on list, trash icon in editor)
- Word count + character count in editor
- Notes persist in PostgreSQL via REST API

## API Endpoints

- `GET /api/notes` — list all notes
- `POST /api/notes` — create note
- `GET /api/notes/:id` — get single note
- `PUT /api/notes/:id` — update note
- `DELETE /api/notes/:id` — delete note

## Database Schema

- `notes` table: `id`, `title`, `content`, `created_at`, `updated_at`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`. Depends on `@workspace/db`, `@workspace/api-zod`.

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native notes app. Uses Expo Router for navigation.
- `app/index.tsx` — notes list screen
- `app/editor.tsx` — note editor (modal)
- `app/_layout.tsx` — root layout with providers
- `context/NotesContext.tsx` — state + API calls
- `constants/colors.ts` — warm tan/amber theme

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `src/schema/notes.ts` — notes table definition

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
