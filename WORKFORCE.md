# Oregon Move Workforce Record

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
- Current state: REVISED(v2); first criticism stopped on material gaps, repairs and direct checks passed, and a new snapshot is being frozen for a different critic.
- Artifact identity: `the-Oregon-move` v2 snapshot, identified by the next local commit supplied to the repeat critic.

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
| G4 Privacy and safety | No PII/private financial values in git; local save/export/import clearly explained | scripted scans + manual inspection | Pass — `scripts/check.sh`; blank private start verified across 78 inputs; opt-out race test returned to the unsaved example; no outbound-request API; CSP `connect-src 'none'` |
| G5 Usability/accessibility | Responsive, keyboard usable, visible focus, sufficient contrast, reduced-motion support | browser inspection at mobile/desktop sizes | Pass locally — 320/768/1280 render, no overflow, labeled controls, landmarks, 44px key targets; text-accent contrast 5.30:1 on paper and pressed-control contrast 5.69:1 |
| G6 Truth/traceability | Material current claims carry source and as-of date; uncertainty is explicit | source registry audit | Pass — dated public source cards plus full `docs/SOURCES.md` registry |
| G7 Delivery | Pages workflow valid; repository and actual Pages URL confirmed; live site returns HTTP 200 | GitHub/API/workflow/site checks | Pending |
| G8 Couple clarity | A first-time reader can see status, next decision, path tradeoffs, and what to do this month | blind critic | Pending |

## Open findings and fixes

- ISS-001 / S2 MATERIAL / applied and directly verified: clearing the editable target date threw a JavaScript error. The handler now preserves the plan, marks the control invalid, and shows an actionable message; live browser retest passed without a new error.
- ISS-002 / S2 MATERIAL / applied and directly verified: HOA, mortgage insurance, other monthly ownership costs, and ownership setup costs existed in the model but were not editable. All are now exposed for the three ownership paths; live HOA change adjusted monthly housing by the exact entered amount.
- ISS-003 / S1 LOCAL / applied and directly verified: key status and focus controls rendered below the 44px target-size bar. Verification overrides now enforce 44px; browser geometry check passed for all seven affected controls.
- ISS-004 / S2 MATERIAL / applied and directly verified: private mode inherited rounded example values without a strong enough boundary. New private plans begin with all 78 financial inputs blank; the shared target date and roadmap remain available.
- ISS-005 / S2 MATERIAL / applied and directly verified: scenario cards hid transition, setup, and moving cash inside reserve math. Cards expose total move cash, available funds, and cash after move alongside entry cash; the land example visibly reconciles $205,432 entry cash to $265,632 total move cash.
- ISS-006 / S1 LOCAL / applied and directly verified: small clay text and white text on clay missed WCAG AA contrast. The revised token measures 5.30:1 on paper and 5.69:1 with off-white control text, with context-specific dark-section overrides.
- ISS-007 / S2 MATERIAL / applied and directly verified: opting out of browser saving or clearing a plan could race a pending debounced write. Both actions cancel the timer, the callback rechecks mode and consent before storage, and a browser opt-out race returned to the illustrative example after reload.

## Pending authority / next action

- Freeze v2 and obtain a clean verdict from a different fresh acceptance critic before publication. Exact private financial inputs and a final housing-path choice remain user-owned follow-up decisions.
