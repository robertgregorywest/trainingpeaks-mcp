# trainingpeaks-mcp

A TypeScript library for access to your TrainingPeaks data.

## Installation

```bash
npm install trainingpeaks-api
```

You'll also need to install Playwright's Chromium browser:

```bash
npx playwright install chromium
```

## Usage

```typescript
import { createClient } from 'trainingpeaks-api';

// Create client using environment variables
const client = createClient();

// Or pass credentials directly
const client = createClient({
  username: 'your-email@example.com',
  password: 'your-password',
});

// Get user info
const user = await client.getUser();
console.log(`Athlete ID: ${user.athleteId}`);

// Get workouts for a date range
const workouts = await client.getWorkouts('2024-01-01', '2024-12-31');

// Get workout details with metrics
const details = await client.getWorkoutDetails(workouts[0].workoutId);
console.log(details.metrics); // HR, power, cadence, etc.

// Get current fitness (CTL/ATL/TSB)
const fitness = await client.getCurrentFitness();

// Clean up when done
await client.close();
```

## Environment Variables

Set these environment variables to avoid passing credentials in code:

```bash
TP_USERNAME=your-email@example.com
TP_PASSWORD=your-password
```

## API Reference

### Client Options

```typescript
const client = createClient({
  username?: string,    // TrainingPeaks email (or use TP_USERNAME env var)
  password?: string,    // TrainingPeaks password (or use TP_PASSWORD env var)
  headless?: boolean,   // Run browser in headless mode (default: true)
});
```

### Methods

#### User

- `getUser()` - Get user profile including athlete ID
- `getAthleteId()` - Get just the athlete ID

#### Workouts

- `getWorkouts(startDate, endDate, options?)` - List workouts in date range
- `getWorkout(workoutId)` - Get single workout summary
- `getWorkoutDetails(workoutId)` - Get workout with full metrics

#### Files

- `downloadFitFile(workoutId)` - Download FIT file as Buffer
- `downloadAttachment(workoutId, attachmentId)` - Download attachment as Buffer

#### Fitness

- `getFitnessData(startDate, endDate)` - Get CTL/ATL/TSB for date range
- `getCurrentFitness()` - Get today's fitness metrics

#### Peaks

- `getPeaks(sport, type, options?)` - Get personal records
- `getAllPeaks(sport, options?)` - Get all PRs for a sport
- `getWorkoutPeaks(workoutId)` - Get PRs from a specific workout
- `getPowerPeaks(options?)` - Get cycling power PRs
- `getRunningPeaks(options?)` - Get running pace PRs

### Types

```typescript
interface WorkoutSummary {
  workoutId: number;
  athleteId: number;
  title?: string;
  workoutDay: string;
  workoutType: string;
  totalTime?: number;        // hours
  totalDistance?: number;    // meters
  tssActual?: number;
  elevationGain?: number;
  // ... and more
}

interface WorkoutDetail extends WorkoutSummary {
  metrics?: {
    averageHeartRate?: number;
    maxHeartRate?: number;
    averagePower?: number;
    maxPower?: number;
    normalizedPower?: number;
    averageCadence?: number;
    maxCadence?: number;
    averageSpeed?: number;
    maxSpeed?: number;
  };
}

interface FitnessMetrics {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  dailyTss?: number;
}
```

## How It Works

This library uses Playwright to automate browser login to TrainingPeaks, capturing the authentication token from API requests. The token is then used for subsequent API calls.

## Requirements

- Node.js 20+
- Playwright Chromium browser

## License

MIT
