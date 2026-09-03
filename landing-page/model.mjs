export const SCHEMA_VERSION = "1.0.0";
export const MAX_IMPORT_BYTES = 1_048_576;
const USD_MAX = 100_000_000;
const DAY_MS = 86_400_000;
const nil = (value) => value === null || value === undefined || value === "";
const finite = (value) => typeof value === "number" && Number.isFinite(value);

function dateOnly(value, label = "Date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${label} must use YYYY-MM-DD.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RangeError(`${label} is not a valid date.`);
  return date;
}

const dateString = (date) => date.toISOString().slice(0, 10);
const required = (value, label, missing) => {
  if (nil(value)) {
    missing.push(label);
    return null;
  }
  return value;
};
const unique = (values) => [...new Set(values)];

export function amortizedPayment(principal, annualRate, termYears) {
  if (!finite(principal) || principal < 0 || principal > USD_MAX) throw new RangeError("Loan principal is invalid.");
  if (!finite(annualRate) || annualRate < 0 || annualRate > 0.3) throw new RangeError("Mortgage rate is invalid.");
  if (!Number.isInteger(termYears) || termYears < 1 || termYears > 50) throw new RangeError("Loan term is invalid.");
  if (principal === 0) return 0;
  const count = termYears * 12;
  const rate = annualRate / 12;
  if (rate === 0) return principal / count;
  const growth = (1 + rate) ** count;
  return principal * rate * growth / (growth - 1);
}

export function computeHomeSale(sale) {
  const missing = [];
  const price = required(sale.estimatedSalePriceUsd, "Sale price", missing);
  const payoff = required(sale.mortgagePayoffUsd, "Mortgage payoff", missing);
  const rate = required(sale.sellingCostRate, "Selling-cost rate", missing);
  const prep = required(sale.prepAndRepairUsd, "Sale preparation", missing);
  const fixed = required(sale.sellerFixedClosingUsd, "Seller closing costs", missing);
  if (missing.length) return { saleCosts: null, netProceeds: null, missing };
  const saleCosts = price * rate + prep + fixed;
  return { saleCosts, netProceeds: price - payoff - saleCosts, missing };
}

export function computeOwnershipMonthly(principal, monthly) {
  const missing = [];
  const rate = required(monthly.interestRateAnnual, "Interest rate", missing);
  const term = required(monthly.termYears, "Loan term", missing);
  const taxBasis = required(monthly.propertyTaxBasisUsd, "Property-tax basis", missing);
  const taxRate = required(monthly.propertyTaxRateAnnual, "Property-tax rate", missing);
  const insurance = required(monthly.insuranceAnnualUsd, "Annual insurance", missing);
  const hoa = required(monthly.hoaMonthlyUsd, "Monthly HOA", missing);
  const pmi = required(monthly.pmiMonthlyUsd, "Monthly PMI", missing);
  const maintenanceRate = required(monthly.maintenanceRateAnnual, "Maintenance reserve rate", missing);
  const other = required(monthly.otherMonthlyUsd, "Other monthly housing", missing);
  if (nil(principal)) missing.unshift("Loan principal");
  if (missing.length) return { value: null, principalAndInterest: null, missing };
  const principalAndInterest = amortizedPayment(principal, rate, term);
  const propertyTax = taxBasis * taxRate / 12;
  const insuranceMonthly = insurance / 12;
  const maintenance = taxBasis * maintenanceRate / 12;
  return {
    value: principalAndInterest + propertyTax + insuranceMonthly + hoa + pmi + maintenance + other,
    principalAndInterest,
    propertyTax,
    insuranceMonthly,
    maintenance,
    missing,
  };
}

