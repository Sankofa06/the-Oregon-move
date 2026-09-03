export const SCHEMA_VERSION = "2.0.0";
export const MAX_IMPORT_BYTES = 1_048_576;

const USD_MAX = 100_000_000;
const DAY_MS = 86_400_000;
const AREA_KEYS = ["hillsboro", "north-plains", "forest-grove", "beaverton", "cedar-mill", "nob-hill", "tigard", "tualatin", "sherwood", "newberg", "wilsonville", "west-linn"];
const nil = (value) => value === null || value === undefined || value === "";
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const unique = (values) => [...new Set(values)];

export function workspaceStorageKey(slot) {
  if (!["mine", "partner"].includes(slot)) throw new RangeError("Workspace slot is invalid.");
  return `oregonMove.workspace.v2.${slot}`;
}

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

function computeSaleAt(sale, price, prep, priceLabel, prepLabel) {
  const missing = [];
  const checkedPrice = required(price, priceLabel, missing);
  const checkedPrep = required(prep, prepLabel, missing);
  const payoff = required(sale.mortgagePayoffUsd, "Mortgage payoff", missing);
  const otherLien = required(sale.otherLienPayoffUsd, "Other lien payoff", missing);
  const rate = required(sale.sellingCostRate, "Selling-cost rate", missing);
  const fixed = required(sale.sellerFixedClosingUsd, "Seller closing costs", missing);
  const concessions = required(sale.sellerConcessionsUsd, "Seller concessions", missing);
  if (missing.length) return { salePrice: checkedPrice, prep: checkedPrep, saleCosts: null, netProceeds: null, missing };
  const saleCosts = checkedPrice * rate + checkedPrep + fixed + concessions;
  return { salePrice: checkedPrice, prep: checkedPrep, saleCosts, netProceeds: checkedPrice - payoff - otherLien - saleCosts, missing };
}

export function computeHomeSale(sale) {
  return computeSaleAt(sale, sale.salePriceWorkingUsd, sale.prepWorkingUsd, "Working sale price", "Working sale preparation");
}

export function computeSaleRange(sale) {
  return {
    conservative: computeSaleAt(sale, sale.salePriceLowUsd, sale.prepMaxUsd, "Low sale price", "Maximum sale preparation"),
    working: computeHomeSale(sale),
    stretch: computeSaleAt(sale, sale.salePriceHighUsd, sale.prepMinUsd, "High sale price", "Minimum sale preparation"),
  };
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
  return { value: principalAndInterest + propertyTax + insuranceMonthly + hoa + pmi + maintenance + other, principalAndInterest, propertyTax, insuranceMonthly, maintenance, missing };
}

function ownershipResult(scenario, type) {
  const missing = [];
  let entryCash = null;
  let principal = null;
  let modeledPrice = null;
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
      modeledPrice = extra.financeableCost + cashOnly;
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
        modeledPrice = price + extra.rehabAllIn;
        principal = price * (1 - down) + financed;
        entryCash = price * down + price * closing + prepaids + extra.rehabAllIn - financed;
      }
    } else if (!missing.length) {
      modeledPrice = price;
      principal = price * (1 - down);
      entryCash = price * down + price * closing + prepaids;
    }
  }
  const monthly = computeOwnershipMonthly(principal, scenario.monthly);
  return { ...extra, modeledPrice, principal, entryCash, monthly, missing: unique([...missing, ...monthly.missing]) };
}

export const computeLandBuild = (scenario) => ownershipResult(scenario, "land");
export const computeReadyHome = (scenario) => ownershipResult(scenario, "ready");
export const computeFixer = (scenario) => ownershipResult(scenario, "fixer");

