import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMPORT_BYTES,
  addMonthsClamped,
  amortizedPayment,
  computeAffordability,
  computeFixer,
  computeHomeSale,
  computeLandBuild,
  computePlan,
  computeReadyHome,
  computeSaleRange,
  daysRemaining,
  deriveTaskStartDate,
  ganttPosition,
  localDateString,
  sanitizeImportedEnvelope,
  validateEnvelope,
  workspaceStorageKey,
} from "../landing-page/model.mjs";
import { blankPrivateEnvelope, exampleEnvelope } from "../landing-page/public-data.mjs";

const closeTo = (actual, expected, epsilon = 0.01) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≠ ${expected}`);
const monthly = (basis = 500_000) => ({ interestRateAnnual: 0.06, termYears: 30, propertyTaxBasisUsd: basis, propertyTaxRateAnnual: 0.01, insuranceAnnualUsd: 1_200, hoaMonthlyUsd: 0, pmiMonthlyUsd: 0, maintenanceRateAnnual: 0.01, otherMonthlyUsd: 0 });
const saleFixture = () => ({ salePriceLowUsd: 400_000, salePriceWorkingUsd: 450_000, salePriceHighUsd: 500_000, prepMinUsd: 10_000, prepWorkingUsd: 20_000, prepMaxUsd: 30_000, mortgagePayoffUsd: 300_000, otherLienPayoffUsd: 10_000, sellingCostRate: 0.06, sellerFixedClosingUsd: 5_000, sellerConcessionsUsd: 0 });

test("ready-home fixture computes principal, close cash, P&I, and housing", () => {
  const result = computeReadyHome({ purchasePriceUsd: 500_000, downPaymentRate: 0.2, buyerClosingRate: 0.03, prepaidsUsd: 2_000, monthly: monthly() });
  closeTo(result.principal, 400_000); closeTo(result.entryCash, 117_000); closeTo(result.monthly.principalAndInterest, 2_398.20); closeTo(result.monthly.value, 3_331.54);
});

test("fixer fixture keeps financed rehab explicit", () => {
  const result = computeFixer({ purchasePriceUsd: 400_000, downPaymentRate: 0.2, buyerClosingRate: 0.03, prepaidsUsd: 2_000, rehabBaseUsd: 100_000, rehabContingencyRate: 0.15, rehabFinancedUsd: 50_000, monthly: monthly(500_000) });
  closeTo(result.rehabAllIn, 115_000); closeTo(result.principal, 370_000); closeTo(result.entryCash, 159_000); closeTo(result.modeledPrice, 515_000);
});

test("land/build fixture uses contingency on build plus site and includes cash-only work in target basis", () => {
  const result = computeLandBuild({ landPriceUsd: 200_000, buildBaseUsd: 400_000, siteWorkUsd: 80_000, designPermitDueDiligenceCashOnlyUsd: 40_000, buildAndSiteContingencyRate: 0.15, downPaymentRate: 0.2, loanClosingRate: 0.02, prepaidsUsd: 3_000, monthly: monthly(752_000) });
  closeTo(result.financeableCost, 752_000); closeTo(result.principal, 601_600); closeTo(result.entryCash, 205_432); closeTo(result.modeledPrice, 792_000);
});

test("amortization guards zero rate and zero principal", () => {
  closeTo(amortizedPayment(120_000, 0, 10), 1_000); closeTo(amortizedPayment(0, 0.06, 30), 0);
  assert.throws(() => amortizedPayment(100_000, 0.06, 0), /term/i); assert.throws(() => amortizedPayment(100_000, 0.31, 30), /rate/i);
});

test("sale range pairs low with maximum prep and high with minimum prep", () => {
  const range = computeSaleRange(saleFixture());
  closeTo(range.conservative.netProceeds, 31_000); closeTo(range.working.netProceeds, 88_000); closeTo(range.stretch.netProceeds, 145_000);
  closeTo(computeHomeSale(saleFixture()).netProceeds, 88_000);
});

test("negative sale proceeds remain negative", () => {
  const sale = saleFixture(); Object.assign(sale, { salePriceWorkingUsd: 300_000, mortgagePayoffUsd: 320_000 });
  closeTo(computeHomeSale(sale).netProceeds, -73_000);
});

test("planned debt payoff reduces working move funds exactly once", () => {
  const plan = structuredClone(exampleEnvelope.plan); plan.currentHomeSale = saleFixture();
  const result = computePlan(plan);
  closeTo(result.available.value, 188_000);
  closeTo(result.scenarios.rentFirst.availableMoveFunds, 188_000);
});

test("eliminated debt payment improves cash flow once and reduces remaining DTI debt", () => {
  const plan = structuredClone(exampleEnvelope.plan); const withRelief = computePlan(plan).scenarios.rentFirst;
  plan.debtPlan.paymentsEliminatedMonthlyUsd = 0; const withoutRelief = computePlan(plan).scenarios.rentFirst;
  closeTo(withRelief.monthlyCashFlow - withoutRelief.monthlyCashFlow, 500);
  closeTo(withRelief.affordability.remainingDebtMonthly, 2_000);
});

test("DTI and comfort guide rails stay distinct", () => {
  const plan = structuredClone(exampleEnvelope.plan); const result = computeAffordability(plan, 4_500, 650_000);
  closeTo(result.grossMonthly, 20_000); closeTo(result.frontEndCeiling, 5_600); closeTo(result.backEndCeiling, 5_200); closeTo(result.dtiCeiling, 5_200); closeTo(result.planningCeiling, 4_800); closeTo(result.monthlyHeadroom, 300); closeTo(result.frontEndRatio, 0.225); closeTo(result.totalDtiRatio, 0.325); closeTo(result.priceHeadroom, 50_000);
});

test("blank required values report missing rather than zero", () => {
  const plan = structuredClone(blankPrivateEnvelope.plan); const result = computePlan(plan).scenarios.readyHome;
  assert.equal(result.entryCash, null); assert.equal(result.monthly.value, null); assert.ok(result.missing.includes("Purchase price")); assert.equal(String(result.entryCash), "null");
});

test("monthly deficit exposes reserve runway branches", () => {
  const plan = structuredClone(exampleEnvelope.plan); plan.career.householdNetIncomeMonthlyUsd = 1_000; plan.career.nonHousingSpendMonthlyUsd = 2_000;
  const result = computePlan(plan).scenarios.rentFirst; assert.ok(result.monthlyCashFlow < 0); assert.equal(typeof result.monthsUntilReserve, "number");
  plan.funds.reserveFloorUsd = 100_000_000; assert.equal(computePlan(plan).scenarios.rentFirst.monthsUntilReserve, 0);
});

test("date and Gantt math clamp month ends and ignore DST", () => {
  assert.equal(addMonthsClamped("2027-01-31", 1), "2027-02-28"); assert.equal(addMonthsClamped("2028-01-31", 1), "2028-02-29"); assert.equal(addMonthsClamped("2027-03-14", 1), "2027-04-14");
  assert.equal(localDateString(new Date(2026, 8, 2, 23, 59)), "2026-09-02"); assert.equal(daysRemaining("2027-09-01", "2026-09-02"), 364);
  assert.equal(deriveTaskStartDate({ dueDateOverride: "2027-03-14", offsetMonths: 0, durationWeeks: 2 }, "2027-09-01"), "2027-02-28");
  const position = ganttPosition({ dueDateOverride: "2027-03-14", offsetMonths: 0, durationWeeks: 2 }, "2027-09-01"); assert.ok(position.left >= 0 && position.left <= 100); assert.ok(position.width > 0);
  assert.throws(() => addMonthsClamped("2027-02-30", 1), /valid/i);
});

test("schema rejects invalid rates, ordered ranges, debt relief, dates, rehab, and task count", () => {
  const valid = structuredClone(exampleEnvelope); assert.equal(validateEnvelope(valid), true);
  const badRate = structuredClone(valid); badRate.plan.scenarios.readyHome.monthly.interestRateAnnual = 0.31; assert.throws(() => validateEnvelope(badRate), /range/i);
  const badRange = structuredClone(valid); badRange.plan.currentHomeSale.salePriceLowUsd = 700_000; assert.throws(() => validateEnvelope(badRange), /Sale prices/i);
  const badDebt = structuredClone(valid); badDebt.plan.debtPlan.paymentsEliminatedMonthlyUsd = 3_000; assert.throws(() => validateEnvelope(badDebt), /cannot exceed/i);
  const badDate = structuredClone(valid); badDate.plan.targetMoveDate = "2027-02-30"; assert.throws(() => validateEnvelope(badDate), /valid/i);
  const badRehab = structuredClone(valid); badRehab.plan.scenarios.fixer.rehabFinancedUsd = 999_999; assert.throws(() => validateEnvelope(badRehab), /rehab/i);
  const tooMany = structuredClone(valid); tooMany.plan.roadmap = Array.from({ length: 201 }, (_, index) => ({ ...valid.plan.roadmap[0], id: `task-${index}` })); assert.throws(() => validateEnvelope(tooMany), /200/);
});

test("candidate validation rejects unsafe URLs and duplicate ids", () => {
  const unsafe = structuredClone(exampleEnvelope); unsafe.plan.candidates[0].url = "javascript:alert(1)"; assert.throws(() => validateEnvelope(unsafe), /HTTP/i);
  const duplicate = structuredClone(exampleEnvelope); duplicate.plan.candidates.push(structuredClone(duplicate.plan.candidates[0])); assert.throws(() => validateEnvelope(duplicate), /duplicated/i);
});

test("v2 import strips unknown candidate and envelope fields", () => {
  const extra = structuredClone(exampleEnvelope); extra.secretContact = "not allowed"; extra.plan.unexpected = "drop me"; extra.plan.candidates[0].unexpected = "drop me";
  const clean = sanitizeImportedEnvelope(extra, blankPrivateEnvelope); assert.equal("secretContact" in clean, false); assert.equal("unexpected" in clean.plan, false); assert.equal("unexpected" in clean.plan.candidates[0], false);
});

test("v1 import migrates working sale and prep without inventing ranges or gross income", () => {
  const old = structuredClone(exampleEnvelope); old.schemaVersion = "1.0.0";
  old.plan.currentHomeSale = { estimatedSalePriceUsd: 444_000, mortgagePayoffUsd: 300_000, sellingCostRate: 0.06, prepAndRepairUsd: 22_000, sellerFixedClosingUsd: 5_000, expectedListDate: "2027-05-15", expectedCloseDate: "2027-07-30" };
  delete old.plan.debtPlan; delete old.plan.affordability; delete old.plan.candidates; delete old.plan.career.primaryGrossAnnualUsd; delete old.plan.career.partnerGrossAnnualUsd; old.plan.roadmap.forEach((task) => delete task.durationWeeks);
  const migrated = sanitizeImportedEnvelope(old, blankPrivateEnvelope); assert.equal(migrated.schemaVersion, "2.0.0"); assert.equal(migrated.plan.currentHomeSale.salePriceWorkingUsd, 444_000); assert.equal(migrated.plan.currentHomeSale.salePriceLowUsd, null); assert.equal(migrated.plan.currentHomeSale.prepWorkingUsd, 22_000); assert.equal(migrated.plan.career.primaryGrossAnnualUsd, null); assert.equal(migrated.plan.candidates.length, 0); assert.ok(migrated.plan.roadmap.every((task) => task.durationWeeks === 4));
});

test("import size and unsupported major are rejected", () => {
  assert.throws(() => sanitizeImportedEnvelope(exampleEnvelope, blankPrivateEnvelope, MAX_IMPORT_BYTES + 1), /1 MiB/);
  const unsupported = structuredClone(exampleEnvelope); unsupported.schemaVersion = "3.0.0"; assert.throws(() => sanitizeImportedEnvelope(unsupported, blankPrivateEnvelope), /unsupported/i);
});

test("blank private template cannot inherit illustrative money or candidates", () => {
  assert.equal(blankPrivateEnvelope.plan.career.primaryGrossAnnualUsd, null); assert.equal(blankPrivateEnvelope.plan.currentHomeSale.salePriceWorkingUsd, null); assert.equal(blankPrivateEnvelope.plan.scenarios.readyHome.purchasePriceUsd, null); assert.deepEqual(blankPrivateEnvelope.plan.candidates, []);
  assert.notEqual(exampleEnvelope.plan.scenarios.readyHome.purchasePriceUsd, null);
});

test("workspace storage keys are distinct and allowlisted", () => {
  assert.equal(workspaceStorageKey("mine"), "oregonMove.workspace.v2.mine"); assert.equal(workspaceStorageKey("partner"), "oregonMove.workspace.v2.partner"); assert.notEqual(workspaceStorageKey("mine"), workspaceStorageKey("partner")); assert.throws(() => workspaceStorageKey("other"), /invalid/i);
});

test("non-finite and non-integer values are rejected", () => {
  const infinite = structuredClone(exampleEnvelope); infinite.plan.funds.liquidUsd = Infinity; assert.throws(() => validateEnvelope(infinite), /range/i);
  const fraction = structuredClone(exampleEnvelope); fraction.plan.scenarios.rentFirst.transition.transitionMonths = 1.5; assert.throws(() => validateEnvelope(fraction), /range/i);
});
