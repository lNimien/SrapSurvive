# Scrap & Survive

**Scrap & Survive** is a browser-based **idle extraction RPG** about sending a space scavenger into dangerous automated runs, pushing your luck for better rewards, and choosing the right moment to extract before catastrophe.

This repository is built around one core idea: **the server is the only source of truth** for economy, progression, danger, loot, and run outcomes.

---

## AI authorship note

This project was created as a **full-AI production experiment**.

- **Product design, systems thinking, and software architecture** were intentionally planned and directed at a high level.
- **Implementation, code production, and most repository output** were generated with **GPT-5.3 Codex**.

In other words: the project vision focused on **design + architecture first**, and the rest of the execution was delegated to AI.

---

## What kind of game is this?

Scrap & Survive mixes:

- **Idle gameplay** — runs progress automatically over time
- **Extraction tension** — wait longer for bigger rewards, but risk losing value
- **RPG progression** — equipment, upgrades, contracts, achievements, and midgame systems
- **Economic integrity** — rewards, inventory, and credits are resolved server-side

### Core fantasy

You are operating a **post-industrial space scavenger** in a hostile scrap economy. The UI is designed to feel like a **space-terminal HUD**, not a casual mobile toy.

### Core loop

1. Equip your scavenger
2. Start a run in a zone
3. Let danger and potential rewards grow over time
4. Decide when to extract
5. Resolve rewards, penalties, XP, and progression
6. Reinvest in gear, upgrades, contracts, and future runs

### Why it is interesting

The game is not about twitch combat. It is about:

- **risk vs reward**
- **timing under uncertainty**
- **build trade-offs**
- **economic planning**
- **repeatable long-term progression**

---

## Genre, audience, and design intent

### Genre

- Idle Extraction RPG
- Browser game
- Systems-driven progression game

### Target audience

Scrap & Survive is aimed at players who enjoy:

- optimization and progression loops
- low-input but high-decision gameplay
- incremental / idle structures with real tension
- backend-heavy game design where data integrity matters

### Design intent

The design priorities of the project are:

1. **Domain correctness**
2. **Data integrity**
3. **Clear user experience**
4. **Maintainable architecture**
5. **Performance only when justified**

This means the project deliberately prioritizes **correct game logic and transactional integrity** over flashy implementation shortcuts.

---

## Current project status

According to `docs/project-status-canonical.md`, the project is currently in:

- **Post-MVP (Fase D operativa)**

The original architecture and repository rules still preserve a strong MVP-first philosophy, but the actual repository already includes systems beyond the initial vertical slice, including areas such as:

- contracts
- crafting
- crates
- upgrades
- achievements
- market / economy operations
- live-ops style progression layers

If any internal document conflicts with `docs/project-status-canonical.md`, that file is the canonical status source.

---

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19
- **Language:** TypeScript 5 (`strict`)
- **Styling:** Tailwind CSS 4
- **Component base:** shadcn/ui
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Auth.js v5 / NextAuth + Google OAuth
- **Validation:** Zod
- **Testing:** Vitest

---

## Architecture overview

The project follows a **strict layered architecture**:

```text
UI (Server/Client Components)
  -> Server Actions
  -> Application Services
  -> Domain Services
  -> Repositories
  -> PostgreSQL / Prisma
```

### Architectural principles

- **Server authoritative**: the client never decides loot, economy, danger, or final outcomes
- **Transactional mutations**: all critical multi-table operations run inside DB transactions
- **Idempotent sensitive flows**: extraction and other core mutations must not double-apply effects
- **DTO boundaries**: UI consumes DTOs, not raw Prisma models or internal domain types
- **Strict layer ownership**: UI does not talk directly to Prisma; repositories do not contain domain logic
- **Append-only ledger**: currency changes are recorded through ledger entries instead of mutable balances
- **Snapshot-based runs**: equipment/config relevant to runs is captured server-side at run start

### Why this architecture matters

This is not "just a Next.js app". It is a game backend disguised as a web app. The architecture exists to protect:

- economy consistency
- anti-cheat authority
- rollback safety
- long-term maintainability
- future system expansion without collapsing the codebase

---

## Game systems at a glance

Depending on the current phase and implemented slice, the repository covers or prepares systems like:

- active runs
- extraction resolution
- catastrophe penalties
- inventory and equipment
- currency ledger
- player progression and XP
- contracts
- crafting
- achievements
- upgrades
- live-ops / weekly directives
- market / economy flows

The foundational gameplay rule remains the same:

> **Wait longer for more value, but risk catastrophe.**

---

## Repository structure

High-level structure:

