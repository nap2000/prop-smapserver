# Bootstrap 5 HTML Migration Checklist

Scope: migrate Bootstrap 4 pages to Bootstrap 5 in this branch, no compatibility shim.

## Strategy

- Phase 1: global asset switch
    - replace all HTML includes to BS5 files, remove Popper v1 tags.
    - keep one shared bootstrap include pattern across modules.
- Phase 2: codemod markup
    - automated pass for attrs/classes listed above.
    - then manual fix for complex forms/nav/tab blocks.
- Phase 3: JS API refactor
    - replace jQuery plugin calls in entry scripts to BS5 constructors.
    - remove shim once all calls migrated.
- Phase 4: plugin replacements
    - datetimepicker + bootbox + custom-file behavior.
    - verify all modal/calendar/report flows.
- Phase 5: regression sweep by module
    - start low-risk pages (login/register/errors), then smapServer, then tasks, then fieldManagerClient (highest UI complexity), then fieldAnalysis/myWork/dashboard.

Decisions:
- Date/time picker migration target: `flatpickr`
- Remove Bootbox usage; use Bootstrap modals instead
- Excluded from this checklist: `fieldAnalysis/WebContent/index.html`

## Checklist

Legend:
- S1: Swap assets to Bootstrap 5 (`bootstrap.min.css`, `bootstrap.bundle.min.js`), remove Popper v1 include
- S2: Rename data attributes (`data-toggle/target/dismiss/parent/...` -> `data-bs-*`)
- S3: Update Bootstrap 4 classes (`btn-default`, `sr-only`, `custom-*`, `input-group-append`, `btn-block`, etc.)
- S4: Update page JS to Bootstrap 5 API (`bootstrap.Modal/Tab/Tooltip/Dropdown`) where page relies on jQuery plugin calls
- S5: Replace datetimepicker usage with `flatpickr` (only where used)
- S6: Remove Bootbox usage and replace with Bootstrap modal flows (only where used)
- MT: Manual testing completed for this page

Use `[x]` when complete, `[ ]` when pending, `[-]` when not applicable.

## smapServer

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `smapServer/WebContent/index.html` | [x] | [x] | [x] | [x] | [-] | [-] | [ ] |
| `smapServer/WebContent/translate.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/edit.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `smapServer/WebContent/meta.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/surveyRoles.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/login.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/inlineLogin.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/logout.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/register.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/terms.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/unauthorised.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/deleteaccount.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/motd.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/errors/403.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/errors/404.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/errors/405.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/errors/500.html` | [x] | [x] | [x] | [-] | [-] | [-] | [ ] |
| `smapServer/WebContent/app/api.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/cases.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/changePassword.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/changes.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/forgottenPassword.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/reports.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/resetForgottonPassword.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/resource_history.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/resources.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/serverState.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/subscriptions.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/templates.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `smapServer/WebContent/app/userTrail.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |

## tasks

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `tasks/WebContent/campaign.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `tasks/WebContent/contacts.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `tasks/WebContent/duplicates.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `tasks/WebContent/linkages.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `tasks/WebContent/log.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `tasks/WebContent/managed_forms.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `tasks/WebContent/taskManagement.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |

## fieldManagerClient

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `fieldManagerClient/WebContent/billing.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `fieldManagerClient/WebContent/monitor.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `fieldManagerClient/WebContent/notifications.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `fieldManagerClient/WebContent/settings.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `fieldManagerClient/WebContent/surveyManagement.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |
| `fieldManagerClient/WebContent/userManagement.html` | [x] | [x] | [x] | [x] | [x] | [ ] | [ ] |

## fieldAnalysis

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `fieldAnalysis/WebContent/modify_data.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `fieldAnalysis/WebContent/review_audit.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |

## myWork

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `myWork/WebContent/done.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `myWork/WebContent/history.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |
| `myWork/WebContent/index.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |

## dashboard

| Page | S1 | S2 | S3 | S4 | S5 | S6 | MT |
|---|---|---|---|---|---|---|---|
| `dashboard/WebContent/index.html` | [x] | [x] | [x] | [x] | [-] | [ ] | [ ] |