export function computeRentFirst(scenario) {
  const entryMissing = [];
  const monthlyMissing = [];
  const entryValues = [[scenario.securityDepositUsd, "Security deposit"], [scenario.firstMonthUsd, "First month"], [scenario.lastMonthUsd, "Last month"], [scenario.petDepositUsd, "Pet deposit"], [scenario.applicationAndMoveInFeesUsd, "Application and move-in fees"]].map(([value, label]) => required(value, label, entryMissing));
  const monthlyValues = [[scenario.rentMonthlyUsd, "Monthly rent"], [scenario.rentersInsuranceMonthlyUsd, "Renters insurance"], [scenario.petRentMonthlyUsd, "Pet rent"], [scenario.parkingAndOtherMonthlyUsd, "Parking and other monthly"]].map(([value, label]) => required(value, label, monthlyMissing));
  return { modeledPrice: null, entryCash: entryMissing.length ? null : entryValues.reduce((sum, value) => sum + value, 0), monthly: { value: monthlyMissing.length ? null : monthlyValues.reduce((sum, value) => sum + value, 0), missing: monthlyMissing }, missing: [...entryMissing, ...monthlyMissing] };
}

function debtAfterPaydown(plan, missing) {
  const current = required(plan.debtPlan.currentRequiredPaymentsMonthlyUsd, "Current monthly debt payments", missing);
  const eliminated = required(plan.debtPlan.paymentsEliminatedMonthlyUsd, "Monthly payments eliminated", missing);
  return nil(current) || nil(eliminated) ? null : Math.max(0, current - eliminated);
}

export function computeAffordability(plan, monthlyHousing = null, modeledPrice = null) {
  const missing = [];
  const primary = required(plan.career.primaryGrossAnnualUsd, "Primary gross annual income", missing);
  const partner = required(plan.career.partnerGrossAnnualUsd, "Partner gross annual income", missing);
  const remainingDebt = debtAfterPaydown(plan, missing);
  const frontRate = required(plan.affordability.frontEndRate, "Front-end DTI guide", missing);
  const backRate = required(plan.affordability.backEndRate, "Back-end DTI guide", missing);
  const comfort = required(plan.affordability.comfortHousingMonthlyUsd, "Comfort housing ceiling", missing);
  const maxPurchase = required(plan.affordability.maxPurchaseTargetUsd, "Maximum purchase target", missing);
  let grossMonthly = nil(primary) || nil(partner) ? null : (primary + partner) / 12;
  if (grossMonthly !== null && grossMonthly <= 0) { grossMonthly = 0; missing.push("Positive household gross income"); }
  const frontEndCeiling = grossMonthly === null || nil(frontRate) ? null : grossMonthly * frontRate;
  const backEndCeiling = grossMonthly === null || nil(backRate) || remainingDebt === null ? null : Math.max(0, grossMonthly * backRate - remainingDebt);
  const dtiCeiling = frontEndCeiling === null || backEndCeiling === null ? null : Math.min(frontEndCeiling, backEndCeiling);
  const planningCeiling = dtiCeiling === null ? comfort : nil(comfort) ? dtiCeiling : Math.min(dtiCeiling, comfort);
  const frontEndRatio = monthlyHousing === null || !grossMonthly ? null : monthlyHousing / grossMonthly;
  const totalDtiRatio = monthlyHousing === null || !grossMonthly || remainingDebt === null ? null : (monthlyHousing + remainingDebt) / grossMonthly;
  const monthlyHeadroom = monthlyHousing === null || planningCeiling === null ? null : planningCeiling - monthlyHousing;
  const priceHeadroom = modeledPrice === null || maxPurchase === null ? null : maxPurchase - modeledPrice;
  return { grossMonthly, remainingDebtMonthly: remainingDebt, frontEndCeiling, backEndCeiling, dtiCeiling, planningCeiling, frontEndRatio, totalDtiRatio, monthlyHeadroom, priceHeadroom, missing: unique(missing) };
}

