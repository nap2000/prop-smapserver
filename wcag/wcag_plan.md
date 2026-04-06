# WCAG 2.2 AA Compliance Assessment Plan

This plan guides validation that the Smap application conforms to WCAG 2.2 AA, supporting an internal accessibility statement for tender purposes.

## Web Pages to be Validated

### smapServer
| Page | Description |
|------|-------------|
| smapServer/WebContent/index.html | Home / landing page |
| smapServer/WebContent/login.html | Login page |
| smapServer/WebContent/inlineLogin.html | Inline login (embedded) |
| smapServer/WebContent/register.html | User registration |
| smapServer/WebContent/unauthorised.html | Authorisation error |
| smapServer/WebContent/logout.html | Logout confirmation |
| smapServer/WebContent/deleteaccount.html | Account deletion |
| smapServer/WebContent/motd.html | Message of the day |
| smapServer/WebContent/acknowledgements.html | Acknowledgements |
| smapServer/WebContent/terms.html | Terms and conditions |
| smapServer/WebContent/meta.html | Survey metadata |
| smapServer/WebContent/translate.html | Translation management |
| smapServer/WebContent/edit.html | Form editor |
| smapServer/WebContent/surveyRoles.html | Survey roles |
| smapServer/WebContent/app/changes.html | Change history |
| smapServer/WebContent/app/resource_history.html | Resource history |
| smapServer/WebContent/app/cases.html | Cases |
| smapServer/WebContent/app/resetForgottonPassword.html | Reset forgotten password |
| smapServer/WebContent/app/subscriptions.html | Subscriptions |
| smapServer/WebContent/app/serverState.html | Server state |
| smapServer/WebContent/app/changePassword.html | Change password |
| smapServer/WebContent/app/resources.html | Resources |
| smapServer/WebContent/app/templates.html | Templates |
| smapServer/WebContent/app/forgottenPassword.html | Forgotten password |
| smapServer/WebContent/app/userTrail.html | User trail / audit |
| smapServer/WebContent/app/api.html | API explorer |
| smapServer/WebContent/app/reports.html | Reports |
| smapServer/WebContent/errors/403.html | 403 Forbidden error |
| smapServer/WebContent/errors/404.html | 404 Not Found error |
| smapServer/WebContent/errors/405.html | 405 Method Not Allowed error |
| smapServer/WebContent/errors/500.html | 500 Internal Server error |

### fieldManagerClient
| Page | Description |
|------|-------------|
| fieldManagerClient/WebContent/surveyManagement.html | Survey management |
| fieldManagerClient/WebContent/userManagement.html | User management |
| fieldManagerClient/WebContent/billing.html | Billing |
| fieldManagerClient/WebContent/settings.html | Organisation settings |
| fieldManagerClient/WebContent/notifications.html | Notifications |
| fieldManagerClient/WebContent/monitor.html | Monitor |

### tasks
| Page | Description |
|------|-------------|
| tasks/WebContent/managed_forms.html | Managed forms |
| tasks/WebContent/taskManagement.html | Task management |
| tasks/WebContent/campaign.html | Campaigns |
| tasks/WebContent/contacts.html | Contacts |
| tasks/WebContent/linkages.html | Linkages |
| tasks/WebContent/log.html | Task log |
| tasks/WebContent/duplicates.html | Duplicate management |

### myWork
| Page | Description |
|------|-------------|
| myWork/WebContent/index.html | My work dashboard |
| myWork/WebContent/done.html | Completed tasks |
| myWork/WebContent/history.html | Work history |
| https://dev.smap.com.au/app/myWork/webForm (Full Widgets no rank) | WebForm Device Tests Project |

### fieldAnalysis
| Page | Description |
|------|-------------|
| fieldAnalysis/WebContent/index.html | Analysis dashboard |
| fieldAnalysis/WebContent/modify_data.html | Data modification |
| fieldAnalysis/WebContent/review_audit.html | Review / audit |

### dashboard
| Page | Description |
|------|-------------|
| dashboard/WebContent/index.html | Dashboard |

---

## User Flows Validated

