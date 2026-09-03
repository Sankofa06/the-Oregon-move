# Oregon Move Workforce Record

## V2 commission — September 2, 2026

- Outcome and audience: turn the delivered planning page into a private-working tool for the couple while preserving the reality that the GitHub Pages URL and tracked repository are public.
- Inspectable deliverables: a schematic regional map; current public job, school, area, water, and listing-search references; a local candidate notebook; an editable Gantt-style roadmap; separate browser-local “My view” and “Partner view” workspaces; and a sale/debt/affordability model that can be initialized from a gitignored private file.
- Definition of done: both workspaces can be edited, saved locally by explicit opt-in, exported, imported, and switched without cross-contamination; map layers and candidate pins work; the sale range and ownership affordability math reconcile; timeline edits update the Gantt; current links are dated and reachable; no private household values or address enter tracked Git; the public Pages deployment passes the repository check and a fresh acceptance review.
- Preservation set: retain the v1 four-path comparison, blank private start, illustrative public example, local-only persistence, import/export allowlisting, accessibility behavior, responsive layouts, Content Security Policy, test coverage, and source traceability.
- Delivery authority: the user explicitly requested a push for review tonight. This authorizes scoped commits, push to the existing public repository, and Pages verification; it does not authorize publishing private inputs, third-party outreach, applications, offers, purchases, or account changes.
- Crew mode: Full; assurance depth: Standard. Grounding lanes are read-only, the lead owns integration and publishing, and a fresh critic must review the frozen artifact before release.

### V2 decisions

- DEC-101: GitHub Pages is public even if the expected audience is two people. Exact address, salaries, mortgage balance, debt detail, children’s personal details, and other household truth stay in a gitignored starter file, browser storage, or exported JSON.
- DEC-102: Tonight’s version uses two independent local workspaces plus JSON handoff. Secure cross-device synchronization would require authenticated storage and is outside a static Pages deployment.
- DEC-103: The map is a dependency-free schematic SVG with no map tiles, remote scripts, geocoder, or network request generated from private inputs.
- DEC-104: Zillow and Redfin are linked through current search pages rather than scraped or republished. Specific candidates are entered into the local notebook and remain in the active workspace.
- DEC-105: Commute bands are orientation estimates only. Every candidate must be checked against the actual worksite, shift, route, and travel time before a decision.
- DEC-106: The working search ceiling is editable and can model a $700,000 purchase; the interface must distinguish an income-based ceiling from cash-to-close, debt-to-income, reserve, and comfort constraints.
- DEC-107: Area exploration expands beyond Hillsboro and Tigard to west- and southwest-Portland candidates, including Newberg and water-adjacent options, without ranking a winner before jobsite and property-specific evidence exist.

### V2 gate matrix

| Gate | Requirement | Oracle | State |
|---|---|---|---|
| G101 Privacy boundary | No address, exact household income/mortgage/debt, child-specific details, or private-source exports in tracked Git | tracked-file scan + gitignored starter check | Pass — targeted scan clean; starter and both current/legacy export patterns are ignored and checked |
| G102 Financial model | Sale low/working/high cases, planned debt payoff, usable move funds, gross-income DTI ceilings, comfort ceiling, and scenario headroom reconcile | deterministic unit tests + browser checks | Pass — 20/20 deterministic tests; illustrative browser values reconcile |
| G103 Dual workspaces | Independent local opt-in save, switch, clear, export, and import for each partner view | unit/browser persistence tests | Pass — distinct allowlisted keys; browser switch test retained separate values, candidate count, and task status |
| G104 Map and exploration | Jobs, areas, schools, water context, listing-search links, map filters, and local candidate pins are usable | source audit + browser interaction | Pass — 12 areas, four career lenses, waterways, district context, live searches, local notebook, and candidate pin tested |
| G105 Editable roadmap | A readable Gantt updates from target date, task duration, due date, owner, and status edits | deterministic tests + browser interaction | Pass — date/duration geometry tests and browser status edit passed; mobile chart is horizontally contained |
| G106 Accessibility/responsiveness | New controls, map alternative, Gantt, and candidate notebook work at keyboard/mobile/desktop sizes | automated inspection + browser review | Pass — labeled text alternative, 390px/1280px review, no page overflow, private inputs/outputs visibly obscure, and clean console |
| G107 Truth/traceability | Current material claims and outbound search/reference links are dated, scoped, and reachable | source registry + link checks | Pass with vendor caveat — adopted 2027–28 calendars corrected and linked; 21 links returned 200; other vendor pages returned bot-protection 403 rather than 404/DNS failures |
| G108 Delivery | Exact accepted artifact is pushed, Pages run succeeds, live HTTPS returns 200, and no self-hosted billable-time rule is violated | git/GitHub/API/live checks | Pass — accepted commit `c4d99dbb946be5e9f091a8e85757105acdf33c0a`; Pages run `33711242142` succeeded; live HTTPS returned 200 with v2 markers; timing API reported zero billable milliseconds |
| G109 Couple clarity | A fresh reader can tell what is known, what is estimated, what differs between workspaces, and the next decision | fresh acceptance critic | Pass — fresh rc3 release critic returned GO with no severity 3/2/1 findings |

