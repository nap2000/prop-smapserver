# AGENTS

## Scope
- Applies to entire repo unless overridden by future nested AGENTS.
- Audience: agentic coding agents working here.
- Default to minimal, surgical edits; avoid drive-by refactors.
- Respect existing licensing headers.
- Prefer clarity over cleverness.
- Assume no network access; do not add dependencies without approval.

## Repo Layout
- Root scripts: `depAll.sh` orchestrates module deploys.
- Module `smapServer`: main app WebContent, build tools, dep.sh.
- Module `tasks`: task UI assets.
- Module `fieldManagerClient`: admin/field manager UI assets.
- Module `fieldAnalysis`: internal dashboard UI assets.
- Module `myWork`: webforms manager UI assets.
- Module `dashboard`: legacy quicksight dashboard (deprecated).
- Each module has `tools/r_2_3_6.js` and `Gruntfile.js` for minify.

## Prerequisites
- Node + npm available (grunt runs via local devDependencies and grunt-cli dependency).
- Apache deploy target set by env var `WEBSITE_DOCS`.
- `~/deploy/smap/deploy/version1` directory expected by dep scripts.
- `grunt` available (uses `grunt-contrib-uglify`).
- Scripts assume macOS/Linux, tar available.

## Install Dependencies
- Each module already has `package.json` (minimal). Run per module if needed:
- `cd smapServer && npm install`
- `cd tasks && npm install`
- `cd fieldManagerClient && npm install`
- `cd fieldAnalysis && npm install`
- `cd myWork && npm install` (if package.json exists; verify first)
- `cd dashboard && npm install` (rarely needed)
- For global grunt CLI if missing: `npm install -g grunt-cli` (avoid unless necessary).

## Build / Minify / Deploy
- Top-level all-modules deploy: `./depAll.sh [develop]` from repo root.
- Each module dep script accepts optional `develop` to skip minify removal.
- smapServer: `cd smapServer && ./dep.sh [develop]`
- tasks: `cd tasks && ./dep.sh [develop]`
- fieldManagerClient: `cd fieldManagerClient && ./dep.sh [develop]`
- fieldAnalysis: `cd fieldAnalysis && ./dep.sh [develop]`
- myWork: `cd myWork && ./dep.sh [develop]`
- dashboard: `cd dashboard && ./dep.sh`
- Grunt default task per module minifies JS per `Gruntfile.js`.
- RequireJS build: `node tools/r_2_3_6.js -o tools/build.js` (module-specific).
- Dep scripts package tarballs to `~/deploy/smap/deploy/version1`.
- Dep scripts copy assets to `$WEBSITE_DOCS/...` and restart apache.
- Be careful: dep scripts `rm -rf` target dirs; confirm paths before running.

## Running a Single Step Without Full Deploy
- Minify only (smapServer example): `cd smapServer && grunt`
- Copy non-minified for develop (smapServer): `cd smapServer && cp WebContent/js/edit.js WebContent/js/edit.min.js` (dep.sh handles when `develop`).
- For tasks/fieldManagerClient/fieldAnalysis similar pattern copying .js to .min.js when develop.

## Tests
- No automated tests present; no test runner scripts.
- Single-test execution not available; manual validation required.
- If adding tests, colocate with module and document commands here.

## Lint / Format
- No lint scripts configured; prefer manual consistency.
- Follow existing whitespace (tabs in legacy files; spaces elsewhere).
- Max line length: keep under ~120 chars when editing.
- Preserve existing indentation style per file.
- Do not auto-format entire files; limit changes to touched regions.

