# The Oregon Move

A private-by-design planning workspace for a family move to the west side of the Portland metro area. The first target is to be physically moved and settled by **August 27, 2027**, with **September 1, 2027** as the school-ready milestone.

The shareable site compares four paths without selecting a winner:

1. Rent first.
2. Buy a move-in-ready home.
3. Buy a fixer.
4. Buy land and build.

It also ties housing decisions to a job-first career gate, current-home sale readiness, post-move liquidity, and a month-by-month roadmap.

## Privacy boundary

This repository is designed to be public. It must never contain names, home addresses, account or loan identifiers, exact private balances, resume contact details, credentials, or exported private plans.

The published site contains dated market references and rounded examples. Exact household inputs remain in memory or opt-in browser storage. A downloaded plan file is unencrypted and must be shared privately; the public Pages link never carries those values.

The planning source material in `../wil-bud` and `../mdw-jobs` is intentionally not copied into this repository.

## Project map

- `landing-page/` — dependency-free planner published by GitHub Pages.
- `docs/PLAN.md` — the working decision roadmap.
- `docs/SOURCES.md` — dated evidence registry and refresh cadence.
- `docs/PRIVATE_DATA_GUIDE.md` — what the couple should gather without committing it.
- `scripts/check.sh` — focused privacy, source, and site checks.
- `WORKFORCE.md` — commission, decisions, risks, and verification ledger.

## Local verification

```sh
./scripts/check.sh
```

Serve the page from the repository root so project-relative behavior matches Pages:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/landing-page/`.

## Important limits

This project is a decision aid, not a lender approval, appraisal, property inspection, title report, tax opinion, financial plan, or legal opinion. Rates, listings, taxes, school boundaries, permits, insurance, job openings, and employer work models change. Refresh them at the cadence in `docs/SOURCES.md` and replace planning assumptions with written quotes before committing money.

