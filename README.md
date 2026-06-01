# X Clone

A full-stack social media platform clone of X (formerly Twitter), built with the [T3 Stack](https://create.t3.gg/).

## Features

- **Posts** — Create, delete posts up to 280 characters with images, GIFs, emoji, and polls
- **Feed** — Infinite-scrolling "For You" (all) and "Following" tabs
- **Interactions** — Like, bookmark, repost, and reply with optimistic UI
- **Profiles** — Custom bio, banner image, follower/following counts
- **Follow System** — Follow/unfollow with real-time toggle
- **Direct Messages** — Real-time messaging with conversation threads
- **Notifications** — Likes, reposts, comments, follows (with unread badge)
- **Search** — Search posts and users with debounced input and URL sync
- **Trending** — Top hashtags computed from the last 7 days
- **Auth** — Email/password registration and login (NextAuth Credentials provider)
- **Theme** — Dark/light mode with localStorage persistence

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org/) | React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Language (strict mode) |
| [tRPC 11](https://trpc.io/) | End-to-end typesafe API |
| [TanStack React Query 5](https://tanstack.com/query) | Server state management |
| [NextAuth v5](https://next-auth.js.org/) | Authentication (Credentials + JWT) |
| [Prisma](https://www.prisma.io/) | ORM (SQLite / Turso) |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Zod](https://zod.dev/) | Schema validation |
| [Lucide](https://lucide.dev/) | Icons |
| [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) | Image storage (production) |

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd x_clone

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see below)

# Push the database schema
pnpm db:push

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | NextAuth JWT secret (`npx auth secret`) |
| `DATABASE_URL` | Yes | `file:./prisma/db.sqlite` for local dev, or Turso URL for prod |
| `TURSO_AUTH_TOKEN` | No | Required only for Turso (production) |
| `BLOB_READ_WRITE_TOKEN` | No | Required only for Vercel Blob (production) |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type check |
| `pnpm check` | Run both lint and typecheck |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `pnpm db:generate` | Run Prisma migrations |
| `pnpm format:write` | Format code with Prettier |

## Project Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── auth/                # Login / Register
│   ├── post/[postId]/       # Post detail page
│   ├── profile/[username]/  # User profile
│   ├── search/              # Search page
│   ├── messages/            # Direct messages
│   ├── notifications/       # Notifications
│   ├── bookmarks/           # Bookmarked posts
│   ├── api/                 # API routes (tRPC, NextAuth, upload)
│   └── _components/         # Shared UI components
├── server/
│   ├── api/routers/         # tRPC routers (6 modules)
│   ├── auth/                # NextAuth configuration
│   └── db.ts                # Prisma client
├── trpc/                    # tRPC client setup
├── lib/                     # Utilities
└── styles/                  # Global CSS (Tailwind)
prisma/
└── schema.prisma            # Database schema (14 models)
```

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import into Vercel
3. Set environment variables (AUTH_SECRET, DATABASE_URL as Turso, etc.)
4. Deploy

### Database (Turso)

For production, use [Turso](https://turso.tech) (serverless SQLite):

```bash
turso db create x-clone
turso db show x-clone --url  # Get the libsql URL
turso db tokens create x-clone --expiration none  # Get the auth token
```

Set these as `DATABASE_URL` and `TURSO_AUTH_TOKEN` in production.

## License

MIT
