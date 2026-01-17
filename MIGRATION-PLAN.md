# Migration Plan: RequireJS → Webpack (smapServer)

## Goals
- Replace RequireJS runtime/build with webpack bundles.
- Preserve localisation via `js/nls/<lang>/lang.js`.
- Remove legacy/unused tooling (RequireJS optimizer, Grunt uglify, Modernizr legacy, unused plugins).
- Keep shared globals accessible (e.g., `setupUserProfile`, `setTheme`).

## Approach
- Start with the smapServer module. This contains library files for other modules but is not itself dependent on the other modules.
- First remove Modernizr. Replace its use in files with other webpack compatible approaches that achieve the same thing. Then stop and test.
- Then end the use of uglify.  This only reduces file sizes but will not be used in the webpack version. Then stop and test.
- Do not remove tools such as grunt that will become obsolete.  These will still be required if the changes have to be reverted or an older version has to be built
- Find javascript files that are loaded as shared modules and refactor them to use ES module exports
- Ask for confirmation before changing or deleting any file
- Update this file n the "Lessons learned" section with anything learn't during the migration

### Pattern for each javascript file:
- Remove `requirejs/require.config`.
- Import needed libs/modules directly; ensure jQuery global if plugins need it.
- Set `gUserLocale` from localStorage/navigator.
- Call `localise.initLocale(gUserLocale).then(localise.setlang);`
- Keep page logic unchanged otherwise.
- Update corresponding HTML to `/build/js/<entry>.js` if not already.

### Globals and Shared Functions
- Preferred path: refactor shared helpers in `app/common.js` (and other shared modules) to ES module exports and import them explicitly in each entry. Where that is too risky, temporarily expose known-needed functions on `window` as an interim step (e.g., `setupUserProfile`, `getLoggedInUser`, `setTheme`, `setCustomEdit`, `setLogo`).
  - Avoid no-ops unless confirmed unused; migrate real implementations and only then expose them as needed during transition.
- Keep `app/jqueryGlobal.js` to expose jQuery on `window` for legacy plugins that expect it; plan to remove once plugins are migrated or dropped.

## Localisation
- Keep fetch-based loader in `app/localise`; locales remain under `js/nls/<lang>/lang.js`.
- Ensure `localise.initLocale` is called before `setlang` in each entry.

## Webpack Notes
- Output to `WebContent/build/js`; `publicPath` `/build/js/`.
- `ProvidePlugin` for jQuery if needed; `noParse` for large legacy libs as required.
- Babel preset-env targeting modern browsers (no IE).

## Deploy
- `npm run build` (prod) / `npm run build:dev`.
- `./dep.sh [develop]` packages WebContent and copies to deploy dir.
- Ensure full WebContent (HTML + bundles + assets) is copied.

## Validation
- After each entry migration: `npm run build:dev`; fix remaining legacy AMD warnings by removing unused AMD plugins or shimming globals.
- Manual checks: load pages (edit, resources, serverState, etc.), verify localisation, user profile modal, and key flows.
- Always retain full page functionality: keep existing event handlers and logic intact. If refactoring wrappers, ensure the body of each entry file is preserved. Prefer reverting to the last known good version if functionality drops, then re-apply minimal import/bootstrap changes.

## Lessons Learned from pilot
- Use webpack externals for `jquery` so legacy plugins (bootstrap, multiselect, toggle) stay attached to the global jQuery instance.
- AMD locale files contain comments; loading via dynamic `<script>` + `define` capture avoids CSP `unsafe-eval` and JSON parse errors.
- Watch for `const`→`let` conversions in migrated modules (legacy code mutates arrays like `gGroupStacks`, `modelGeneratedChanges`).
- Keep `bootstrap4-toggle` and `bootstrap-multiselect` loaded via script tag to avoid AMD wrapper conflicts.
- Copy full `WebContent` in deploy packaging; copying only `build` drops required `js/` assets.
- Disable splitChunks/runtime while multiple entries are in flux; keep single `edit.bundle.js` + `resources.bundle.js` until shared chunks are planned.
- `resources.html` now loads `moment-with-locales.2.24.0.min.js` via script tag; webpack bundle is minimal and relies on global `moment`.
- Import Bootbox as module and assign `window.bootbox` so alerts render HTML; avoid `alert()` fallback.
- Translate save alerts should not `htmlEncode` change messages or tags show up.
- When converting from RequireJS, ensure handler blocks are still closed; missing `});` can skip later bindings.
