#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', '..', 'debug.log');

function log(msg: string) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(logFile, line);
  process.stderr.write(line);
}

log('Wrapper starting...');

process.on('uncaughtException', (error: Error) => {
  log(`Uncaught exception: ${error.stack || error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  log(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

log(`Node version: ${process.version}`);
log(`CWD: ${process.cwd()}`);
log(`ENV keys: ${Object.keys(process.env).filter(k => k.startsWith('TP_')).join(', ')}`);

import('./stdio.js')
  .then(() => log('stdio module loaded successfully'))
  .catch((error: Error) => {
    log(`Failed to load stdio module: ${error.stack || error.message}`);
    process.exit(1);
  });
