# The Oregon Move

A private-by-design decision board for planning a family move to the west side of the Portland metro area. The working target is to be physically moved by **August 27, 2027**, school-ready by **August 30**, and fully settled by **September 1, 2027**.

The GitHub Pages site brings together:

- a schematic area map with job anchors, waterways, schools, hazards, and live Zillow/Redfin searches;
- editable sale-proceeds, debt-paydown, affordability, and four-path housing models;
- separate **My model** and **Partner model** browser workspaces;
- a local-only candidate notebook for listings and research links; and
- an editable 12-month Gantt roadmap.

The four housing paths are rent first, buy move-in-ready, buy a fixer, and buy land/build. The planner compares them without selecting a winner.

## Privacy boundary

This repository and its Pages site are public. They must never contain names, street addresses, account or loan identifiers, exact private balances, child details, resume contact details, credentials, or populated private-plan exports.

The published site contains rounded fictional examples and public research. Household inputs stay in memory or opt-in browser storage. Browser storage is not a vault and does not synchronize between devices. JSON exports are unencrypted and should be exchanged only through a private channel.

A partially populated, gitignored starter is kept at `private/household-model.private.json` on this computer. The source material in `../wil-bud` and `../mdw-jobs` is not copied into the repository.

## Project map

- `landing-page/` — dependency-free planner published by GitHub Pages.
- `docs/PLAN.md` — decision framework and roadmap.
- `docs/SOURCES.md` — dated evidence registry and refresh cadence.
- `docs/PRIVATE_DATA_GUIDE.md` — private-data workflow and missing inputs.
- `scripts/check.sh` — model, privacy, source, and deployment checks.
- `WORKFORCE.md` — commission, decisions, risks, and verification ledger.

## Local verification

```sh
./scripts/check.sh
```

Serve the repository root with any local static server, then open `/landing-page/`. For example:

```sh
python3 -m http.server 4173
```

## Important limits

This is a decision aid, not lender approval, an appraisal, a property inspection, a title report, tax advice, financial advice, or legal advice. Rates, listings, taxes, school boundaries, calendars, permits, insurance, openings, and employer work models change. Replace planning assumptions with address-specific evidence and written quotes before committing money.