- **Login**: Home (`/index.html`) → Login (`inlineLogin.html`) → Survey Management (`surveyManagement.html`)
- **Password reset**: Login → Forgotten Password → Reset Password
- **Form authoring**: Survey Management → Form Editor (`edit.html`)
- **Data collection (field)**: My Work (`myWork/index.html`) → Task completion
- **Data analysis**: Analysis dashboard → Modify data / Review audit
- **Administration**: User Management → Settings → Notifications

---

## 1. Lighthouse Automated Checks

Run Chrome DevTools Lighthouse (Accessibility category) against each page while authenticated. Target score: ≥ 90.

| Page | Score | Issues |
|------|--|--------|
| smapServer/WebContent/index.html | 100 | |
| smapServer/WebContent/login.html |  | |
| smapServer/WebContent/inlineLogin.html | 100 | |
| smapServer/WebContent/register.html |  | |
| smapServer/WebContent/unauthorised.html |  | |
| smapServer/WebContent/logout.html |  | |
| smapServer/WebContent/deleteaccount.html |  | |
| smapServer/WebContent/acknowledgements.html |  | |
| smapServer/WebContent/terms.html |  | |
| smapServer/WebContent/meta.html |  | |
| smapServer/WebContent/translate.html |  | |
| smapServer/WebContent/edit.html |  | |
| smapServer/WebContent/surveyRoles.html |  | |
| smapServer/WebContent/app/changes.html |  | |
| smapServer/WebContent/app/resource_history.html |  | |
| smapServer/WebContent/app/cases.html |  | |
| smapServer/WebContent/app/resetForgottonPassword.html |  | |
| smapServer/WebContent/app/subscriptions.html |  | |
| smapServer/WebContent/app/serverState.html |  | |
| smapServer/WebContent/app/changePassword.html |  | |
| smapServer/WebContent/app/resources.html |  | |
| smapServer/WebContent/app/templates.html |  | |
| smapServer/WebContent/app/forgottenPassword.html |  | |
| smapServer/WebContent/app/userTrail.html |  | |
| smapServer/WebContent/app/api.html |  | |
| smapServer/WebContent/app/reports.html |  | |
| smapServer/WebContent/errors/403.html |  | |
| smapServer/WebContent/errors/404.html |  | |
| smapServer/WebContent/errors/405.html |  | |
| smapServer/WebContent/errors/500.html |  | |
| fieldManagerClient/WebContent/surveyManagement.html | 100 | |
| fieldManagerClient/WebContent/userManagement.html |  | |
| fieldManagerClient/WebContent/billing.html |  | |
| fieldManagerClient/WebContent/settings.html |  | |
| fieldManagerClient/WebContent/notifications.html |  | |
| fieldManagerClient/WebContent/monitor.html |  | |
| tasks/WebContent/managed_forms.html |  | |
| tasks/WebContent/taskManagement.html |  | |
| tasks/WebContent/campaign.html |  | |
| tasks/WebContent/contacts.html |  | |
| tasks/WebContent/linkages.html |  | |
| tasks/WebContent/log.html |  | |
| tasks/WebContent/duplicates.html |  | |
| myWork/WebContent/index.html |  | |
| myWork/WebContent/done.html |  | |
| myWork/WebContent/history.html |  | |
| fieldAnalysis/WebContent/index.html |  | |
| fieldAnalysis/WebContent/modify_data.html |  | |
| fieldAnalysis/WebContent/review_audit.html |  | |
| dashboard/WebContent/index.html |  | |
| https://dev.smap.com.au/app/myWork/webForm (Full Widgets no rank) | 100 |     |

---

## 2. axe-core / WAVE Automated Checks