function availableMoveFunds(plan) {
  const sale = computeHomeSale(plan.currentHomeSale);
  const missing = [...sale.missing];
  const liquid = required(plan.funds.liquidUsd, "Liquid funds", missing);
  const other = required(plan.funds.otherMoveFundsUsd, "Other move funds", missing);
  const debtPaydown = required(plan.debtPlan.plannedPaydownFromMoveFundsUsd, "Planned debt payoff", missing);
  return { value: missing.length ? null : liquid + other + sale.netProceeds - debtPaydown, sale, debtPaydown, missing: unique(missing) };
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
  const eliminated = required(plan.debtPlan.paymentsEliminatedMonthlyUsd, "Monthly payments eliminated", missing);
  const transitionCash = nil(transitionMonthly) || nil(transitionMonths) ? null : transitionMonthly * transitionMonths;
  const committedCash = [result.entryCash, setup, transitionCash, moving].some(nil) ? null : result.entryCash + setup + transitionCash + moving;
  const postMoveCash = available.value === null || committedCash === null ? null : available.value - committedCash;
  const cushion = postMoveCash === null || nil(reserve) ? null : postMoveCash - reserve;
  const shortfall = cushion === null ? null : Math.max(0, -cushion);
  const adjustedNonHousing = nil(nonHousing) || nil(eliminated) ? null : Math.max(0, nonHousing - eliminated);
  const monthlyCashFlow = result.monthly.value === null || nil(income) || adjustedNonHousing === null ? null : income - adjustedNonHousing - result.monthly.value;
  let monthsUntilReserve = null;
  if (monthlyCashFlow !== null && cushion !== null) {
    if (monthlyCashFlow >= 0) monthsUntilReserve = "not-depleting";
    else if (cushion <= 0) monthsUntilReserve = 0;
    else monthsUntilReserve = cushion / Math.abs(monthlyCashFlow);
  }
  const affordability = computeAffordability(plan, result.monthly.value, result.modeledPrice);
  return { ...result, affordability, availableMoveFunds: available.value, netSaleProceeds: available.sale.netProceeds, plannedDebtPayoff: available.debtPaydown, transitionCash, committedCash, postMoveCash, cushion, shortfall, adjustedNonHousing, monthlyCashFlow, monthsUntilReserve, missing: unique(missing) };
}

export function computePlan(plan) {
  return { sale: computeHomeSale(plan.currentHomeSale), saleRange: computeSaleRange(plan.currentHomeSale), available: availableMoveFunds(plan), affordability: computeAffordability(plan), scenarios: { landBuild: comparable(plan, computeLandBuild(plan.scenarios.landBuild), plan.scenarios.landBuild.transition), readyHome: comparable(plan, computeReadyHome(plan.scenarios.readyHome), plan.scenarios.readyHome.transition), fixer: comparable(plan, computeFixer(plan.scenarios.fixer), plan.scenarios.fixer.transition), rentFirst: comparable(plan, computeRentFirst(plan.scenarios.rentFirst), plan.scenarios.rentFirst.transition) } };
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

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysRemaining(target, from = localDateString()) {
  return Math.ceil((dateOnly(target).getTime() - dateOnly(from).getTime()) / DAY_MS);
}

export const deriveTaskDueDate = (task, target) => task.dueDateOverride || addMonthsClamped(target, task.offsetMonths);
export const deriveTaskStartDate = (task, target) => addDays(deriveTaskDueDate(task, target), -(task.durationWeeks * 7));

export function ganttPosition(task, target) {
  const chartStart = addMonthsClamped(target, -12);
  const chartEnd = addDays(target, 7);
  const start = deriveTaskStartDate(task, target);
  const end = deriveTaskDueDate(task, target);
  const total = Math.max(1, daysRemaining(chartEnd, chartStart));
  const left = Math.max(0, Math.min(100, (daysRemaining(start, chartStart) / total) * 100));
  const rawRight = Math.max(left + 1, Math.min(100, (daysRemaining(end, chartStart) / total) * 100));
  return { chartStart, chartEnd, start, end, left, width: Math.max(1, rawRight - left) };
}

export function earliestIncompleteTask(tasks, target) {
  return tasks.filter((task) => task.status !== "done").map((task) => ({ ...task, dueDate: deriveTaskDueDate(task, target) })).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))[0] || null;
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