## JavaScript Style (AMD/RequireJS heavy)
- Use `"use strict"` at top where missing when feasible.
- Prefer `const`/`let` for new code; leave existing `var` unless nearby refactor.
- RequireJS: add deps in `paths`/`shim` then in `require([...], function(...) { ... })` matching order.
- Keep dependency lists sorted logically: core libs, shared app modules, feature modules.
- Avoid polluting globals; attach to existing namespaces (e.g., `globals`, `window.*` only when pattern used).
- Prefer pure functions; minimize side effects in init blocks.
- When editing UI code, ensure DOM ready wrappers remain (`$(document).ready(...)`).
- Use strict equality `===` / `!==`.
- Prefer early returns to deep nesting.
- Keep inline HTML building minimal; sanitize user input.

## Naming
- Files: keep current module naming (camelCase for JS in WebContent/js, snake for minified targets).
- Variables/functions: camelCase; constructors PascalCase.
- Constants: UPPER_SNAKE only when pattern exists.
- DOM refs prefixed `$` when jQuery objects (follow existing code like `$gCurrentRow`).
- Booleans readable (`isX`, `hasX`, `shouldX`).

## Imports / Requires
- Group external libs first, then shared app modules, then feature modules.
- Match parameter order with dependency array exactly.
- Avoid circular requires; reuse shared modules instead of duplicate logic.
- Keep `require.config` paths relative to module layout; do not break baseUrl assumptions.

## Error Handling
- Use `bootbox` dialogs where pattern exists for user-facing errors.
- Fallback to `alert` only if bootbox unavailable.
- Log recoverable issues via `console.error` sparingly (remove noisy logs before commit).
- Guard DOM lookups; null-check before use.
- Validate inputs before AJAX/submit; show user-friendly messages.
- When catching errors, include context (operation, identifiers) without leaking secrets.

## Data Fetching / AJAX
- Prefer existing helper modules (`app/common`, `app/globals`, etc.) when available.
- Respect locale handling (`gUserLocale`, `localise.setlang`).
- Handle auth/session expiry paths consistent with current flows.
- Debounce rapid requests that mutate state.

## UI / DOM
- Keep event binding patterns consistent (`.click`, `.change`); unbind when reattaching if needed.
- Update view-state helpers (e.g., `changeset.updateViewControls`) after DOM toggles.
- Maintain accessibility basics: labels for inputs, keyboard focus when adding dialogs.
- Ensure translations exist when adding user-facing text; use `localise.set[...]` keys if present.

## Build Artifacts
- Do not edit generated `.min.js` directly; edit source `.js` and rebuild if needed.
- Tools outputs placed under module directories (`tasks/js/*.min.js`, etc.).
- Cleanups in dep scripts delete originals; keep backups during development if editing locally.

## Git / Process
- Do not commit unless user requests.
- Keep diffs small and localized.
- Document new commands or conventions here if you add them.

## Cursor / Copilot Rules
- No `.cursorrules` or `.cursor/rules` found.
- No `.github/copilot-instructions.md` found.

## Working Notes
- Apache deploy steps require sudo; avoid running unless necessary.
- If unsure about deploy target, run dep script with `develop` to skip minify removal and review outputs.
- Legacy code may mix tabs/spaces; preserve surrounding style.
- Large files: read in chunks; avoid mass changes.
- Internationalization matters; avoid hardcoding locale-specific strings.
- Be conservative with dependency upgrades; repository uses older RequireJS setup.

## When Adding Tests (future)
- Place tests alongside module with clear npm script added to module `package.json`.
- Define `npm test` per module; document single-test invocation (e.g., `npm test -- <pattern>`) when added.

## Quick Reference Commands
- `./depAll.sh` — run all module deploys.
- `cd smapServer && ./dep.sh develop` — build without minify deletion for smapServer.
- `cd tasks && grunt` — minify task scripts only.
- `cd fieldManagerClient && grunt` — minify field manager scripts only.
- `cd fieldAnalysis && grunt` — minify dashboard scripts only.
- `cd myWork && node tools/r_2_3_6.js -o tools/build.js` — run require build only.
- `sudo apachectl restart` — used by dep scripts; ensure permissions.

## Contact
- No automated guidance beyond this file; follow patterns above.
