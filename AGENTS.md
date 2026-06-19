# Repository Instructions

## Project overview
- This package publishes a browser JavaScript bridge for Mini Apps to communicate with a Flutter SuperApp host.
- The public runtime is `mini-app-bridge.js`, exposed as both `window.superapp` and `window.lib.superapp`.
- TypeScript consumers use `mini-app-bridge.d.ts`; keep it aligned with the public API in `mini-app-bridge.js`.
- `mini-app-bridge.min.js` is a distributed artifact. When changing the runtime, update the minified file in the same change.

## Files and package metadata
- `package.json` declares `main` as `mini-app-bridge.js`, `types` as `mini-app-bridge.d.ts`, and publishes only the bridge JS, minified JS, and declarations.
- There is no source/build directory today; avoid introducing generated artifacts or toolchain files unless the task explicitly needs them.
- `README.md` is minimal. Update it when changing public usage, exported API, install instructions, or host integration behavior.

## Commands
- `npm test` is currently a placeholder that exits with an error. Do not treat it as a meaningful validation command until a real test suite is added.
- If you add a build, minify, lint, or test workflow, wire it into `package.json` scripts and document the command here.

## Code conventions
- Keep the bridge usable directly in browsers without a bundler.
- Preserve the existing IIFE/global export pattern unless the package format is intentionally redesigned.
- Keep API behavior consistent across `mini-app-bridge.js`, `mini-app-bridge.min.js`, and `mini-app-bridge.d.ts`.
- Validate bridge inputs explicitly and surface errors through the existing Promise rejection or logger patterns.
- Avoid broad silent fallbacks for host-channel failures; the bridge should make integration problems observable.

## Release considerations
- Keep the runtime `VERSION` constant in sync with package/versioning decisions when preparing releases.
- Before publishing, confirm the package `files` list still includes every required distribution file and excludes development-only files.
