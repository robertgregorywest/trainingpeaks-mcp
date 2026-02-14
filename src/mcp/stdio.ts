#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'child_process';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrainingPeaksClient } from '../index.js';
import { createMcpServer } from './server.js';

function ensurePlaywrightChromium(): Promise<void> {
  console.error('[trainingpeaks-mcp] Ensuring Playwright Chromium is installed...');
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'install', 'chromium'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    child.stderr?.on('data', (data: Buffer) => {
      console.error(`[trainingpeaks-mcp] playwright: ${data.toString().trim()}`);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[trainingpeaks-mcp] Warning: Playwright install exited with code ${code}`);
      }
      resolve();
    });
    child.on('error', (error) => {
      console.error('[trainingpeaks-mcp] Warning: Failed to install Chromium:', error);
      resolve();
    });
  });
}

async function main() {
  let client: TrainingPeaksClient;
  try {
    client = new TrainingPeaksClient();
  } catch (error) {
    console.error('[trainingpeaks-mcp] Failed to create client:', error);
    process.exit(1);
  }

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

  console.error('[trainingpeaks-mcp] Connecting stdio transport...');
  await server.connect(transport);
  console.error('[trainingpeaks-mcp] Server connected.');

  // Install Playwright Chromium async after transport is live
  await ensurePlaywrightChromium();
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