### V2 active risks

- RSK-101 / S2 MATERIAL: Browser local storage does not synchronize between devices or browsers. Mitigation: make the boundary explicit and provide JSON export/import for handoff.
- RSK-102 / S2 MATERIAL: “What we can truly afford” cannot be settled from salaries and a home-value estimate alone. Recurring debt payments, credit, actual rates, taxes, insurance, childcare, sale proceeds, and desired reserve remain required inputs.
- RSK-103 / S1 LOCAL: Listing inventory, valuations, rates, jobs, school boundaries, and drive times can change daily. Mitigation: link live searches and official lookup tools, date orientation data, and keep candidates editable.
- RSK-104 / S1 LOCAL: A water view is not the same as waterfront access and can add flood, insurance, slope, or environmental constraints. Mitigation: treat water as a map/search preference and require parcel-level diligence.
- RSK-105 / S2 MATERIAL: A public static site cannot safely provide shared cloud persistence without an authenticated backend. Mitigation: no hidden telemetry or outbound storage; defer true synchronization.

### V2 current state

- State: DELIVERED(v2); fresh release criticism returned GO and the exact accepted artifact passed GitHub Pages and live-site verification.
- Canonical repository: this checkout, branch `main`, remote `origin`.
- Frozen artifact identity: SHA-256 `8ec0a893d02628d2ae4636cd573882a98313e380f7dbd1453bc49b021549c23c` over `.gitignore`, `README.md`, and the sorted tracked delivery files under `docs/`, `landing-page/`, `scripts/`, and `.github/workflows/`.

### V2 acceptance findings and repairs

- V2-ISS-101 / S2 MATERIAL / repaired and verified: current export filenames were not covered by the ignore rule or privacy scan. Exports now include a `private` marker, current and legacy patterns are ignored, the check detects either pattern, and `git check-ignore` passes both examples.
- V2-ISS-102 / S2 MATERIAL / repaired and verified: the screen-share toggle obscured calculated outputs but not editable private values. It is now disabled for the public example and obscures private text/date/number/URL/select/textarea controls plus financial outputs; computed browser styles confirm `blur(8px)` on number, URL, note, and output samples.
- V2-ISS-103 / S2 MATERIAL / repaired and verified: the release candidate incorrectly said 2027–28 calendars were unpublished. Official district sources confirm adopted calendars; the site now identifies the August 31 K–12 start window and TTSD's September 8 Pre-K/K start while keeping household grade details private and preschool placement program-specific.
- V2-ISS-104 / S1 LOCAL / repaired and verified: the countdown used the UTC calendar date, which could be one day short in Pacific evenings. It now derives the default from the browser's local calendar date; deterministic test and browser display both show 364 days from September 2, 2026 to September 1, 2027.
- V2-ISS-105 / assurance gap / repaired: `.gitignore` is included in the rc3 fingerprint scope.
- V2-ISS-106 / privacy hardening / repaired and verified: the public illustrative household composition no longer mirrors the private family description, and the roadmap refers to district classes rather than household grade details; the targeted tracked-file scan is clean.
- V2-ISS-107 / release acceptance / verified: a fresh critic independently matched the rc3 fingerprint, reran 20/20 tests and diff checks, exercised private-value hiding and My/Partner workspace isolation at desktop and mobile sizes, and returned GO with no material findings. One narrow-map employer label may truncate visually; the accessible adjacent area list retains the full label.

### V2 delivery evidence

- Accepted and deployed site commit: `c4d99dbb946be5e9f091a8e85757105acdf33c0a`.
- GitHub Pages run: `33711242142`, completed successfully on September 2, 2026 Pacific time.
- Live verification: `https://sankofa06.github.io/the-Oregon-move/` returned HTTPS 200 after deployment and contained the v2 dual-workspace, privacy-toggle, and editable-Gantt markers.
- Compute evidence: no repository-scoped self-hosted runner was configured; this workflow used its declared GitHub-hosted Ubuntu runner, and the run timing API reported zero billable milliseconds.

## Commission and non-goals