function ownershipResult(scenario, type) {
  const missing = [];
  let entryCash = null;
  let principal = null;
  const extra = {};
  if (type === "land") {
    const land = required(scenario.landPriceUsd, "Land price", missing);
    const build = required(scenario.buildBaseUsd, "Base build cost", missing);
    const site = required(scenario.siteWorkUsd, "Site work", missing);
    const cashOnly = required(scenario.designPermitDueDiligenceCashOnlyUsd, "Cash-only design, permits, and due diligence", missing);
    const contingencyRate = required(scenario.buildAndSiteContingencyRate, "Build contingency rate", missing);
    const down = required(scenario.downPaymentRate, "Down-payment rate", missing);
    const closing = required(scenario.loanClosingRate, "Loan-closing rate", missing);
    const prepaids = required(scenario.prepaidsUsd, "Prepaids", missing);
    if (!missing.length) {
      extra.contingency = (build + site) * contingencyRate;
      extra.financeableCost = land + build + site + extra.contingency;
      principal = extra.financeableCost * (1 - down);
      entryCash = extra.financeableCost * down + cashOnly + principal * closing + prepaids;
    }
  } else {
    const price = required(scenario.purchasePriceUsd, "Purchase price", missing);
    const down = required(scenario.downPaymentRate, "Down-payment rate", missing);
    const closing = required(scenario.buyerClosingRate, "Buyer-closing rate", missing);
    const prepaids = required(scenario.prepaidsUsd, "Prepaids", missing);
    if (type === "fixer") {
      const rehab = required(scenario.rehabBaseUsd, "Base rehab cost", missing);
      const contingencyRate = required(scenario.rehabContingencyRate, "Rehab contingency rate", missing);
      const financed = required(scenario.rehabFinancedUsd, "Financed rehab", missing);
      if (!missing.length) {
        extra.rehabAllIn = rehab * (1 + contingencyRate);
        if (financed > extra.rehabAllIn) throw new RangeError("Financed rehab cannot exceed rehab all-in cost.");
        principal = price * (1 - down) + financed;
        entryCash = price * down + price * closing + prepaids + extra.rehabAllIn - financed;
      }
    } else if (!missing.length) {
      principal = price * (1 - down);
      entryCash = price * down + price * closing + prepaids;
    }
  }
  const monthly = computeOwnershipMonthly(principal, scenario.monthly);
  return { ...extra, principal, entryCash, monthly, missing: unique([...missing, ...monthly.missing]) };
}

export const computeLandBuild = (scenario) => ownershipResult(scenario, "land");
export const computeReadyHome = (scenario) => ownershipResult(scenario, "ready");
export const computeFixer = (scenario) => ownershipResult(scenario, "fixer");

export function computeRentFirst(scenario) {
  const entryMissing = [];
  const monthlyMissing = [];
  const entryValues = [
    [scenario.securityDepositUsd, "Security deposit"], [scenario.firstMonthUsd, "First month"],
    [scenario.lastMonthUsd, "Last month"], [scenario.petDepositUsd, "Pet deposit"],
    [scenario.applicationAndMoveInFeesUsd, "Application and move-in fees"],
  ].map(([value, label]) => required(value, label, entryMissing));
  const monthlyValues = [
    [scenario.rentMonthlyUsd, "Monthly rent"], [scenario.rentersInsuranceMonthlyUsd, "Renters insurance"],
    [scenario.petRentMonthlyUsd, "Pet rent"], [scenario.parkingAndOtherMonthlyUsd, "Parking and other monthly"],
  ].map(([value, label]) => required(value, label, monthlyMissing));
  return {
    entryCash: entryMissing.length ? null : entryValues.reduce((sum, value) => sum + value, 0),
    monthly: { value: monthlyMissing.length ? null : monthlyValues.reduce((sum, value) => sum + value, 0), missing: monthlyMissing },
    missing: [...entryMissing, ...monthlyMissing],
  };
}

function availableMoveFunds(plan) {
  const sale = computeHomeSale(plan.currentHomeSale);
  const missing = [...sale.missing];
  const liquid = required(plan.funds.liquidUsd, "Liquid funds", missing);
  const other = required(plan.funds.otherMoveFundsUsd, "Other move funds", missing);
  return { value: missing.length ? null : liquid + other + sale.netProceeds, sale, missing };
}

