import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMPORT_BYTES,
  addMonthsClamped,
  amortizedPayment,
  computeFixer,
  computeHomeSale,
  computeLandBuild,
  computePlan,
  computeReadyHome,
  sanitizeImportedEnvelope,
  validateEnvelope,
} from "../landing-page/model.mjs";
import { exampleEnvelope } from "../landing-page/public-data.mjs";

const closeTo = (actual, expected, epsilon = 0.01) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≠ ${expected}`);
const monthly = (basis = 500_000) => ({ interestRateAnnual: 0.06, termYears: 30, propertyTaxBasisUsd: basis, propertyTaxRateAnnual: 0.01, insuranceAnnualUsd: 1_200, hoaMonthlyUsd: 0, pmiMonthlyUsd: 0, maintenanceRateAnnual: 0.01, otherMonthlyUsd: 0 });

test("ready-home fixture computes principal, close cash, P&I, and housing", () => {
  const result = computeReadyHome({ purchasePriceUsd: 500_000, downPaymentRate: 0.2, buyerClosingRate: 0.03, prepaidsUsd: 2_000, monthly: monthly() });
  closeTo(result.principal, 400_000);
  closeTo(result.entryCash, 117_000);
  closeTo(result.monthly.principalAndInterest, 2_398.20);
  closeTo(result.monthly.value, 3_331.54);
});

test("fixer fixture keeps financed rehab explicit", () => {
  const result = computeFixer({ purchasePriceUsd: 400_000, downPaymentRate: 0.2, buyerClosingRate: 0.03, prepaidsUsd: 2_000, rehabBaseUsd: 100_000, rehabContingencyRate: 0.15, rehabFinancedUsd: 50_000, monthly: monthly(500_000) });
  closeTo(result.rehabAllIn, 115_000);
  closeTo(result.principal, 370_000);
  closeTo(result.entryCash, 159_000);
});

test("land/build fixture uses contingency only on build plus site", () => {
  const result = computeLandBuild({ landPriceUsd: 200_000, buildBaseUsd: 400_000, siteWorkUsd: 80_000, designPermitDueDiligenceCashOnlyUsd: 40_000, buildAndSiteContingencyRate: 0.15, downPaymentRate: 0.2, loanClosingRate: 0.02, prepaidsUsd: 3_000, monthly: monthly(752_000) });
  closeTo(result.financeableCost, 752_000);
  closeTo(result.principal, 601_600);
  closeTo(result.entryCash, 205_432);
});

test("amortization guards zero rate and zero principal", () => {
  closeTo(amortizedPayment(120_000, 0, 10), 1_000);
  closeTo(amortizedPayment(0, 0.06, 30), 0);
  assert.throws(() => amortizedPayment(100_000, 0.06, 0), /term/i);
  assert.throws(() => amortizedPayment(100_000, 0.31, 30), /rate/i);
});

test("negative sale proceeds remain negative", () => {
  const result = computeHomeSale({ estimatedSalePriceUsd: 300_000, mortgagePayoffUsd: 320_000, sellingCostRate: 0.06, prepAndRepairUsd: 10_000, sellerFixedClosingUsd: 2_000 });
  closeTo(result.netProceeds, -50_000);
});

test("blank required values report missing rather than zero", () => {
  const plan = structuredClone(exampleEnvelope.plan);
  plan.scenarios.readyHome.purchasePriceUsd = null;
  const result = computePlan(plan).scenarios.readyHome;
  assert.equal(result.entryCash, null);
  assert.equal(result.monthly.value, null);
  assert.ok(result.missing.includes("Purchase price"));
  assert.equal(String(result.entryCash), "null");
});

test("monthly deficit exposes reserve runway branches", () => {
  const plan = structuredClone(exampleEnvelope.plan);
  plan.career.householdNetIncomeMonthlyUsd = 1_000;
  plan.career.nonHousingSpendMonthlyUsd = 2_000;
  const result = computePlan(plan).scenarios.rentFirst;
  assert.ok(result.monthlyCashFlow < 0);
  assert.equal(typeof result.monthsUntilReserve, "number");
  plan.funds.reserveFloorUsd = 100_000_000;
  assert.equal(computePlan(plan).scenarios.rentFirst.monthsUntilReserve, 0);
});

test("date math clamps month ends and ignores DST", () => {
  assert.equal(addMonthsClamped("2027-01-31", 1), "2027-02-28");
  assert.equal(addMonthsClamped("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsClamped("2027-03-14", 1), "2027-04-14");
  assert.throws(() => addMonthsClamped("2027-02-30", 1), /valid/i);
});

test("schema rejects invalid rates, dates, financed rehab, and task count", () => {
  const valid = structuredClone(exampleEnvelope);
  assert.equal(validateEnvelope(valid), true);
  const badRate = structuredClone(valid); badRate.plan.scenarios.readyHome.monthly.interestRateAnnual = 0.31;
  assert.throws(() => validateEnvelope(badRate), /range/i);
  const badDate = structuredClone(valid); badDate.plan.targetMoveDate = "2027-02-30";
  assert.throws(() => validateEnvelope(badDate), /valid/i);
  const badRehab = structuredClone(valid); badRehab.plan.scenarios.fixer.rehabFinancedUsd = 999_999;
  assert.throws(() => validateEnvelope(badRehab), /rehab/i);
  const tooMany = structuredClone(valid); tooMany.plan.roadmap = Array.from({ length: 201 }, (_, index) => ({ ...valid.plan.roadmap[0], id: `task-${index}` }));
  assert.throws(() => validateEnvelope(tooMany), /200/);
});

test("import size and unsupported major are rejected; unknown fields are removed", () => {
  assert.throws(() => sanitizeImportedEnvelope(exampleEnvelope, exampleEnvelope, MAX_IMPORT_BYTES + 1), /1 MiB/);
  const unsupported = structuredClone(exampleEnvelope); unsupported.schemaVersion = "2.0.0";
  assert.throws(() => sanitizeImportedEnvelope(unsupported, exampleEnvelope), /unsupported/i);
  const extra = structuredClone(exampleEnvelope); extra.secretContact = "not allowed"; extra.plan.unexpected = "drop me"; extra.plan.roadmap[0].unexpected = "drop me";
  const clean = sanitizeImportedEnvelope(extra, exampleEnvelope);
  assert.equal("secretContact" in clean, false);
  assert.equal("unexpected" in clean.plan, false);
  assert.equal("unexpected" in clean.plan.roadmap[0], false);
});

test("non-finite and non-integer values are rejected", () => {
  const infinite = structuredClone(exampleEnvelope); infinite.plan.funds.liquidUsd = Infinity;
  assert.throws(() => validateEnvelope(infinite), /range/i);
  const fraction = structuredClone(exampleEnvelope); fraction.plan.scenarios.rentFirst.transition.transitionMonths = 1.5;
  assert.throws(() => validateEnvelope(fraction), /range/i);
});
