# AGENTS.md — X Clone

## Project Overview

Full-stack X (Twitter) clone built with the T3 Stack. Features include posts (280 chars), likes, bookmarks, reposts, threaded comments, polls, DMs, notifications, user profiles, follow system, search, and trending hashtags.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4, Lucide icons |
| Auth | NextAuth v5 (Credentials provider, bcrypt, JWT) |
| Database | Prisma + SQLite (local) / Turso (prod) |
| API | tRPC 11 (end-to-end typesafe, SuperJSON) |
| State | TanStack React Query 5 |
| Animations | Framer Motion |
| Images | Vercel Blob (prod) / local filesystem (dev) |

## Directory Structure

```
src/
├── app/               # Next.js App Router pages
│   ├── layout.tsx     # Root layout (providers, fonts)
│   ├── page.tsx       # Home feed
│   ├── auth/          # Login / Register
│   ├── post/[postId]  # Post detail
│   ├── profile/[username]
│   ├── search/
│   ├── messages/
│   ├── notifications/
│   ├── bookmarks/
│   └── api/           # tRPC, NextAuth, Upload routes
├── server/
│   ├── db.ts          # Prisma client singleton
│   ├── auth/          # NextAuth config
│   └── api/
│       ├── routers/   # post, user, comment, conversation, notification, poll
│       └── root.ts    # AppRouter merge
├── trpc/              # Client tRPC provider + hooks
├── lib/utils.ts       # clsx + tailwind-merge
├── env.js             # Zod env validation
└── styles/globals.css # Tailwind v4 + theme
prisma/
└── schema.prisma      # 14 models
```

## Code Conventions

### Imports
- Use `~` path alias for `./src/*` (e.g. `import { db } from "~/server/db"`)
- Use inline `type` imports: `import { type Foo } from "..."` (enforced by ESLint)

### Naming
- Files: `kebab-case.ts` (pages: `page.tsx`, components: `PostCard.tsx`)
- Components: PascalCase
- Functions/variables: camelCase
- tRPC procedures: camelCase (e.g. `getAll`, `toggleLike`)
- Database models: PascalCase (Prisma convention)

### React / Next.js
- Use server components by default; add `"use client"` only when needed
- Use Framer Motion `"use client"` components sparingly
- Fetch data via tRPC server caller in server components (`createCaller`)
- Use React Query on client with tRPC hooks (`api.post.getAll.useQuery()`)

### Styling
- Tailwind CSS v4 (CSS-based config in `globals.css`)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Follow mobile-first responsive design
- Named color tokens: `--color-primary`, `--color-danger`, etc.

### API (tRPC)
- Every router procedure must have Zod input validation
- Use `protectedProcedure` for authenticated routes, `publicProcedure` for open ones
- Return serializable data (SuperJSON handles Date, Map, Set)
- Optimistic updates in React Query mutations via `onMutate`

### Database
- Prisma with SQLite provider (libSQL/Turso adapter for prod)
- Relations use `@@unique` compound constraints for likes, bookmarks, reposts, follows
- Cascade deletes on foreign keys

## Available Scripts

```bash
pnpm dev          # Start dev server with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm check        # lint + typecheck together
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Prisma Studio
pnpm format:check # Prettier check
pnpm format:write # Prettier format
```

## Environment Variables

See `.env.example`. Key vars:
- `AUTH_SECRET` — NextAuth JWT secret
- `DATABASE_URL` — SQLite (`file:./prisma/db.sqlite`) or Turso URL
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (prod only)

## Git Rules

- No commit messages, branch names, or PRs unless explicitly requested
- Stage only intended files; never commit secrets
- Run `pnpm check` (lint + typecheck) before considering work complete