function assertCandidate(candidate, index, seenIds) {
  if (!candidate || typeof candidate !== "object") throw new TypeError(`Candidate ${index + 1} is invalid.`);
  if (typeof candidate.id !== "string" || !candidate.id || candidate.id.length > 120 || seenIds.has(candidate.id)) throw new TypeError(`Candidate ${index + 1} id is invalid or duplicated.`);
  seenIds.add(candidate.id);
  if (typeof candidate.label !== "string" || !candidate.label || candidate.label.length > 120) throw new TypeError(`Candidate ${index + 1} label is invalid.`);
  if (!AREA_KEYS.includes(candidate.areaKey)) throw new RangeError(`Candidate ${index + 1} area is invalid.`);
  if (!["ready-home", "fixer", "land-build", "rent-first"].includes(candidate.housingPath)) throw new RangeError(`Candidate ${index + 1} path is invalid.`);
  if (!["watch", "visit", "shortlist", "pass"].includes(candidate.status)) throw new RangeError(`Candidate ${index + 1} status is invalid.`);
  assertNumber(candidate.priceUsd, `Candidate ${index + 1} price`);
  if (typeof candidate.url !== "string" || candidate.url.length > 2048) throw new TypeError(`Candidate ${index + 1} link is invalid.`);
  if (candidate.url) {
    let parsed;
    try { parsed = new URL(candidate.url); } catch { throw new TypeError(`Candidate ${index + 1} link must be valid.`); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new TypeError(`Candidate ${index + 1} link must use HTTP or HTTPS.`);
  }
  if (typeof candidate.notes !== "string" || candidate.notes.length > 1000) throw new TypeError(`Candidate ${index + 1} notes are invalid.`);
}

function validateOrdered(values, label) {
  if (values.every((value) => value !== null) && !(values[0] <= values[1] && values[1] <= values[2])) throw new RangeError(`${label} must run from low to working to high.`);
}

export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object") throw new TypeError("Plan must be a JSON object.");
  if (typeof envelope.schemaVersion !== "string" || envelope.schemaVersion.split(".")[0] !== "2") throw new RangeError("This file uses an unsupported plan version.");
  if (!Number.isInteger(envelope.revision) || envelope.revision < 0 || envelope.mode !== "private") throw new TypeError("Plan envelope is invalid.");
  const plan = envelope.plan;
  if (!plan || typeof plan !== "object") throw new TypeError("Plan data is missing.");
  dateOnly(plan.targetMoveDate, "Target move date");
  if (!["hillsboro", "tigard", "both"].includes(plan.destinationFocus)) throw new RangeError("Destination focus is invalid.");
  Object.entries(plan.household).forEach(([key, value]) => assertNumber(value, key, { max: 20, integer: true }));
  if (!["researching", "applying", "interviewing", "offer-accepted", "employed"].includes(plan.career.status)) throw new RangeError("Career status is invalid.");
  if (!Array.isArray(plan.career.targetRoles) || plan.career.targetRoles.some((item) => typeof item !== "string" || item.length > 120)) throw new TypeError("Target roles are invalid.");
  const money = [plan.career.primaryGrossAnnualUsd, plan.career.partnerGrossAnnualUsd, plan.career.householdNetIncomeMonthlyUsd, plan.career.nonHousingSpendMonthlyUsd, plan.funds.liquidUsd, plan.funds.otherMoveFundsUsd, plan.funds.reserveFloorUsd, plan.debtPlan.plannedPaydownFromMoveFundsUsd, plan.debtPlan.currentRequiredPaymentsMonthlyUsd, plan.debtPlan.paymentsEliminatedMonthlyUsd, plan.affordability.comfortHousingMonthlyUsd, plan.affordability.maxPurchaseTargetUsd, plan.currentHomeSale.salePriceLowUsd, plan.currentHomeSale.salePriceWorkingUsd, plan.currentHomeSale.salePriceHighUsd, plan.currentHomeSale.prepMinUsd, plan.currentHomeSale.prepWorkingUsd, plan.currentHomeSale.prepMaxUsd, plan.currentHomeSale.mortgagePayoffUsd, plan.currentHomeSale.otherLienPayoffUsd, plan.currentHomeSale.sellerFixedClosingUsd, plan.currentHomeSale.sellerConcessionsUsd, plan.commonMove.movingAndTravelUsd];
  money.forEach((value, index) => assertNumber(value, `Money field ${index + 1}`));
  if (plan.debtPlan.currentRequiredPaymentsMonthlyUsd !== null && plan.debtPlan.paymentsEliminatedMonthlyUsd !== null && plan.debtPlan.paymentsEliminatedMonthlyUsd > plan.debtPlan.currentRequiredPaymentsMonthlyUsd) throw new RangeError("Eliminated monthly debt payments cannot exceed current required payments.");
  assertNumber(plan.affordability.frontEndRate, "Front-end DTI", { max: 1 });
  assertNumber(plan.affordability.backEndRate, "Back-end DTI", { max: 1 });
  if (plan.affordability.frontEndRate !== null && plan.affordability.backEndRate !== null && plan.affordability.frontEndRate > plan.affordability.backEndRate) throw new RangeError("Front-end DTI cannot exceed back-end DTI.");
  assertNumber(plan.currentHomeSale.sellingCostRate, "Selling cost rate", { max: 1 });
  validateOrdered([plan.currentHomeSale.salePriceLowUsd, plan.currentHomeSale.salePriceWorkingUsd, plan.currentHomeSale.salePriceHighUsd], "Sale prices");
  validateOrdered([plan.currentHomeSale.prepMinUsd, plan.currentHomeSale.prepWorkingUsd, plan.currentHomeSale.prepMaxUsd], "Preparation estimates");
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
    assertNumber(task.durationWeeks, `Roadmap task ${index + 1} duration`, { min: 1, max: 104, integer: true });
    if (task.dueDateOverride) dateOnly(task.dueDateOverride);
  });
  if (!Array.isArray(plan.candidates) || plan.candidates.length > 100) throw new RangeError("Candidate notebook may contain at most 100 entries.");
  const ids = new Set(); plan.candidates.forEach((candidate, index) => assertCandidate(candidate, index, ids));
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
  if (!raw || typeof raw !== "object" || typeof raw.schemaVersion !== "string" || !["1", "2"].includes(raw.schemaVersion.split(".")[0])) throw new RangeError("This file uses an unsupported plan version.");
  const sourceMajor = raw.schemaVersion.split(".")[0];
  const safe = allowlist(raw, template);
  safe.schemaVersion = SCHEMA_VERSION; safe.mode = "private";
  safe.plan.career.targetRoles = Array.isArray(raw.plan?.career?.targetRoles) ? raw.plan.career.targetRoles.map((item) => item) : [];
  const taskTemplate = template.plan.roadmap[0];
  safe.plan.roadmap = Array.isArray(raw.plan?.roadmap) ? raw.plan.roadmap.map((task) => allowlist(task, taskTemplate)) : [];
  const candidateTemplate = template.plan.candidates[0] || { id: "candidate", label: "Candidate", areaKey: "hillsboro", housingPath: "ready-home", status: "watch", priceUsd: null, url: "", notes: "" };
  safe.plan.candidates = sourceMajor === "2" && Array.isArray(raw.plan?.candidates) ? raw.plan.candidates.map((candidate) => allowlist(candidate, candidateTemplate)) : [];
  if (sourceMajor === "1") {
    safe.plan.career.primaryGrossAnnualUsd = null; safe.plan.career.partnerGrossAnnualUsd = null;
    safe.plan.debtPlan = { plannedPaydownFromMoveFundsUsd: null, currentRequiredPaymentsMonthlyUsd: null, paymentsEliminatedMonthlyUsd: null };
    safe.plan.affordability = { frontEndRate: null, backEndRate: null, comfortHousingMonthlyUsd: null, maxPurchaseTargetUsd: null };
    safe.plan.currentHomeSale.salePriceLowUsd = null;
    safe.plan.currentHomeSale.salePriceWorkingUsd = raw.plan?.currentHomeSale?.estimatedSalePriceUsd ?? null;
    safe.plan.currentHomeSale.salePriceHighUsd = null;
    safe.plan.currentHomeSale.prepMinUsd = null;
    safe.plan.currentHomeSale.prepWorkingUsd = raw.plan?.currentHomeSale?.prepAndRepairUsd ?? null;
    safe.plan.currentHomeSale.prepMaxUsd = null;
    safe.plan.currentHomeSale.otherLienPayoffUsd = 0;
    safe.plan.currentHomeSale.sellerConcessionsUsd = 0;
  }
  safe.plan.roadmap.forEach((task) => { task.durationWeeks = task.durationWeeks ?? 4; });
  validateEnvelope(safe);
  return safe;
}