- Outcome and audience: a clear, couple-friendly roadmap for moving a family with children and dogs to the Hillsboro or Tigard area by September 1, 2027, with a semiconductor-career path and inspectable housing/finance scenarios.
- Inspectable deliverables: a sourced planning brief, an interactive dependency-free static site, a privacy-safe data workflow, a GitHub Pages deployment workflow, and verification evidence.
- Source precedence: current user request; repository guidance; private reference material in `../wil-bud` and `../mdw-jobs`; current authoritative/public sources; clearly labeled assumptions.
- Constraints: do not publish names, addresses, account balances, debt details, employer-confidential material, or resume contact information. Preserve both reference directories unchanged.
- Non-goals for v1: selecting a property, applying for a job or loan, contacting an agent/employer, making an offer, or representing estimates as professional financial, tax, legal, or real-estate advice.
- Delivery target: a sanitized public GitHub Pages project that can be shared with the user's wife. The user's explicit request to “get it on a GitHub pages” authorizes creating and publishing this privacy-scanned project; it does not authorize publishing private source values, purchases, or third-party outreach.

## Crew and state

- Crew mode: Full, because research, planning, interactive implementation, and public delivery have distinct evidence outputs that must be integrated.
- Assurance depth: Standard.
- Current state: DELIVERED(v4); final fresh criticism returned GO, the accepted site was published, and live verification passed.
- Artifact identity: site behavior accepted at `a04cdecc442ac0bae0920b8be5e89c26ea584b8c`; portable verification added at deployed snapshot `4b00271cd1930da99cdb34c9b5d119587b03f57f`; Pages run `33702087529`.

## Ready work and dependencies

1. Ground private household and career constraints without propagating sensitive values.
2. Ground current housing, land/build, rental, tax, and employer evidence.
3. Contract the scenario model, roadmap, privacy boundary, and source registry.
4. Build and integrate the site and deployment workflow.
5. Verify functionality, privacy, accessibility, responsive behavior, and deployment.
6. Run fresh-context criticism against the frozen artifact and repair material gaps.

## Owners and write locks

- Lead: commission, this record, integration, privacy decisions, publishing, final delivery.
- Grounding workers: read-only reference, market, and product/privacy evidence lanes.
- Build worker(s): exclusive files assigned after the contract is frozen.
- Acceptance critic: fresh worker with read-only access to the integrated artifact.

## Decision log

- DEC-001: Working move date is September 1, 2027 (roughly one year from the current date); the interface will keep it editable.
- DEC-002: `wl-bud` is interpreted as the existing `../wil-bud` directory.
- DEC-003: GitHub Pages is treated as public. The tracked site will contain safe defaults and rounded planning examples only; exact household inputs stay in browser-local storage or an exported private JSON file.
- DEC-004: Housing paths remain four parallel scenarios: land + build, move-in-ready purchase, fixer purchase, and rent-first.
- DEC-005: The physical move target is August 21–27, 2027; September 1, 2027 is the school-ready milestone because both target districts begin grades by then.
- DEC-006: Hillsboro and Tigard remain unranked until a worksite and shift pattern are known. Intel anchors Hillsboro; Lam/Tualatin strengthens Tigard; NVIDIA remains a role-by-role target.
- DEC-007: Public market figures are dated orientation cases. Property tax, insurance, HOA, maintenance, utilities, pet terms, and land feasibility remain blank until quoted for an actual property.

## Active signals

- RSK-001 / S2 MATERIAL: GitHub Pages does not provide confidentiality for household financial data. Mitigation is a local-only data layer, a clear privacy notice, and a tracked-file scan before publication.
- RSK-002 / S1 LOCAL: Housing prices, rates, job openings, taxes, and permits change. All such evidence requires an as-of date, source link, and editable assumption.
- RSK-003 / S1 LOCAL: A job at Intel, NVIDIA, or another employer is not assured. The plan must use career gates and fallback paths instead of assuming an offer.
- RSK-004 / S2 MATERIAL: A custom home completed by September 2027 is unlikely unless land, feasibility, design, financing, and a builder are secured early. The planner must retain rent-first as an explicit bridge.
- RSK-005 / S1 LOCAL: A city or mailing address does not prove school assignment, commute, taxes, insurance, or buildability. All decisions require address/parcel-specific evidence.

## Gate matrix