function comparable(plan, result, transition) {
  const available = availableMoveFunds(plan);
  const missing = [...result.missing, ...available.missing];
  const moving = required(plan.commonMove.movingAndTravelUsd, "Moving and travel", missing);
  const reserve = required(plan.funds.reserveFloorUsd, "Reserve floor", missing);
  const setup = required(transition.oneTimeSetupUsd, "One-time setup", missing);
  const transitionMonthly = required(transition.transitionMonthlyUsd, "Transition monthly cost", missing);
  const transitionMonths = required(transition.transitionMonths, "Transition months", missing);
  const income = required(plan.career.householdNetIncomeMonthlyUsd, "Household monthly net income", missing);
  const nonHousing = required(plan.career.nonHousingSpendMonthlyUsd, "Non-housing monthly spend", missing);
  const transitionCash = nil(transitionMonthly) || nil(transitionMonths) ? null : transitionMonthly * transitionMonths;
  const committedCash = [result.entryCash, setup, transitionCash, moving].some(nil) ? null : result.entryCash + setup + transitionCash + moving;
  const postMoveCash = available.value === null || committedCash === null ? null : available.value - committedCash;
  const cushion = postMoveCash === null || nil(reserve) ? null : postMoveCash - reserve;
  const shortfall = cushion === null ? null : Math.max(0, -cushion);
  const monthlyCashFlow = result.monthly.value === null || nil(income) || nil(nonHousing) ? null : income - nonHousing - result.monthly.value;
  let monthsUntilReserve = null;
  if (monthlyCashFlow !== null && cushion !== null) {
    if (monthlyCashFlow >= 0) monthsUntilReserve = "not-depleting";
    else if (cushion <= 0) monthsUntilReserve = 0;
    else monthsUntilReserve = cushion / Math.abs(monthlyCashFlow);
  }
  return { ...result, availableMoveFunds: available.value, netSaleProceeds: available.sale.netProceeds, transitionCash, committedCash, postMoveCash, cushion, shortfall, monthlyCashFlow, monthsUntilReserve, missing: unique(missing) };
}

export function computePlan(plan) {
  return {
    sale: computeHomeSale(plan.currentHomeSale),
    available: availableMoveFunds(plan),
    scenarios: {
      landBuild: comparable(plan, computeLandBuild(plan.scenarios.landBuild), plan.scenarios.landBuild.transition),
      readyHome: comparable(plan, computeReadyHome(plan.scenarios.readyHome), plan.scenarios.readyHome.transition),
      fixer: comparable(plan, computeFixer(plan.scenarios.fixer), plan.scenarios.fixer.transition),
      rentFirst: comparable(plan, computeRentFirst(plan.scenarios.rentFirst), plan.scenarios.rentFirst.transition),
    },
  };
}

export function addMonthsClamped(value, offset) {
  const date = dateOnly(value);
  if (!Number.isInteger(offset)) throw new TypeError("Month offset must be a whole number.");
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return dateString(result);
}

export function addDays(value, offset) {
  const result = dateOnly(value);
  result.setUTCDate(result.getUTCDate() + offset);
  return dateString(result);
}

export function daysRemaining(target, from = dateString(new Date())) {
  return Math.ceil((dateOnly(target).getTime() - dateOnly(from).getTime()) / DAY_MS);
}

export const deriveTaskDueDate = (task, target) => task.dueDateOverride || addMonthsClamped(target, task.offsetMonths);

export function earliestIncompleteTask(tasks, target) {
  return tasks.filter((task) => task.status !== "done")
    .map((task) => ({ ...task, dueDate: deriveTaskDueDate(task, target) }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))[0] || null;
}

