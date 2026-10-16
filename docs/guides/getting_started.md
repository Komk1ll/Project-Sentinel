# Getting Started Guide

## Prerequisites
- Node.js >= 18 (recommended Node 20+)
- npm >= 9

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
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

- Never commit directly to `main` branch.
- Create feature branches: `feature/<name>`, `fix/<name>`, `refactor/<name>`.
- Write atomic commits with clear, concise messages.
- Add or update tests in `tests/` when modifying game logic.
- Update `/docs` whenever adding systems or changing architecture.