| Gate | Requirement | Oracle | State |
|---|---|---|---|
| G1 Reference fidelity | Use relevant household/career constraints without publishing sensitive source details | source audit + tracked-file privacy scan | Pass — sanitized synthesis only; private-name/contact/debt scan clean |
| G2 Decision completeness | Four housing paths, Hillsboro/Tigard comparison, current-home sale roadmap, career plan, and 12-month timeline | content inspection | Pass — site and `docs/PLAN.md` cover every surface |
| G3 Financial model | Editable assumptions with cash-to-close, monthly housing, runway, and gap comparisons; no false precision | deterministic browser tests | Pass — 11/11 model tests; live sale/date/HOA recalculation verified; cards now expose entry, committed, available, and post-move cash |
| G4 Privacy and safety | No PII/private financial values in git; local save/export/import clearly explained | scripted scans + manual inspection | Pass — `scripts/check.sh`; blank private start verified across 78 inputs; save/opt-out toggles and race test passed; reload returned to the unsaved example; no outbound-request API; CSP `connect-src 'none'` |
| G5 Usability/accessibility | Responsive, keyboard usable, visible focus, sufficient contrast, reduced-motion support | browser inspection at mobile/desktop sizes | Pass locally — 320/768/1280 render, no overflow, labeled controls, landmarks, 44px key targets; text accents pass at 5.30:1 or better, including 8.75:1 yellow-on-deep; import is a native button |
| G6 Truth/traceability | Material current claims carry source and as-of date; uncertainty is explicit | source registry audit | Pass — dated public source cards plus full `docs/SOURCES.md` registry |
| G7 Delivery | Pages workflow valid; repository and actual Pages URL confirmed; live site returns HTTP 200 | GitHub/API/workflow/site checks | Pass — public repository confirmed; run `33702087529` succeeded on `4b00271`; `https://sankofa06.github.io/the-Oregon-move/` returned HTTP 200 over HTTPS |
| G8 Couple clarity | A first-time reader can see status, next decision, path tradeoffs, and what to do this month | blind critic | Pass — final fresh critic returned GO with the opening status, four paths, tradeoffs, and next action intact |

## Open findings and fixes

- ISS-001 / S2 MATERIAL / applied and directly verified: clearing the editable target date threw a JavaScript error. The handler now preserves the plan, marks the control invalid, and shows an actionable message; live browser retest passed without a new error.
- ISS-002 / S2 MATERIAL / applied and directly verified: HOA, mortgage insurance, other monthly ownership costs, and ownership setup costs existed in the model but were not editable. All are now exposed for the three ownership paths; live HOA change adjusted monthly housing by the exact entered amount.
- ISS-003 / S1 LOCAL / applied and directly verified: key status and focus controls rendered below the 44px target-size bar. Verification overrides now enforce 44px; browser geometry check passed for all seven affected controls.
- ISS-004 / S2 MATERIAL / applied and directly verified: private mode inherited rounded example values without a strong enough boundary. New private plans begin with all 78 financial inputs blank; the shared target date and roadmap remain available.
- ISS-005 / S2 MATERIAL / applied and directly verified: scenario cards hid transition, setup, and moving cash inside reserve math. Cards expose total move cash, available funds, and cash after move alongside entry cash; the land example visibly reconciles $205,432 entry cash to $265,632 total move cash.
- ISS-006 / S1 LOCAL / applied and directly verified: small clay text and white text on clay missed WCAG AA contrast. The revised token measures 5.30:1 on paper and 5.69:1 with off-white control text, with context-specific dark-section overrides.
- ISS-007 / S2 MATERIAL / applied and directly verified: opting out of browser saving or clearing a plan could race a pending debounced write. Both actions cancel the timer, the callback rechecks mode and consent before storage, and a browser opt-out race returned to the illustrative example after reload.
- ISS-008 / S2 MATERIAL / applied and directly verified: the emphasized place heading retained a clay-on-deep pairing at 2.47:1. Browser-computed styles now measure yellow on deep at 8.75:1.
- ISS-009 / S1 LOCAL / applied and directly verified: the visually hidden file input received keyboard focus without a visible proxy. Import is a native visible button covered by the global focus indicator; it opens a labeled file input removed from sequential focus.
- ISS-010 / S1 LOCAL / applied and directly verified: UI ranges were looser than envelope validation, allowing values that could be stored but rejected on reload. Field bounds match the schema, every debounced write validates before storage, and a live 51-year input produced `aria-invalid` with the 1–50-year correction.
- ISS-011 / S2 MATERIAL / applied and directly verified: the document-level numeric/date input handler also received checkbox input events and re-rendered stale preferences before checkbox change handlers ran. It returns for non-model/non-path controls, `scripts/check.sh` asserts the routing guard, and the browser regression verified save on, saved status, hide on/off, save off, memory-only status, and illustrative mode after reload.
- ISS-012 / S1 LOCAL / applied and directly verified: the first GitHub-hosted Pages run passed all 11 tests but the privacy scan could not start because `rg` was absent. The verification script prefers `rg` and falls back to recursive `grep`; both local paths passed, and GitHub Pages run `33702087529` completed every step successfully.

## Pending authority / next action

- Delivery is complete. The next user-owned action is to open the live page, start a blank private plan, and enter the current financial truth set together; exact private values and the final housing-path choice stay outside Git.
