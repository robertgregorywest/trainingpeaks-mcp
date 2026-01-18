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

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
