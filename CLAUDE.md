# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrainingPeaks API - A library for programmatic access to TrainingPeaks data.

## Commands

```bash
npm run build        # Compile TypeScript
npm run lint         # Run ESLint
npm run lint:fix     # Fix lint issues
npm run format       # Format with Prettier
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run typecheck    # Type-check without emitting
```

## Tech Stack

- TypeScript with ESM modules
- Vitest for testing
- ESLint + Prettier for code quality
- Node 20+

## Release Process

When creating a release, bump the version in **all three** files:

1. `package.json` — `"version"` field
2. `package-lock.json` — run `npm install --package-lock-only` after updating package.json
3. `manifest.json` — `"version"` field (MCPB manifest shown in Claude Desktop)

Then:

1. Commit the version bump (message: `<version>`)
2. Tag: `git tag v<version>`
3. Push commit and tag: `git push && git push origin v<version>`

The GitHub Action (`.github/workflows/release.yml`) automatically creates the release with the MCPB bundle when a `v*` tag is pushed.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