Run the [axe DevTools browser extension](https://www.deque.com/axe/devtools/) or [WAVE](https://wave.webaim.org/) on each page while authenticated. These tools catch violations Lighthouse misses (e.g. ARIA misuse, focus order, form label associations).

Focus on pages with dynamic content / modals: `edit.html`, `surveyManagement.html`, `managed_forms.html`, `taskManagement.html`, `index.html` (analysis).

| Page | axe Violations | WAVE Errors | Notes                    |
|------|---------------|------|--------------------------|
| smapServer/WebContent/index.html | |      |                          |
| smapServer/WebContent/login.html | |      |                          |
| smapServer/WebContent/inlineLogin.html | |      |                          |
| smapServer/WebContent/register.html | |      |                          |
| smapServer/WebContent/edit.html | |      | Dynamic modal-heavy page |
| fieldManagerClient/WebContent/surveyManagement.html | | None | AIM Score 9.9.  5 Alerts |
| fieldManagerClient/WebContent/userManagement.html | |      |                          |
| fieldManagerClient/WebContent/notifications.html | |      | Modal dialogs            |
| tasks/WebContent/managed_forms.html | |      |                          |
| tasks/WebContent/taskManagement.html | |      |                          |
| myWork/WebContent/index.html | |      |                          |
| fieldAnalysis/WebContent/index.html | |      |                          |
| https://dev.smap.com.au/app/myWork/webForm (Full Widgets no rank) | | None | ARM Score 9.6. 24 Alerts |

---

## 3. AI-Assisted Source Code Review (Claude)

Static review of HTML source and JavaScript for WCAG criteria that automated tools may miss. Each file is reviewed against the checklist below.

### Review checklist per page
- [ ] `lang` attribute on `<html>`
- [ ] Logical heading hierarchy (h1→h2→h3)
- [ ] All images have meaningful `alt` text (or `alt=""` if decorative)
- [ ] All form inputs have associated `<label>` or `aria-label`
- [ ] Buttons have discernible text or `aria-label`
- [ ] Links have meaningful text (no bare "click here")
- [ ] `<title>` element present and descriptive
- [ ] Colour is not the sole means of conveying information
- [ ] Focus is managed correctly when modals/dialogs open and close
- [ ] Dynamic content updates announced via `aria-live` where appropriate
- [ ] No `tabindex` values > 0 (avoid breaking natural tab order)
- [ ] Error messages are programmatically associated with inputs (`aria-describedby`)

### Results

| Page | Issues Found | Status |
|------|-------------|--------|
| smapServer/WebContent/index.html | Two `<h1>` elements (heading hierarchy); content (MOTD, FieldTask) outside `<main>`; password toggle icon lacks aria-label | Reviewed |
| smapServer/WebContent/login.html | Missing `<main>`; form inputs lack `<label>`; error alert not linked via `aria-describedby` | Reviewed |
| smapServer/WebContent/inlineLogin.html | `#logon_alert` not linked to inputs via `aria-describedby`; password toggle icon lacks aria-label | Reviewed |
| smapServer/WebContent/register.html | `<h1>` empty until localised; `invalid-feedback` divs not linked via `aria-describedby`; some content outside `<main>` | Reviewed |
| smapServer/WebContent/edit.html | Missing `<main>`; multiple icon-only buttons lack aria-label; form inputs lack labels; no `aria-describedby` for errors | Reviewed |
| fieldManagerClient/WebContent/surveyManagement.html | `<main>` added this session ✓; form inputs in modals lack labels; no `aria-describedby`; some modals missing `role="dialog"` | Reviewed |
| fieldManagerClient/WebContent/userManagement.html | **Critical:** `tabindex` > 0 on multiple inputs (violates 2.4.3); missing `<main>`; form inputs lack labels; some modals missing `tabindex="-1"` | Reviewed |
| fieldManagerClient/WebContent/notifications.html | Missing `<main>`; form inputs lack labels (`name`, `update_value`, `callback_url`, `fwd_user`); empty `<label>` elements with only `data-lang` | Reviewed |
| tasks/WebContent/managed_forms.html | Missing `lang` on `<html>`; no `<main>`; multiple form inputs lack labels; icon-only buttons lack aria-label | Reviewed |
| tasks/WebContent/taskManagement.html | Missing `lang` on `<html>`; no `<main>`; form inputs lack labels; checkbox label associations unclear | Reviewed |
| myWork/WebContent/index.html | Missing `lang` on `<html>`; no `<main>`; `<select>` lacks label | Reviewed |
| fieldAnalysis/WebContent/index.html | `role="main"` present but no semantic `<main>` element; some buttons lack visible text; no `aria-describedby` for errors | Reviewed |

### Common findings across all pages
1. **`<main>` landmark missing** — most pages use `<div class="container-fluid">` as top-level wrapper
2. **No `aria-describedby`** — error/alert divs not programmatically linked to their inputs on any page
3. **Missing `lang` attribute** — managed_forms, taskManagement, myWork/index all missing `lang="en"` on `<html>`
4. **`tabindex` > 0** — userManagement.html has tabindex 1–12 on modal inputs (critical, breaks tab order)
5. **Icon-only buttons/links** — edit.html and managed_forms.html have unlabelled icon buttons beyond those already fixed

---

## 4. Keyboard Navigation Testing

Manual testing: navigate each major user flow using keyboard only (Tab, Shift+Tab, Enter, Space, Escape, arrow keys). No mouse.

### Pass criteria
- All interactive elements reachable via Tab
- Visible focus indicator on every focused element
- Modals trap focus while open; return focus on close
- Dropdown menus / date pickers operable without mouse
- No keyboard traps (can always Tab out)

### Pages tested
- `smapServer/WebContent/index.html` — Home
- `smapServer/WebContent/inlineLogin.html` — Login
- `fieldManagerClient/WebContent/surveyManagement.html` — Survey Management

### Test date: 2026-03-31

| User Flow | Pages | Keyboard Navigable | Focus Visible | Modal Focus Trap | Notes |
|-----------|-------|--------------------|---------------|-----------------|-------|
| Logon | index.html, inlineLogin.html | Pass | Pass | N/A | |
| Generate local report | surveyManagement.html | Pass | Pass | Pass | Usage report modal tested |
| Forgot password | | | | N/A | Not yet tested |
| Survey management (CRUD) | surveyManagement.html | | | | Not yet tested |
| Form editor | edit.html | | | | Complex drag/drop UI |
| User management | userManagement.html | | | | |
| Notifications dialog | notifications.html | | | | |
| Task management | taskManagement.html | | | | |
| My work / submit task | myWork/index.html | | | | |
| WebForm (full widgets) | https://dev.smap.com.au/app/myWork/webForm (Full Widgets no rank) | Pass | Pass | N/A | Keyboard tested 2026-04-06 |

---

## 5. Screen Reader Testing

Test key flows with a screen reader to validate experience for visually impaired users.

**Recommended tools:**
- macOS: VoiceOver (built-in, `Cmd+F5`)
- Windows: NVDA (free) or JAWS
- Browser: Chrome or Firefox recommended

### Flows to test

| Flow | Screen Reader | Browser | Pass/Fail | Notes |
|------|--------------|---------|-----------|-------|
| Login | VoiceOver | Chrome | | |
| Navigate survey list | VoiceOver | Chrome | | |
| Open / close notification dialog | VoiceOver | Chrome | | |
| Fill and submit a managed form | VoiceOver | Chrome | | |
| Error message on invalid input | VoiceOver | Chrome | | |

---

## 6. Responsive / Zoom Testing

WCAG 1.4.4 requires text to be resizable to 200% without loss of content or functionality.
WCAG 1.4.10 (Reflow) requires content to reflow at 320 CSS px width without horizontal scrolling.

### Test date: 2026-03-31

| Page | 200% zoom OK | 320px reflow OK | Notes |
|------|-------------|-----------------|-------|
| smapServer/WebContent/index.html | Pass | Pass | |
| smapServer/WebContent/login.html | Pass | Pass | |
| smapServer/WebContent/edit.html | | | Complex layout |
| fieldManagerClient/WebContent/surveyManagement.html | Pass | Pass | |
| tasks/WebContent/managed_forms.html | | | |
| myWork/WebContent/index.html | | | |
| fieldAnalysis/WebContent/index.html | | | |

---

## 7. Known Exceptions / Partial Conformance

Document any areas where full conformance is not achievable and the justification.

| Page / Feature | WCAG Criterion | Reason | Workaround / Mitigation |
|---------------|---------------|--------|------------------------|
| Form editor drag-and-drop | 2.1.1 Keyboard | Complex drag/drop UI; keyboard alternative in roadmap | Reordering also possible via menu |
| Map / GIS panels | 1.1.1 Non-text content | Dynamic map tiles — no equivalent text alternative | Tabular data view available |

---

## 8. Accessibility Statement

Once testing is complete, produce a formal accessibility statement covering:
- Conformance status (full / partial / non-conformance with WCAG 2.2 AA)
- Known non-conformances (from section 8)
- Assessment approach (internal evaluation)
- Date of assessment
- Contact details for accessibility feedback
- Formal complaints procedure

**Target statement date:** 2026-04-30