```text
app/                Next.js App Router routes and UI composition
components/         UI and game-facing components
server/             Actions, services, domain logic, repositories, auth, db
prisma/             Prisma schema, migrations, seed logic
docs/               Architecture, game design, status, test plans
types/              DTOs, API contracts, shared types
lib/                Validators, utilities, helpers
```

Important repository rules are documented in:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/game-design.md`
- `docs/project-status-canonical.md`
- `docs/test-plan.md`

---

## Getting started

## 1) Prerequisites

You will need:

- **Node.js 20+**
- **npm**
- **PostgreSQL**
- A **Google OAuth app** for Auth.js sign-in

## 2) Install dependencies

```bash
npm install
```

## 3) Configure environment variables

Create a `.env` file in the project root.

At minimum, configure:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/scrapsurvive"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/scrapsurvive"
DATABASE_URL_TEST="postgresql://USER:PASSWORD@localhost:5432/scrapsurvive_test"

AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# optional / operational
ADMIN_USER_IDS=""
```

### Notes

- `DATABASE_URL` is required for the application.
- `DIRECT_URL` is used by seed logic and is recommended.
- `DATABASE_URL_TEST` is recommended for integration tests.
- The repository currently includes a real `.env` file locally, but for public GitHub publication you should treat `.env` as local-only and never commit secrets.

## 4) Generate Prisma client

```bash
npx prisma generate
```

## 5) Run migrations

```bash
npx prisma migrate dev
```

## 6) Seed the database

```bash
npx prisma db seed
```

## 7) Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:unit
npm run test:integration
```

### Type-checking

There is no dedicated `typecheck` script yet, but the repository rules expect:

```bash
npx tsc --noEmit
```

---

## How to test the project

The project uses **Vitest** with separate unit and integration configurations.

### Run unit tests

```bash
npm run test:unit
```

### Run integration tests

```bash
npm run test:integration
```

### Integration test requirement

Integration tests require a valid PostgreSQL database connection via:

- `DATABASE_URL_TEST` (preferred), or
- `DATABASE_URL`

If neither is configured, integration tests will fail immediately.

### What is covered

According to `docs/test-plan.md`, the repository already includes coverage for areas such as:

- run calculator logic
- extraction resolution
- action security and ownership
- contracts
- crafting
- progression rules
- live-ops / weekly directives
- mutation guards / kill-switches
- economy observability

### Testing philosophy

This repo explicitly treats testing as **mandatory**, especially for:

- economy math
- run logic
- transactional flows
- ownership/security checks
- idempotency and rollback safety

---

## How to launch for production

### Local production-like run

```bash
npm run build
npm run start
```

### Intended deployment model

The project documentation is built around:

- **Vercel** for the Next.js app
- **Neon / PostgreSQL** for persistence

### Production notes

- Use `prisma migrate deploy` in production
- **Do not** use `prisma db push` in production
- Keep secrets out of the repository
- Treat the server as the only authority for economy and progression

---

## Engineering rules

This repository is opinionated on purpose.

### Non-negotiable rules

- no business-critical game logic in the client
- all server action inputs validated with Zod
- ownership checks before user-resource mutations
- transactions for multi-table critical flows
- DTOs to the UI, not Prisma models
- append-only currency ledger
- strict TypeScript
- tests required for every implementation change

If you want the full rulebook, read `AGENTS.md`.

---

## Documentation guide

### `AGENTS.md`
Repository constitution: architecture, stack rules, domain rules, UI rules, testing policy, anti-patterns, and definition of done.

### `docs/architecture.md`
Detailed technical architecture: layers, DTO rules, DB approach, server actions, domain boundaries, transactions, and structural conventions.

### `docs/game-design.md`
Product and game design intent: fantasy, progression, player motivations, systems direction, and game-feel goals.

### `docs/project-status-canonical.md`
Current official project phase and active focus. If another document disagrees, this one wins.

### `docs/test-plan.md`
Current testing strategy, existing suites, and the expected invariants being protected.

---

## Why this repository may be interesting

This project is useful if you want to study:

- how to build a server-authoritative browser game with Next.js
- how to structure a game economy around transactional integrity
- how to combine idle/incremental design with extraction tension
- how AI-assisted implementation behaves when architecture is treated seriously

It is also a strong example of a repo where **architecture is not decoration**. The architecture exists because the game systems depend on it.

---

## Public GitHub positioning

If you publish this repository, the clearest framing is:

> A full-AI-built idle extraction RPG prototype / product repository, where the human work centered on system design and software architecture, and the implementation was largely executed by GPT-5.3 Codex.

That positioning is honest, technically interesting, and differentiates the project from generic AI-generated demos.

---

## License

Add the license you want before publishing publicly.

If you plan to open-source the code on GitHub, include a proper `LICENSE` file so usage rights are explicit.
