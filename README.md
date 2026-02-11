# trainingpeaks-mcp

An MCP (Model Context Protocol) server for accessing your TrainingPeaks training data. Works with Claude Desktop, ChatGPT, and other MCP-compatible clients.

## Features

- **16 tools** for accessing workouts, fitness metrics, peaks/PRs, and files
- **Dual transport**: stdio for Claude Desktop, HTTP for ChatGPT
- **FIT file parsing**: Extract structured data from downloaded FIT files
- Also usable as a standalone TypeScript library

## Prerequisites

1. **TrainingPeaks account** - You need valid TrainingPeaks credentials
2. **Node.js 20+**
3. **Playwright Chromium** - Install with `npx playwright install chromium`

## Quick Start

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "trainingpeaks": {
      "command": "npx",
      "args": ["trainingpeaks-mcp"],
      "env": {
        "TP_USERNAME": "your-email@example.com",
        "TP_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart Claude Desktop. You can now ask Claude about your training data!

### ChatGPT (via HTTP)

1. Clone and install:
   ```bash
   git clone https://github.com/robertgregorywest/trainingpeaks-mcp.git
   cd trainingpeaks-mcp
   npm install
   ```

2. Create `.env` file with your credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your TrainingPeaks credentials
   ```

3. Build and start the HTTP server:
   ```bash
   npm run build
   npm run start:http
   ```
   You should see: `TrainingPeaks MCP HTTP server running on port 3000`

4. Install ngrok (if not already installed):

   **macOS (Homebrew):**
   ```bash
   brew install ngrok
   ```

   **Windows (Chocolatey):**
   ```bash
   choco install ngrok
   ```

   **Or download directly from:** https://ngrok.com/download

5. Create a free ngrok account and get your auth token:
   - Sign up at https://dashboard.ngrok.com/signup
   - Copy your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
   - Configure ngrok with your token:
     ```bash
     ngrok config add-authtoken YOUR_AUTH_TOKEN
     ```

6. Start ngrok to expose your local server (in a new terminal):
   ```bash
   ngrok http 3000
   ```

   ngrok will display output like:
   ```
   Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
   ```
   Copy the `https://...ngrok-free.app` URL.

7. Add the MCP connector in ChatGPT:
   - Go to ChatGPT Settings → Connectors → Add Connector
   - Enter your ngrok URL with `/mcp` path: `https://abc123.ngrok-free.app/mcp`
   - Save the connector

8. Test by asking ChatGPT about your TrainingPeaks data!

## Available Tools

| Tool | Description |
|------|-------------|
| `get_user` | Get user profile including athlete ID |
| `get_athlete_id` | Get just the athlete ID |
| `get_workouts` | List workouts in a date range |
| `get_workout` | Get single workout summary |
| `get_workout_details` | Get workout with full metrics, intervals, laps, zones |
| `search_workouts` | Search workouts by title (case-insensitive) within a number of days |
| `compare_intervals` | Compare laps/intervals side-by-side across workouts with power/duration filters |
| `download_attachment` | Download workout attachment |
| `parse_fit_file` | Parse FIT file and extract structured data |
| `get_fitness_data` | Get CTL/ATL/TSB for date range |
| `get_current_fitness` | Get today's fitness metrics |
| `get_peaks` | Get peaks for specific sport and type |
| `get_all_peaks` | Get all peaks for a sport |
| `get_workout_peaks` | Get PRs from specific workout |
| `get_power_peaks` | Get cycling power PRs |
| `get_running_peaks` | Get running pace PRs |

## Example Prompts

- "What workouts did I do last week?"
- "Show me my current fitness (CTL, ATL, TSB)"
- "What are my best 5-minute power efforts?"
- "Get details for my most recent ride including heart rate zones"
- "Download and parse the FIT file from yesterday's run"
- "Search for all my tempo workouts in the last 30 days"
- "Compare the intervals across my last 3 threshold rides"

## Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Then edit `.env` with your TrainingPeaks credentials:

```
TP_USERNAME=your-email@example.com
TP_PASSWORD=your-password
```

| Variable | Description |
|----------|-------------|
| `TP_USERNAME` | TrainingPeaks email address |
| `TP_PASSWORD` | TrainingPeaks password |
| `PORT` | HTTP server port (default: 3000) |

## Library Usage

You can also use this package as a standalone TypeScript library:

```typescript
import { createClient } from 'trainingpeaks-mcp';

const client = createClient();

// Get workouts for a date range
const workouts = await client.getWorkouts('2024-01-01', '2024-12-31');

// Get workout details with metrics
const details = await client.getWorkoutDetails(workouts[0].workoutId);
console.log(details.metrics);

// Get current fitness
const fitness = await client.getCurrentFitness();
console.log(`CTL: ${fitness.ctl}, ATL: ${fitness.atl}, TSB: ${fitness.tsb}`);

// Clean up when done
await client.close();
```

## Development

```bash
npm run build        # Compile TypeScript
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run typecheck    # Type-check without emitting
```

### Integration Tests

Integration tests make real API calls to TrainingPeaks to verify all endpoints work correctly.

**Prerequisites:**
1. Create `.env` file with your TrainingPeaks credentials (see [Environment Variables](#environment-variables))
2. Install Playwright: `npx playwright install chromium`

**Run integration tests:**
```bash
npm run test:integration
```

**What's tested:**
- User API: `getUser`, `getAthleteId`
- Workouts API: `getWorkouts`, `getWorkout`, `getWorkoutDetails`
- Fitness API: `getCurrentFitness`, `getFitnessData`
- Peaks API: `getAllPeaks`, `getPeaks`, `getWorkoutPeaks`, `getPowerPeaks`, `getRunningPeaks`
- Files API: `downloadActivityFile`

Tests are skipped automatically if credentials are not available.

## How It Works

This library uses Playwright to automate browser login to TrainingPeaks, capturing the authentication token from API requests. The token is then used for subsequent API calls.

## License

MIT
