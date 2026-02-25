---
name: release
description: Bump version, commit, tag, and push a new release
user_invocable: true
---

# Release

Automates the release process for this project.

## Steps

1. Ask the user for the new version number (e.g. `0.11.0`) if not provided as an argument
2. Update the `"version"` field in `package.json`
3. Run `npm install --package-lock-only` to sync `package-lock.json`
4. Update the `"version"` field in `manifest.json`
5. Stage all three files and commit with message `<version>` (e.g. `0.11.0`)
6. Tag: `git tag v<version>`
7. Push commit and tag: `git push && git push origin v<version>`

The GitHub Action (`.github/workflows/release.yml`) automatically creates the GitHub release with the MCPB bundle when the `v*` tag is pushed.