function assertNumber(value, label, { min = 0, max = USD_MAX, integer = false } = {}) {
  if (value === null) return;
  if (!finite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RangeError(`${label} is outside its allowed range.`);
}

function validateMonthly(monthly, label) {
  assertNumber(monthly.interestRateAnnual, `${label} interest rate`, { max: 0.3 });
  assertNumber(monthly.termYears, `${label} term`, { min: 1, max: 50, integer: true });
  assertNumber(monthly.propertyTaxBasisUsd, `${label} tax basis`);
  assertNumber(monthly.propertyTaxRateAnnual, `${label} tax rate`, { max: 1 });
  assertNumber(monthly.insuranceAnnualUsd, `${label} insurance`);
  assertNumber(monthly.hoaMonthlyUsd, `${label} HOA`);
  assertNumber(monthly.pmiMonthlyUsd, `${label} PMI`);
  assertNumber(monthly.maintenanceRateAnnual, `${label} maintenance`, { max: 1 });
  assertNumber(monthly.otherMonthlyUsd, `${label} other monthly`);
}

function validateTransition(value, label) {
  assertNumber(value.oneTimeSetupUsd, `${label} setup`);
  assertNumber(value.transitionMonthlyUsd, `${label} transition monthly`);
  assertNumber(value.transitionMonths, `${label} transition months`, { max: 60, integer: true });
}

export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object") throw new TypeError("Plan must be a JSON object.");
  if (typeof envelope.schemaVersion !== "string" || envelope.schemaVersion.split(".")[0] !== "1") throw new RangeError("This file uses an unsupported plan version.");
  if (!Number.isInteger(envelope.revision) || envelope.revision < 0 || envelope.mode !== "private") throw new TypeError("Plan envelope is invalid.");
  const plan = envelope.plan;
  if (!plan || typeof plan !== "object") throw new TypeError("Plan data is missing.");
  dateOnly(plan.targetMoveDate, "Target move date");
  if (!["hillsboro", "tigard", "both"].includes(plan.destinationFocus)) throw new RangeError("Destination focus is invalid.");
  Object.entries(plan.household).forEach(([key, value]) => assertNumber(value, key, { max: 20, integer: true }));
  if (!["researching", "applying", "interviewing", "offer-accepted", "employed"].includes(plan.career.status)) throw new RangeError("Career status is invalid.");
  if (!Array.isArray(plan.career.targetRoles) || plan.career.targetRoles.some((item) => typeof item !== "string" || item.length > 120)) throw new TypeError("Target roles are invalid.");
  const money = [plan.career.householdNetIncomeMonthlyUsd, plan.career.nonHousingSpendMonthlyUsd, plan.funds.liquidUsd, plan.funds.otherMoveFundsUsd, plan.funds.reserveFloorUsd, plan.currentHomeSale.estimatedSalePriceUsd, plan.currentHomeSale.mortgagePayoffUsd, plan.currentHomeSale.prepAndRepairUsd, plan.currentHomeSale.sellerFixedClosingUsd, plan.commonMove.movingAndTravelUsd];
  money.forEach((value, index) => assertNumber(value, `Money field ${index + 1}`));
  assertNumber(plan.currentHomeSale.sellingCostRate, "Selling cost rate", { max: 1 });
  [plan.currentHomeSale.expectedListDate, plan.currentHomeSale.expectedCloseDate].filter(Boolean).forEach((value) => dateOnly(value));
  const { landBuild, readyHome, fixer, rentFirst } = plan.scenarios;
  [landBuild, readyHome, fixer, rentFirst].forEach((scenario) => { if (typeof scenario.enabled !== "boolean") throw new TypeError("Scenario enabled flag is invalid."); });
  [landBuild.landPriceUsd, landBuild.buildBaseUsd, landBuild.siteWorkUsd, landBuild.designPermitDueDiligenceCashOnlyUsd, landBuild.prepaidsUsd, landBuild.estimatedFinishedValueUsd].forEach((value, index) => assertNumber(value, `Land money ${index + 1}`));
  [landBuild.buildAndSiteContingencyRate, landBuild.downPaymentRate, landBuild.loanClosingRate].forEach((value, index) => assertNumber(value, `Land rate ${index + 1}`, { max: 1 }));
  validateMonthly(landBuild.monthly, "Land"); validateTransition(landBuild.transition, "Land");
  [readyHome.purchasePriceUsd, readyHome.prepaidsUsd].forEach((value, index) => assertNumber(value, `Ready money ${index + 1}`));
  [readyHome.downPaymentRate, readyHome.buyerClosingRate].forEach((value, index) => assertNumber(value, `Ready rate ${index + 1}`, { max: 1 }));
  validateMonthly(readyHome.monthly, "Ready"); validateTransition(readyHome.transition, "Ready");
  [fixer.purchasePriceUsd, fixer.prepaidsUsd, fixer.rehabBaseUsd, fixer.rehabFinancedUsd, fixer.estimatedPostRehabValueUsd].forEach((value, index) => assertNumber(value, `Fixer money ${index + 1}`));
  [fixer.downPaymentRate, fixer.buyerClosingRate, fixer.rehabContingencyRate].forEach((value, index) => assertNumber(value, `Fixer rate ${index + 1}`, { max: 1 }));
  if (fixer.rehabFinancedUsd !== null && fixer.rehabBaseUsd !== null && fixer.rehabContingencyRate !== null && fixer.rehabFinancedUsd > fixer.rehabBaseUsd * (1 + fixer.rehabContingencyRate)) throw new RangeError("Financed rehab cannot exceed rehab all-in cost.");
  validateMonthly(fixer.monthly, "Fixer"); validateTransition(fixer.transition, "Fixer");
  [rentFirst.rentMonthlyUsd, rentFirst.securityDepositUsd, rentFirst.firstMonthUsd, rentFirst.lastMonthUsd, rentFirst.petDepositUsd, rentFirst.applicationAndMoveInFeesUsd, rentFirst.rentersInsuranceMonthlyUsd, rentFirst.petRentMonthlyUsd, rentFirst.parkingAndOtherMonthlyUsd].forEach((value, index) => assertNumber(value, `Rent money ${index + 1}`));
  validateTransition(rentFirst.transition, "Rent");
  if (![null, "land-build", "ready-home", "fixer", "rent-first"].includes(plan.selectedFocus)) throw new RangeError("Focus path is invalid.");
  if (!Array.isArray(plan.roadmap) || plan.roadmap.length > 200) throw new RangeError("Roadmap may contain at most 200 tasks.");
  plan.roadmap.forEach((task, index) => {
    if (typeof task.id !== "string" || typeof task.phaseId !== "string" || typeof task.title !== "string" || !task.title || task.title.length > 120 || typeof task.notes !== "string" || task.notes.length > 2000) throw new TypeError(`Roadmap task ${index + 1} is invalid.`);
    if (!["me", "partner", "both", "unassigned"].includes(task.owner) || !["not-started", "in-progress", "blocked", "done"].includes(task.status) || !["all", "land-build", "ready-home", "fixer", "rent-first"].includes(task.scenario)) throw new RangeError(`Roadmap task ${index + 1} option is invalid.`);
    if (!Number.isInteger(task.offsetMonths) || task.offsetMonths < -60 || task.offsetMonths > 60) throw new RangeError(`Roadmap task ${index + 1} offset is invalid.`);
    if (task.dueDateOverride) dateOnly(task.dueDateOverride);
  });
  if (typeof plan.preferences.saveOnDevice !== "boolean" || typeof plan.preferences.hideValues !== "boolean") throw new TypeError("Preferences are invalid.");
  return true;
}

function allowlist(raw, template) {
  if (Array.isArray(template)) return structuredClone(template);
  if (template && typeof template === "object") return Object.fromEntries(Object.keys(template).map((key) => [key, allowlist(raw?.[key], template[key])]));
  return raw === undefined ? template : raw;
}

export function sanitizeImportedEnvelope(raw, template, byteLength = null) {
  if (byteLength !== null && byteLength > MAX_IMPORT_BYTES) throw new RangeError("Import is larger than 1 MiB.");
  if (!raw || typeof raw !== "object" || typeof raw.schemaVersion !== "string" || raw.schemaVersion.split(".")[0] !== "1") throw new RangeError("This file uses an unsupported plan version.");
  const safe = allowlist(raw, template);
  safe.schemaVersion = SCHEMA_VERSION; safe.mode = "private";
  safe.plan.career.targetRoles = Array.isArray(raw.plan?.career?.targetRoles) ? raw.plan.career.targetRoles.map((item) => item) : [];
  safe.plan.roadmap = Array.isArray(raw.plan?.roadmap) ? raw.plan.roadmap.map((task) => allowlist(task, template.plan.roadmap[0])) : [];
  validateEnvelope(safe);
  return safe;
}
