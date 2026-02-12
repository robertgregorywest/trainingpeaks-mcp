#!/usr/bin/env node
import 'dotenv/config';
import { execSync } from 'child_process';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrainingPeaksClient } from '../index.js';
import { createMcpServer } from './server.js';

function ensurePlaywrightChromium(): void {
  console.error('[trainingpeaks-mcp] Ensuring Playwright Chromium is installed...');
  try {
    execSync('npx playwright install chromium', { stdio: 'ignore' });
  } catch (error) {
    console.error('[trainingpeaks-mcp] Warning: Failed to install Chromium:', error);
  }
}

async function main() {
  ensurePlaywrightChromium();
  const client = new TrainingPeaksClient();
  const server = createMcpServer(client);
  const transport = new StdioServerTransport();

  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    await client.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await client.close();
    process.exit(0);
  });

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
