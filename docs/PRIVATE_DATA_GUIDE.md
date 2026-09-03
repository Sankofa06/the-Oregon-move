# Private Planning Data Guide

The Pages site is the shared framework. Household numbers are private working data.

## Using the two workspaces

1. Choose **My model** or **Partner model** in the planner. Each is a separate browser-local workspace.
2. Import a private JSON file or enter estimates. Avoid names, street addresses, account or loan numbers, credentials, and child-identifying details.
3. Turn on **Save on this device** only on a trusted computer. Otherwise inputs remain in that tab's memory.
4. Use **Hide private values** before screen sharing. It obscures editable inputs and calculated dollar outputs in the active private model; still avoid opening exported JSON or browser developer tools while sharing.
5. Export JSON to hand a model to the other person or device. The file is unencrypted; share it privately and delete stale copies.
6. Never commit an export. `oregon-move-private-*.json`, the older `oregon-move-*-model-*.json` pattern, `*.private.json`, and `private/` are ignored, but always inspect Git's staged files before pushing.

The two workspaces do not automatically merge or cloud-sync. To compare ideas across devices, export one workspace and import it into the intended workspace on the other device. Import replaces only the active workspace after validation.

## Local starter

This computer has a gitignored starter at `private/household-model.private.json`. It contains only the preliminary financial estimates already supplied, not the street address or other direct identifiers. Import it into either private workspace, then fill the remaining fields.

The most useful missing inputs are:

- household monthly take-home income;
- liquid cash and any other move funds;
- current required monthly debt payments;
- the amount of debt the sale proceeds should pay off;
- the monthly payments that payoff would eliminate;
- essential monthly non-housing spending;
- the minimum reserve to preserve; and
- a comfortable maximum monthly housing payment.

These fields matter more than gross salary alone because the model separately tests lender-style debt-to-income guides, post-payoff monthly cash flow, cash to close, reserve preservation, and transition costs.

## Current-home sale packet

- Current mortgage and any other lien payoff statements.
- A sale range supported by a local comparative market analysis, not only automated estimates.
- Negotiated selling-cost assumption, concessions, fixed closing costs, and two seller net sheets.
- Repair and staging quotes, prioritized by likely sale value or sale certainty.
- Title, ownership, lien, permit, insurance-claim, basis, and capital-improvement records.
- The maximum tolerable overlap between the current home and Oregon housing.

The planner's three sale cases deliberately pair the lower sale estimate with the higher preparation estimate, the working values together, and the higher sale estimate with the lower preparation estimate. Planned debt payoff is then deducted once when estimating usable move funds.

## Oregon housing packet

For every live option, record a neutral nickname, link, asking price or rent, housing path, area, and brief notes in the candidate notebook. Before treating it as viable, verify the exact address's property tax, insurance, school assignment, commute at likely work times, pet rules, condition, utilities, hazards, fees, and closing or move-in timing.

Land/build also requires written evidence for zoning and overlays, legal access, wetlands/flood/slope, utilities, well/septic, survey/geotechnical work, jurisdiction fees, builder bids, construction financing, carrying costs, and a rent-first fallback.

## Career packet

- Target role family and the truthful fit with current experience.
- Employer, exact worksite or durable remote terms, schedule/shift, compensation, relocation support, application stage, and next action.
- Interview stories covering systems leadership, automation, regulated execution, supplier/customer collaboration, AI-assisted products, and executive decision support.
- Gaps that must not be overstated, including deep fabrication, silicon, low-level GPU, hyperscale-infrastructure ownership, or research experience.
