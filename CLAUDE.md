# CLAUDE.md

## Release Process

Use `/release` to create a new release.

## MCPB / Claude Desktop Gotchas

- Claude Desktop uses its own **built-in Node.js** (not system Node) and runs with **CWD=`/`**
- Manifest `mcp_config.args` **must** use `${__dirname}` prefix — bare relative paths won't resolve
  - Correct: `"args": ["${__dirname}/dist/mcp/stdio.js"]`
  - Broken: `"args": ["dist/mcp/stdio.js"]`
- **Never use `console.log`** in stdio MCP servers — it writes to stdout and corrupts the JSON-RPC transport. Use `console.error` for all logging.
- **Avoid top-level imports of heavy/optional deps** (e.g., `playwright`) — use dynamic `import()` inside functions to prevent import-time crashes
- Manifest env vars use `${user_config.key}` syntax (NOT `{{key}}`)
- Claude Desktop does NOT use `package.json` `bin` or `main` fields — only `manifest.json` `server.mcp_config`
- Install location: `~/Library/Application Support/Claude/Claude Extensions/<extension-id>/`

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