## Manual test checklist template (for MT column)

- Navbar collapse/dropdown works on desktop + mobile widths
- All modals open/close via UI and programmatic triggers
- Tabs/collapse/tooltip interactions work
- Form controls render correctly (checkbox/radio/select/file)
- Date/time input works (flatpickr pages)
- Validation and save workflows work
- No console errors on page load + common actions

## Recommended execution order

Use this order to de-risk migration while keeping momentum.

1. Foundation and shared assets
   - Add Bootstrap 5 + flatpickr assets in shared locations
   - Update common include patterns used across pages
   - Remove Bootstrap 4.5 and Popper v1 includes from all HTML pages
   - Remove deprecated Bootstrap 4 asset files from deploy bundles once no page references them
   - Prepare utility replacements used by many pages (`btn-default`, `sr-only`, etc.)

2. Low-risk static/auth pages (quick wins)
   - `smapServer/WebContent/errors/403.html`
   - `smapServer/WebContent/errors/404.html`
   - `smapServer/WebContent/errors/405.html`
   - `smapServer/WebContent/errors/500.html`
   - `smapServer/WebContent/motd.html`
   - `smapServer/WebContent/terms.html`
   - `smapServer/WebContent/unauthorised.html`
   - `smapServer/WebContent/login.html`
   - `smapServer/WebContent/inlineLogin.html`
   - `smapServer/WebContent/logout.html`
   - `smapServer/WebContent/deleteaccount.html`

3. Simple app pages (light interactivity)
   - `smapServer/WebContent/app/changePassword.html`
   - `smapServer/WebContent/app/forgottenPassword.html`
   - `smapServer/WebContent/app/resetForgottonPassword.html`
   - `smapServer/WebContent/app/subscriptions.html`
   - `smapServer/WebContent/app/resource_history.html`
   - `myWork/WebContent/done.html`

4. Core smapServer UI pages (moderate complexity)
   - `smapServer/WebContent/index.html`
   - `smapServer/WebContent/register.html`
   - `smapServer/WebContent/meta.html`
   - `smapServer/WebContent/surveyRoles.html`
   - `smapServer/WebContent/app/api.html`
   - `smapServer/WebContent/app/serverState.html`
   - `smapServer/WebContent/app/changes.html`
   - `smapServer/WebContent/app/templates.html`
   - `smapServer/WebContent/app/reports.html`
   - `smapServer/WebContent/app/cases.html`
   - `smapServer/WebContent/app/resources.html`
   - `smapServer/WebContent/app/userTrail.html`
   - `smapServer/WebContent/translate.html`
   - `smapServer/WebContent/edit.html`

5. tasks module (high interaction)
   - `tasks/WebContent/linkages.html`
   - `tasks/WebContent/contacts.html`
   - `tasks/WebContent/duplicates.html`
   - `tasks/WebContent/log.html`
   - `tasks/WebContent/campaign.html`
   - `tasks/WebContent/taskManagement.html`
   - `tasks/WebContent/managed_forms.html`

6. fieldManagerClient module (highest complexity)
   - `fieldManagerClient/WebContent/billing.html`
   - `fieldManagerClient/WebContent/monitor.html`
   - `fieldManagerClient/WebContent/notifications.html`
   - `fieldManagerClient/WebContent/settings.html`
   - `fieldManagerClient/WebContent/surveyManagement.html`
   - `fieldManagerClient/WebContent/userManagement.html`

7. fieldAnalysis + legacy dashboard wrap-up
   - `fieldAnalysis/WebContent/modify_data.html`
   - `fieldAnalysis/WebContent/review_audit.html`
   - `dashboard/WebContent/index.html`

8. myWork remaining pages
   - `myWork/WebContent/history.html`
   - `myWork/WebContent/index.html`

9. Final cross-module hardening
   - Remove remaining Bootstrap 4 assets from module `WebContent`/deploy outputs
   - Remove remaining Bootbox imports/usages and verify modal replacements
   - Remove bootstrap-datetimepicker assets and verify all flatpickr flows
   - Full manual regression sweep using MT column for all pages
