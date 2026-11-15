# Getting Started Guide

## Prerequisites
- Node.js >= 18 (recommended Node 20+)
- npm >= 9

## Setup & Running Locally

1. Install the exact dependencies recorded in the lockfile:
   ```bash
   npm ci
   ```

2. Start local Vite development server:
   ```bash
   npm run dev
   ```

3. Run typecheck:
   ```bash
   npm run typecheck
   ```

4. Run unit tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Development Workflow

- Checkout paths may contain spaces or non-ASCII characters. Vite and Vitest share
  the aliases in `vite.config.ts`; use `fileURLToPath` when converting a file URL
  into an alias path. Reading `URL.pathname` directly leaves characters encoded
  (for example, a space becomes `%20`) and prevents imports from resolving.
- Before handing off a change, run `npm run typecheck`, `npm test`, and
  `npm run build` from the repository root.

- Never commit directly to `main` branch.
- Create feature branches: `feature/<name>`, `fix/<name>`, `refactor/<name>`.
- Write atomic commits with clear, concise messages.
- Add or update tests in `tests/` when modifying game logic.
- Update `/docs` whenever adding systems or changing architecture.
