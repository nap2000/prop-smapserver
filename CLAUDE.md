# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Client-side (browser) code for the Smap platform. Served by Apache; the backend REST API lives in `~/git/smapserver2`. Pages talk to `/surveyKPI/...` endpoints.

## Modules

| Directory | URL prefix | What it does |
|-----------|-----------|--------------|
| `smapServer/` | `/` | Survey editor, login, shared app modules |
| `tasks/` | `/app/tasks/` | Task management, workflow, managed forms |
| `fieldManagerClient/` | `/app/fieldManager/` | Admin: users, notifications, monitor |
| `fieldAnalysis/` | `/app/fieldAnalysis/` | Internal analysis dashboard |
| `myWork/` | `/app/myWork/` | Webforms launcher |

## Build commands

Every module uses the same pattern:

```sh
cd <module>
npm run build:dev   # development (unminified)
npm run build       # production (minified)
```

Deploy a module locally (requires `$WEBSITE_DOCS` set and sudo for apache):
```sh
cd <module> && ./dep.sh develop   # build:dev + copy to $WEBSITE_DOCS + restart apache
cd <module> && ./dep.sh           # production build + deploy
```

Deploy all modules: `./depAll.sh [develop]` from repo root.

## Shared modules (critical architecture)

`smapServer/WebContent/js/app/` contains modules imported by **all other modules** via webpack aliases:

- `common.js` — auth helpers (`getLoggedInUser`, `handleLogout`), hourglass, AJAX wrappers
- `localise.js` — i18n (`localise.set[key]`, `localise.setlang()`, `initLocale()`)
- `globals.js` — cross-module state (`globals.viewHandlers` etc.)
- `data.js` — data fetching and dispatch for the analysis dashboard

Each module's `webpack.config.js` aliases these names so `import localise from "localise"` resolves to the smapServer copy. Never duplicate these — always import from the alias.

## Webpack bundles

Each entry point in `webpack.config.js` produces `WebContent/build/js/<name>.bundle.js`. HTML pages load the bundle directly via `<script src="...build/js/workflow.bundle.js">`. Externals (jQuery, Bootstrap, moment, bootbox, OpenLayers) are loaded as globals from CDN/static files in HTML `<head>` — **not** bundled.

`splitChunks` is disabled — every bundle is self-contained. No shared runtime chunk.

## tasks module specifics

The most actively developed module. Webpack entry points:

- `workflow.js` → workflow canvas page
- `taskManagement.js`, `managed_forms.js`, `campaign.js`, `contacts.js`, `linkages.js`, `log.js`

After editing any JS in `tasks/WebContent/js/`, rebuild with `cd tasks && npm run build:dev`.

## Server-side counterpart

Java REST API in `~/git/smapserver2`. Key classes for workflow:
- `sdDAL/src/.../model/WorkflowItem.java` — data model returned by API
- `sdDAL/src/.../managers/WorkflowManager.java` — builds workflow nodes from `forward` and `task_group` tables
- `surveyKPI/src/.../Workflow.java` — REST endpoints

Frontend calls `/surveyKPI/workflow/items`, `/surveyKPI/workflow/positions`, `/surveyKPI/workflow/edit/*`.

## JavaScript conventions

- ES modules throughout (`import`/`export`); `"use strict"` at top
- `const`/`let` for new code; existing `var` left alone
- DOM ready via `$(document).ready(...)` at module bottom after `localise.initLocale(...).then(...)`
- **All user-visible labels must be localised** — never hardcode text; always use `localise.set[key]` in JS and `data-lang="key"` on HTML elements. Add new keys to `smapServer/WebContent/js/nls/root/lang.js` (the English root file). Other locales in `nls/<locale>/lang.js` only need entries for strings that differ from root.
- `esc(s)` helper used to HTML-escape before inserting into `innerHTML`
- No TypeScript; no test framework

## Workflow page design

Full specification in `~/git/smapserver2/docs/workflow-page-design.md`. The workflow page renders nodes derived from `forward` (notifications) and `task_group` tables. Node positions are persisted per-user in `workflow_node_positions`. The `WorkflowItem` fields:
- `name` — survey display name (shown in card body)
- `label` — notification/task-group name, the user-entered step label (shown in card header)
- `assignee` — for task/case nodes
- `fwdIds` / `tgIds` — backing record IDs for edit/delete operations
