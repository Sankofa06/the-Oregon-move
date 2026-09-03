import {
  MAX_IMPORT_BYTES,
  addMonthsClamped,
  computePlan,
  daysRemaining,
  deriveTaskDueDate,
  deriveTaskStartDate,
  earliestIncompleteTask,
  ganttPosition,
  sanitizeImportedEnvelope,
  validateEnvelope,
  workspaceStorageKey,
} from "./model.mjs";
import { areaProfiles, blankPrivateEnvelope, exampleEnvelope, jobAnchors, sources, waterways } from "./public-data.mjs";

const LEGACY_STORAGE_KEY = "oregonMove.plan.v1";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const clone = (value) => structuredClone(value);
const byId = (id) => document.getElementById(id);
const svgNs = "http://www.w3.org/2000/svg";
const workspaceNames = { mine: "My model", partner: "Partner model" };

const workspaceStates = { example: { envelope: clone(exampleEnvelope), dirty: false, saveTimer: null, conflictEnvelope: null, loadedMessage: "Illustrative example · nothing has been stored." }, mine: null, partner: null };
let activeWorkspace = "example";
let selectedAreaKey = "hillsboro";

const fieldGroups = {
  shared: [
    ["career.primaryGrossAnnualUsd", "Primary gross annual income", "USD / year", "money"],
    ["career.partnerGrossAnnualUsd", "Partner gross annual income", "USD / year", "money"],
    ["career.householdNetIncomeMonthlyUsd", "Household net income", "USD / month", "money"],
    ["career.nonHousingSpendMonthlyUsd", "Current non-housing spend, including debt", "USD / month", "money"],
    ["debtPlan.currentRequiredPaymentsMonthlyUsd", "Current required debt payments", "USD / month", "money"],
    ["debtPlan.plannedPaydownFromMoveFundsUsd", "Planned debt payoff from move funds", "USD", "money"],
    ["debtPlan.paymentsEliminatedMonthlyUsd", "Payments eliminated by payoff", "USD / month", "money"],
    ["funds.liquidUsd", "Liquid funds", "USD", "money"],
    ["funds.otherMoveFundsUsd", "Other move funds", "USD", "money"],
    ["funds.reserveFloorUsd", "Reserve floor", "USD", "money"],
    ["affordability.frontEndRate", "Front-end DTI guide", "% of gross", "percent"],
    ["affordability.backEndRate", "Back-end DTI guide", "% of gross", "percent"],
    ["affordability.comfortHousingMonthlyUsd", "Comfortable monthly housing ceiling", "USD / month", "money"],
    ["affordability.maxPurchaseTargetUsd", "Maximum purchase planning target", "USD", "money"],
    ["commonMove.movingAndTravelUsd", "Moving and travel", "USD", "money"],
  ],
  landBuild: [
    ["scenarios.landBuild.landPriceUsd", "Land price", "USD", "money"], ["scenarios.landBuild.buildBaseUsd", "Base build", "USD", "money"],
    ["scenarios.landBuild.siteWorkUsd", "Site work", "USD", "money"], ["scenarios.landBuild.designPermitDueDiligenceCashOnlyUsd", "Cash-only design, permits, diligence", "USD", "money"],
    ["scenarios.landBuild.buildAndSiteContingencyRate", "Build contingency", "%", "percent"], ["scenarios.landBuild.downPaymentRate", "Down payment", "%", "percent"],
    ["scenarios.landBuild.loanClosingRate", "Loan closing", "% of principal", "percent"], ["scenarios.landBuild.prepaidsUsd", "Prepaids", "USD", "money"],
    ["scenarios.landBuild.monthly.interestRateAnnual", "Mortgage rate", "% annual", "percent"], ["scenarios.landBuild.monthly.termYears", "Loan term", "years", "integer"],
    ["scenarios.landBuild.monthly.propertyTaxBasisUsd", "Tax/value basis", "USD", "money"], ["scenarios.landBuild.monthly.propertyTaxRateAnnual", "Illustrative tax rate", "% annual", "percent"],
    ["scenarios.landBuild.monthly.insuranceAnnualUsd", "Illustrative insurance", "USD / year", "money"], ["scenarios.landBuild.monthly.maintenanceRateAnnual", "Maintenance reserve", "% annual", "percent"],
    ["scenarios.landBuild.monthly.hoaMonthlyUsd", "HOA", "USD / month", "money"], ["scenarios.landBuild.monthly.pmiMonthlyUsd", "Mortgage insurance", "USD / month", "money"],
    ["scenarios.landBuild.monthly.otherMonthlyUsd", "Other monthly housing", "USD / month", "money"], ["scenarios.landBuild.transition.oneTimeSetupUsd", "One-time setup", "USD", "money"],
    ["scenarios.landBuild.transition.transitionMonthlyUsd", "Construction-period carry", "USD / month", "money"], ["scenarios.landBuild.transition.transitionMonths", "Carry duration", "months", "integer"],
  ],
  readyHome: [
    ["scenarios.readyHome.purchasePriceUsd", "Purchase price", "USD", "money"], ["scenarios.readyHome.downPaymentRate", "Down payment", "%", "percent"],
    ["scenarios.readyHome.buyerClosingRate", "Buyer closing", "%", "percent"], ["scenarios.readyHome.prepaidsUsd", "Prepaids", "USD", "money"],
    ["scenarios.readyHome.monthly.interestRateAnnual", "Mortgage rate", "% annual", "percent"], ["scenarios.readyHome.monthly.termYears", "Loan term", "years", "integer"],
    ["scenarios.readyHome.monthly.propertyTaxBasisUsd", "Tax/value basis", "USD", "money"], ["scenarios.readyHome.monthly.propertyTaxRateAnnual", "Illustrative tax rate", "% annual", "percent"],
    ["scenarios.readyHome.monthly.insuranceAnnualUsd", "Illustrative insurance", "USD / year", "money"], ["scenarios.readyHome.monthly.maintenanceRateAnnual", "Maintenance reserve", "% annual", "percent"],
    ["scenarios.readyHome.monthly.hoaMonthlyUsd", "HOA", "USD / month", "money"], ["scenarios.readyHome.monthly.pmiMonthlyUsd", "Mortgage insurance", "USD / month", "money"],
    ["scenarios.readyHome.monthly.otherMonthlyUsd", "Other monthly housing", "USD / month", "money"], ["scenarios.readyHome.transition.oneTimeSetupUsd", "One-time setup", "USD", "money"],
    ["scenarios.readyHome.transition.transitionMonthlyUsd", "Overlap housing", "USD / month", "money"], ["scenarios.readyHome.transition.transitionMonths", "Overlap duration", "months", "integer"],
  ],
  fixer: [
    ["scenarios.fixer.purchasePriceUsd", "Purchase price", "USD", "money"], ["scenarios.fixer.downPaymentRate", "Down payment", "%", "percent"],
    ["scenarios.fixer.buyerClosingRate", "Buyer closing", "%", "percent"], ["scenarios.fixer.prepaidsUsd", "Prepaids", "USD", "money"],
    ["scenarios.fixer.rehabBaseUsd", "Base rehab", "USD", "money"], ["scenarios.fixer.rehabContingencyRate", "Rehab contingency", "%", "percent"],
    ["scenarios.fixer.rehabFinancedUsd", "Financed rehab", "USD", "money"], ["scenarios.fixer.monthly.interestRateAnnual", "Mortgage rate", "% annual", "percent"],
    ["scenarios.fixer.monthly.termYears", "Loan term", "years", "integer"], ["scenarios.fixer.monthly.propertyTaxBasisUsd", "Tax/value basis", "USD", "money"],
    ["scenarios.fixer.monthly.propertyTaxRateAnnual", "Illustrative tax rate", "% annual", "percent"], ["scenarios.fixer.monthly.insuranceAnnualUsd", "Illustrative insurance", "USD / year", "money"],
    ["scenarios.fixer.monthly.maintenanceRateAnnual", "Maintenance reserve", "% annual", "percent"], ["scenarios.fixer.monthly.hoaMonthlyUsd", "HOA", "USD / month", "money"],
    ["scenarios.fixer.monthly.pmiMonthlyUsd", "Mortgage insurance", "USD / month", "money"], ["scenarios.fixer.monthly.otherMonthlyUsd", "Other monthly housing", "USD / month", "money"],
    ["scenarios.fixer.transition.oneTimeSetupUsd", "One-time setup", "USD", "money"], ["scenarios.fixer.transition.transitionMonthlyUsd", "Rehab/overlap housing", "USD / month", "money"],
    ["scenarios.fixer.transition.transitionMonths", "Overlap duration", "months", "integer"],
  ],
  rentFirst: [
    ["scenarios.rentFirst.rentMonthlyUsd", "Monthly rent", "USD / month", "money"], ["scenarios.rentFirst.securityDepositUsd", "Security deposit", "USD", "money"],
    ["scenarios.rentFirst.firstMonthUsd", "First month", "USD", "money"], ["scenarios.rentFirst.lastMonthUsd", "Last month", "USD", "money"],
    ["scenarios.rentFirst.petDepositUsd", "Dog deposit", "USD", "money"], ["scenarios.rentFirst.applicationAndMoveInFeesUsd", "Application and move-in fees", "USD", "money"],
    ["scenarios.rentFirst.rentersInsuranceMonthlyUsd", "Renters insurance", "USD / month", "money"], ["scenarios.rentFirst.petRentMonthlyUsd", "Dog rent", "USD / month", "money"],
    ["scenarios.rentFirst.parkingAndOtherMonthlyUsd", "Parking and other", "USD / month", "money"], ["scenarios.rentFirst.transition.oneTimeSetupUsd", "One-time setup", "USD", "money"],
    ["scenarios.rentFirst.transition.transitionMonthlyUsd", "Other transition cost", "USD / month", "money"], ["scenarios.rentFirst.transition.transitionMonths", "Transition duration", "months", "integer"],
  ],
  sale: [
    ["currentHomeSale.salePriceLowUsd", "Low sale price", "USD", "money"], ["currentHomeSale.salePriceWorkingUsd", "Working sale price", "USD", "money"], ["currentHomeSale.salePriceHighUsd", "High sale price", "USD", "money"],
    ["currentHomeSale.mortgagePayoffUsd", "Mortgage payoff", "USD", "money"], ["currentHomeSale.otherLienPayoffUsd", "Other lien payoff", "USD", "money"], ["currentHomeSale.sellingCostRate", "Variable selling cost", "%", "percent"],
    ["currentHomeSale.prepMinUsd", "Minimum preparation", "USD", "money"], ["currentHomeSale.prepWorkingUsd", "Working preparation", "USD", "money"], ["currentHomeSale.prepMaxUsd", "Maximum preparation", "USD", "money"],
    ["currentHomeSale.sellerFixedClosingUsd", "Fixed seller costs", "USD", "money"], ["currentHomeSale.sellerConcessionsUsd", "Seller concessions", "USD", "money"],
  ],
};

function state() { return workspaceStates[activeWorkspace]; }
function isPrivate() { return activeWorkspace !== "example"; }
function valueAt(path) { return path.split(".").reduce((value, key) => value?.[key], state().envelope.plan); }
function setAt(path, value) { const keys = path.split("."); const final = keys.pop(); keys.reduce((value, key) => value[key], state().envelope.plan)[final] = value; }
function announce(message, slot = activeWorkspace) { if (slot === activeWorkspace) byId("save-status").textContent = message; }
function outputText(value, suffix = "") { return value === null || value === undefined || !Number.isFinite(value) ? "Needs input" : `${money.format(Math.round(value))}${suffix}`; }
function percentText(value) { return value === null || !Number.isFinite(value) ? "Needs input" : `${(value * 100).toFixed(1)}%`; }
function headroomText(value) { if (value === null || !Number.isFinite(value)) return "Needs input"; return value < 0 ? `${money.format(Math.abs(Math.round(value)))} over` : `${money.format(Math.round(value))} under`; }
function reserveText(result) { if (result.cushion === null) return "Needs input"; return result.shortfall > 0 ? `${money.format(Math.round(result.shortfall))} shortfall` : `${money.format(Math.round(result.cushion))} above floor`; }

function loadWorkspace(slot) {
  if (workspaceStates[slot]) return workspaceStates[slot];
  let envelope = clone(blankPrivateEnvelope);
  let loadedMessage = `${workspaceNames[slot]} started blank · memory-only until you opt into saving.`;
  try {
    let raw = localStorage.getItem(workspaceStorageKey(slot));
    let legacy = false;
    if (!raw && slot === "mine") { raw = localStorage.getItem(LEGACY_STORAGE_KEY); legacy = Boolean(raw); }
    if (raw) {
      envelope = sanitizeImportedEnvelope(JSON.parse(raw), blankPrivateEnvelope, new Blob([raw]).size);
      loadedMessage = legacy ? "Older private plan migrated into My model in memory; review new fields before saving." : `${workspaceNames[slot]} loaded from this browser.`;
    }
  } catch {
    loadedMessage = `${workspaceNames[slot]} could not read its saved copy. The stored data was left untouched; a blank in-memory model is open.`;
  }
  envelope.plan.preferences.saveOnDevice = Boolean(envelope.plan.preferences.saveOnDevice && !loadedMessage.includes("memory"));
  workspaceStates[slot] = { envelope, dirty: false, saveTimer: null, conflictEnvelope: null, loadedMessage };
  return workspaceStates[slot];
}

function switchWorkspace(slot) {
  if (!["example", "mine", "partner"].includes(slot)) return;
  activeWorkspace = slot;
  if (slot !== "example") loadWorkspace(slot);
  document.querySelectorAll('input[name="workspace"]').forEach((radio) => { radio.checked = radio.value === slot; });
  byId("conflict").hidden = !state().conflictEnvelope;
  render();
  announce(state().loadedMessage);
}

function createField(path, labelText, unit, kind) {
  const wrapper = document.createElement("div"); wrapper.className = "field";
  const id = `field-${path.replaceAll(".", "-")}`;
  const label = document.createElement("label"); label.htmlFor = id; label.append(document.createTextNode(`${labelText} `));
  const unitText = document.createElement("span"); unitText.className = "unit"; unitText.textContent = `(${unit})`; label.append(unitText);
  const input = document.createElement("input"); input.id = id; input.type = "number"; input.inputMode = kind === "integer" ? "numeric" : "decimal";
  input.min = kind === "integer" && labelText.includes("term") ? "1" : "0";
  input.max = kind === "percent" ? (labelText.includes("Mortgage") ? "30" : "100") : kind === "integer" ? (labelText.includes("term") ? "50" : "60") : "100000000";
  input.step = kind === "integer" ? "1" : kind === "percent" ? "0.01" : "100";
  input.dataset.modelPath = path; input.dataset.kind = kind; input.setAttribute("aria-describedby", `${id}-error`);
  const error = document.createElement("span"); error.id = `${id}-error`; error.className = "error";
  wrapper.append(label, input, error); return wrapper;
}

function buildForms() {
  document.querySelectorAll("[data-form]").forEach((container) => {
    const fragment = document.createDocumentFragment();
    fieldGroups[container.dataset.form].forEach((field) => fragment.append(createField(...field)));
    container.append(fragment);
  });
}

function syncInputs() {
  document.querySelectorAll("[data-model-path]").forEach((input) => {
    const stored = valueAt(input.dataset.modelPath);
    input.value = stored === null ? "" : input.dataset.kind === "percent" ? String(Number((stored * 100).toFixed(4))) : String(stored);
    input.disabled = !isPrivate();
  });
  document.querySelectorAll("[data-path]").forEach((input) => { input.value = valueAt(input.dataset.path); input.disabled = !isPrivate(); });
}

function renderScenarios() {
  let result;
  try { result = computePlan(state().envelope.plan); } catch (error) { announce(error.message); return; }
  for (const [key, scenario] of Object.entries(result.scenarios)) {
    const values = { entryCash: outputText(scenario.entryCash), postMoveCash: outputText(scenario.postMoveCash), monthly: outputText(scenario.monthly.value, " / mo"), monthlyHeadroom: headroomText(scenario.affordability.monthlyHeadroom), priceHeadroom: headroomText(scenario.affordability.priceHeadroom), availableFunds: outputText(scenario.availableMoveFunds), cushion: reserveText(scenario), totalDti: percentText(scenario.affordability.totalDtiRatio), cashFlow: outputText(scenario.monthlyCashFlow, " / mo") };
    Object.entries(values).forEach(([metric, text]) => { const node = document.querySelector(`[data-output="${key}.${metric}"]`); if (node) node.textContent = text; });
    const missing = document.querySelector(`[data-missing="${key}"]`);
    const combined = [...new Set([...scenario.missing, ...scenario.affordability.missing])];
    missing.textContent = combined.length ? `Needs input: ${combined.slice(0, 3).join(", ")}${combined.length > 3 ? "…" : ""}` : "All comparison inputs present.";
  }
  const affordability = result.affordability;
  byId("gross-monthly").textContent = outputText(affordability.grossMonthly, " / mo");
  byId("dti-ceiling").textContent = outputText(affordability.dtiCeiling, " / mo");
  byId("comfort-ceiling").textContent = outputText(state().envelope.plan.affordability.comfortHousingMonthlyUsd, " / mo");
  byId("planning-ceiling").textContent = outputText(affordability.planningCeiling, " / mo");
  byId("affordability-missing").textContent = affordability.missing.length ? `Still needed: ${affordability.missing.join(", ")}.` : `Planning ceiling is the lower of the DTI guide and your comfort ceiling; remaining required debt is ${outputText(affordability.remainingDebtMonthly, " / mo")}.`;
  const saleCases = [["sale-low", result.saleRange.conservative], ["sale-net", result.saleRange.working], ["sale-high", result.saleRange.stretch]];
  saleCases.forEach(([id, sale]) => { byId(id).textContent = sale.netProceeds === null ? "Needs input" : sale.netProceeds < 0 ? `${money.format(Math.abs(Math.round(sale.netProceeds)))} cash needed` : outputText(sale.netProceeds); });
  const saleMissing = [...new Set(Object.values(result.saleRange).flatMap((sale) => sale.missing))];
  byId("sale-detail").textContent = saleMissing.length ? `Still needed: ${saleMissing.slice(0, 5).join(", ")}${saleMissing.length > 5 ? "…" : ""}` : "Conservative = low price + maximum prep; working = working price + prep; stretch = high price + minimum prep. No case is an appraisal.";
  byId("usable-funds").textContent = outputText(result.available.value);
}

function renderStatus() {
  const plan = state().envelope.plan;
  const remaining = daysRemaining(plan.targetMoveDate);
  byId("days-remaining").textContent = remaining < 0 ? "Target date has passed" : `${remaining.toLocaleString()} days to plan`;
  byId("career-note").textContent = ["offer-accepted", "employed"].includes(plan.career.status) ? "Verify location, start timing, benefits, and net income." : "Jobsite and durable income are not yet secured for the move.";
  const next = earliestIncompleteTask(plan.roadmap, plan.targetMoveDate);
  byId("next-action").textContent = next?.title || "All roadmap tasks are complete.";
  byId("next-action-meta").textContent = next ? `${next.phaseId} · ${next.owner} · due ${dateFormat.format(new Date(`${next.dueDate}T00:00:00Z`))}` : "Review together and refresh dated assumptions.";
  byId("mode-label").textContent = isPrivate() ? `${workspaceNames[activeWorkspace]} · private local slot` : "Illustrative public example";
  byId("assumption-note").textContent = isPrivate() ? `${workspaceNames[activeWorkspace]}: private fields started blank or came from your import. Nothing is stored unless Save this model is on.` : "Illustrative only: every figure and candidate is fictional and rounded. This is not the household’s private financial truth, a quote, a forecast, or lender approval.";
  document.body.classList.toggle("private-plan", isPrivate()); document.body.classList.toggle("hide-values", plan.preferences.hideValues);
  byId("hide-values").disabled = !isPrivate(); byId("hide-values").checked = plan.preferences.hideValues;
  byId("save-device").disabled = !isPrivate(); byId("save-device").checked = isPrivate() && plan.preferences.saveOnDevice;
  byId("export-plan").disabled = !isPrivate(); byId("import-trigger").disabled = !isPrivate(); byId("clear-plan").disabled = !isPrivate(); byId("reset-roadmap").disabled = !isPrivate(); byId("candidate-add").disabled = !isPrivate();
  document.querySelectorAll("#candidate-form input, #candidate-form select, #candidate-form textarea").forEach((input) => { input.disabled = !isPrivate(); });
  document.querySelectorAll("[data-focus]").forEach((button) => { const selected = plan.selectedFocus === button.dataset.focus; button.disabled = !isPrivate(); button.setAttribute("aria-pressed", String(selected)); button.textContent = selected ? "Current focus" : "Set as focus"; button.closest(".scenario-card").classList.toggle("is-focus", selected); });
}

function createSvg(name, attributes = {}) {
  const node = document.createElementNS(svgNs, name); Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value))); return node;
}

function layerEnabled(name) { return document.querySelector(`[data-map-layer="${name}"]`)?.checked ?? true; }
function fitLabel(value) { return ({ strong: "Strong fit", workable: "Workable", variable: "Traffic-sensitive", stretched: "Often over target" })[value]; }

function selectArea(key) { selectedAreaKey = key; renderMap(); renderAreaDetail(); renderAreaList(); }

function renderMap() {
  const plan = state().envelope.plan; const lens = byId("commute-target").value;
  const waterLayer = byId("water-layer"); const schoolLayer = byId("school-layer"); const jobLayer = byId("job-layer"); const areaLayer = byId("area-layer"); const candidateLayer = byId("candidate-layer");
  [waterLayer, schoolLayer, jobLayer, areaLayer, candidateLayer].forEach((node) => node.replaceChildren());
  if (layerEnabled("water")) waterways.forEach((river) => { const line = createSvg("polyline", { points: river.points, class: "waterway" }); const title = createSvg("title"); title.textContent = river.name; line.append(title); waterLayer.append(line); });
  areaProfiles.forEach((area, index) => {
    const group = createSvg("g", { class: `area-pin fit-${area.fit[lens]}${selectedAreaKey === area.key ? " is-selected" : ""}`, tabindex: "0", role: "button", "aria-label": `${area.name}; ${fitLabel(area.fit[lens])} for selected commute lens`, "aria-pressed": String(selectedAreaKey === area.key), transform: `translate(${area.x} ${area.y})` });
    group.dataset.areaKey = area.key; const circle = createSvg("circle", { r: "12" }); const number = createSvg("text", { x: "0", y: "4", "text-anchor": "middle" }); number.textContent = String(index + 1); group.append(circle, number); areaLayer.append(group);
    if (layerEnabled("schools")) { const marker = createSvg("rect", { class: "school-pin", x: area.x + 13, y: area.y - 20, width: "8", height: "8", rx: "1" }); const title = createSvg("title"); title.textContent = `${area.school} lookup context`; marker.append(title); schoolLayer.append(marker); }
  });
  if (layerEnabled("jobs")) jobAnchors.forEach((job) => { const group = createSvg("g", { class: "job-pin", transform: `translate(${job.x} ${job.y})` }); const diamond = createSvg("polygon", { points: "0,-9 9,0 0,9 -9,0" }); const title = createSvg("title"); title.textContent = `${job.name}. ${job.note}`; diamond.append(title); const label = createSvg("text", { x: "12", y: "4" }); label.textContent = job.name.split(" · ")[0]; group.append(diamond, label); jobLayer.append(group); });
  if (layerEnabled("candidates")) plan.candidates.forEach((candidate, index) => { const area = areaProfiles.find((item) => item.key === candidate.areaKey); if (!area) return; const offsetX = 18 + ((index % 3) * 11); const offsetY = 8 + ((index % 2) * 12); const group = createSvg("g", { class: "candidate-pin", transform: `translate(${area.x + offsetX} ${area.y + offsetY})` }); const star = createSvg("text", { x: "0", y: "0" }); star.textContent = "★"; const title = createSvg("title"); title.textContent = `${candidate.label}; approximate ${area.name} area pin`; star.append(title); group.append(star); candidateLayer.append(group); });
  areaLayer.querySelectorAll("[data-area-key]").forEach((pin) => { pin.addEventListener("click", () => selectArea(pin.dataset.areaKey)); pin.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectArea(pin.dataset.areaKey); } }); });
}

function appendExternalLink(parent, href, text) { const link = document.createElement("a"); link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = text; parent.append(link); }

function renderAreaDetail() {
  const area = areaProfiles.find((item) => item.key === selectedAreaKey) || areaProfiles[0]; const lens = byId("commute-target").value; const job = jobAnchors.find((item) => item.key === lens);
  const panel = byId("area-detail"); panel.replaceChildren(); const kicker = document.createElement("span"); kicker.className = "card-kicker"; kicker.textContent = `${fitLabel(area.fit[lens])} for ${job.name}`;
  const heading = document.createElement("h3"); heading.textContent = area.name; const market = document.createElement("p"); market.className = "market-line"; market.textContent = area.market;
  const summary = document.createElement("p"); summary.textContent = area.summary; const water = document.createElement("p"); water.textContent = area.water;
  const links = document.createElement("div"); links.className = "detail-links"; appendExternalLink(links, area.redfin, "Redfin ≤ $700k ↗"); appendExternalLink(links, area.zillow, "Zillow search ↗"); appendExternalLink(links, area.schoolUrl, `${area.school} lookup ↗`);
  panel.append(kicker, heading, market, summary, water, links);
}

function renderAreaList() {
  const list = byId("area-list"); list.replaceChildren(); const lens = byId("commute-target").value;
  areaProfiles.forEach((area, index) => { const card = document.createElement("article"); card.className = selectedAreaKey === area.key ? "area-card is-selected" : "area-card"; const top = document.createElement("div"); const number = document.createElement("span"); number.textContent = String(index + 1).padStart(2, "0"); const badge = document.createElement("strong"); badge.className = `fit-badge fit-${area.fit[lens]}`; badge.textContent = fitLabel(area.fit[lens]); top.append(number, badge); const button = document.createElement("button"); button.type = "button"; button.dataset.selectArea = area.key; button.textContent = area.name; const note = document.createElement("p"); note.textContent = area.summary; const links = document.createElement("div"); links.className = "area-card-links"; appendExternalLink(links, area.redfin, "Redfin"); appendExternalLink(links, area.zillow, "Zillow"); appendExternalLink(links, area.schoolUrl, "School lookup"); card.append(top, button, note, links); list.append(card); });
  list.querySelectorAll("[data-select-area]").forEach((button) => button.addEventListener("click", () => selectArea(button.dataset.selectArea)));
}

function selectOption(value, text) { const option = document.createElement("option"); option.value = value; option.textContent = text; return option; }

function candidateField(labelText, control) { const label = document.createElement("label"); label.append(document.createTextNode(labelText), control); return label; }

function renderCandidates() {
  const list = byId("candidate-list"); list.replaceChildren(); const candidates = state().envelope.plan.candidates;
  if (!candidates.length) { const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = isPrivate() ? "No candidates in this model yet. Use the live searches, then save neutral nicknames here." : "The public example has no specific property. Select a private model to build your own shortlist."; list.append(empty); return; }
  candidates.forEach((candidate) => {
    const card = document.createElement("article"); card.className = "candidate-card";
    const labelInput = document.createElement("input"); labelInput.value = candidate.label; labelInput.maxLength = 120;
    const areaSelect = document.createElement("select"); areaProfiles.forEach((area) => areaSelect.append(selectOption(area.key, area.name))); areaSelect.value = candidate.areaKey;
    const pathSelect = document.createElement("select"); [["ready-home", "Move-in-ready"], ["fixer", "Fixer"], ["land-build", "Land + build"], ["rent-first", "Rental"]].forEach(([value, text]) => pathSelect.append(selectOption(value, text))); pathSelect.value = candidate.housingPath;
    const statusSelect = document.createElement("select"); [["watch", "Watch"], ["visit", "Plan a visit"], ["shortlist", "Shortlist"], ["pass", "Pass"]].forEach(([value, text]) => statusSelect.append(selectOption(value, text))); statusSelect.value = candidate.status;
    const price = document.createElement("input"); price.type = "number"; price.min = "0"; price.max = "100000000"; price.step = "1000"; price.value = candidate.priceUsd ?? "";
    const url = document.createElement("input"); url.type = "url"; url.maxLength = 2048; url.value = candidate.url;
    const notes = document.createElement("textarea"); notes.rows = 3; notes.maxLength = 1000; notes.value = candidate.notes;
    [[labelInput, "label"], [areaSelect, "areaKey"], [pathSelect, "housingPath"], [statusSelect, "status"], [price, "priceUsd"], [url, "url"], [notes, "notes"]].forEach(([control, field]) => { control.dataset.candidateId = candidate.id; control.dataset.candidateField = field; control.disabled = !isPrivate(); });
    const grid = document.createElement("div"); grid.className = "candidate-edit-grid"; grid.append(candidateField("Nickname", labelInput), candidateField("Area", areaSelect), candidateField("Path", pathSelect), candidateField("Status", statusSelect), candidateField("Price", price), candidateField("Listing link", url), candidateField("Notes", notes));
    const actions = document.createElement("div"); actions.className = "candidate-actions"; if (candidate.url) appendExternalLink(actions, candidate.url, "Open listing ↗"); const remove = document.createElement("button"); remove.type = "button"; remove.className = "button danger"; remove.dataset.removeCandidate = candidate.id; remove.disabled = !isPrivate(); remove.textContent = "Remove"; actions.append(remove); card.append(grid, actions); list.append(card);
  });
}

function renderGanttAxis() {
  const axis = byId("gantt-axis"); axis.replaceChildren(); const target = state().envelope.plan.targetMoveDate;
  for (let index = -12; index <= 0; index += 1) { const date = addMonthsClamped(target, index); const span = document.createElement("span"); span.textContent = monthFormat.format(new Date(`${date}T00:00:00Z`)); axis.append(span); }
}

function renderRoadmap() {
  renderGanttAxis(); const list = byId("roadmap-list"); list.replaceChildren(); const plan = state().envelope.plan;
  const tasks = plan.roadmap.map((task) => ({ ...task, dueDate: deriveTaskDueDate(task, plan.targetMoveDate), startDate: deriveTaskStartDate(task, plan.targetMoveDate) })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  tasks.forEach((task) => {
    const row = document.createElement("article"); row.className = `roadmap-item status-${task.status}`;
    const heading = document.createElement("div"); heading.className = "roadmap-title"; const title = document.createElement("strong"); title.textContent = task.title; const meta = document.createElement("small"); meta.textContent = `${task.phaseId} · ${task.scenario === "all" ? "all paths" : task.scenario} · ${dateFormat.format(new Date(`${task.startDate}T00:00:00Z`))} → ${dateFormat.format(new Date(`${task.dueDate}T00:00:00Z`))}`; heading.append(title, meta);
    const controls = document.createElement("div"); controls.className = "roadmap-controls";
    const due = document.createElement("input"); due.type = "date"; due.value = task.dueDate; due.dataset.taskId = task.id; due.dataset.taskField = "dueDateOverride"; due.disabled = !isPrivate();
    const duration = document.createElement("input"); duration.type = "number"; duration.min = "1"; duration.max = "104"; duration.step = "1"; duration.value = task.durationWeeks; duration.dataset.taskId = task.id; duration.dataset.taskField = "durationWeeks"; duration.disabled = !isPrivate();
    const owner = document.createElement("select"); [["unassigned", "Unassigned"], ["me", "Me"], ["partner", "Partner"], ["both", "Both"]].forEach(([value, text]) => owner.append(selectOption(value, text))); owner.value = task.owner; owner.dataset.taskId = task.id; owner.dataset.taskField = "owner"; owner.disabled = !isPrivate();
    const status = document.createElement("select"); [["not-started", "Not started"], ["in-progress", "In progress"], ["blocked", "Blocked"], ["done", "Done"]].forEach(([value, text]) => status.append(selectOption(value, text))); status.value = task.status; status.dataset.taskId = task.id; status.dataset.taskField = "status"; status.disabled = !isPrivate();
    const follow = document.createElement("button"); follow.type = "button"; follow.className = "text-action"; follow.dataset.followTarget = task.id; follow.disabled = !isPrivate() || !task.dueDateOverride; follow.textContent = "Follow target";
    controls.append(candidateField("Due", due), candidateField("Weeks", duration), candidateField("Owner", owner), candidateField("Status", status), follow);
    const visual = createSvg("svg", { class: "gantt-row", viewBox: "0 0 1000 42", "aria-hidden": "true", preserveAspectRatio: "none" });
    for (let index = 0; index <= 12; index += 1) visual.append(createSvg("line", { x1: index * (1000 / 12), x2: index * (1000 / 12), y1: "0", y2: "42", class: "gantt-gridline" }));
    const position = ganttPosition(task, plan.targetMoveDate); visual.append(createSvg("rect", { x: position.left * 10, y: "9", width: position.width * 10, height: "24", rx: "5", class: `gantt-bar bar-${task.status}` }));
    row.append(heading, controls, visual); list.append(row);
  });
}

function renderSources() {
  const list = byId("source-list"); list.replaceChildren();
  sources.forEach((source) => { const item = document.createElement("article"); item.className = "source-item"; const meta = document.createElement("span"); meta.textContent = `${source.group} · ${source.date}`; const link = document.createElement("a"); link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = source.label; const note = document.createElement("p"); note.textContent = source.note; item.append(meta, link, note); list.append(item); });
}

function render() { syncInputs(); renderScenarios(); renderStatus(); renderMap(); renderAreaDetail(); renderAreaList(); renderCandidates(); renderRoadmap(); }

function saveWorkspace(slot, workspaceState) {
  workspaceState.saveTimer = null;
  if (!workspaceState.envelope.plan.preferences.saveOnDevice) return;
  try { validateEnvelope(workspaceState.envelope); } catch (error) { announce(`Not saved: ${error.message}`, slot); return; }
  try { workspaceState.envelope.revision += 1; workspaceState.envelope.updatedAt = new Date().toISOString(); localStorage.setItem(workspaceStorageKey(slot), JSON.stringify(workspaceState.envelope)); workspaceState.dirty = false; workspaceState.loadedMessage = `${workspaceNames[slot]} saved on this browser.`; announce(`Saved ${workspaceNames[slot]} at ${new Date(workspaceState.envelope.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, slot); } catch { workspaceState.envelope.plan.preferences.saveOnDevice = false; if (slot === activeWorkspace) byId("save-device").checked = false; announce("Browser storage is unavailable. This model remains memory-only; export still works.", slot); }
}

function scheduleSave() {
  if (!isPrivate()) return; const slot = activeWorkspace; const workspaceState = state(); workspaceState.dirty = true;
  if (!workspaceState.envelope.plan.preferences.saveOnDevice) { announce(`${workspaceNames[slot]} is memory-only · export to keep a portable copy.`); return; }
  announce(`Unsaved ${workspaceNames[slot]} changes…`); clearTimeout(workspaceState.saveTimer); workspaceState.saveTimer = setTimeout(() => saveWorkspace(slot, workspaceState), 450);
}

function onInput(event) {
  const input = event.target;
  if (!isPrivate()) return;
  if (!input.dataset.modelPath && !input.dataset.path) return;
  if (input.dataset.modelPath) {
    const raw = input.value.trim(); const displayValue = raw === "" ? null : Number(raw); const minimum = Number(input.min); const maximum = Number(input.max);
    if (displayValue !== null && (!Number.isFinite(displayValue) || displayValue < minimum || displayValue > maximum)) { input.setAttribute("aria-invalid", "true"); input.nextElementSibling.textContent = `Enter a value from ${minimum} to ${maximum.toLocaleString()}.`; return; }
    let value = displayValue; if (input.dataset.kind === "percent" && value !== null) value /= 100;
    if (input.dataset.kind === "integer" && value !== null && !Number.isInteger(value)) { input.setAttribute("aria-invalid", "true"); input.nextElementSibling.textContent = "Enter a whole number."; return; }
    input.removeAttribute("aria-invalid"); input.nextElementSibling.textContent = ""; setAt(input.dataset.modelPath, value);
  } else {
    if (input.dataset.path === "targetMoveDate") { try { daysRemaining(input.value); input.removeAttribute("aria-invalid"); } catch { input.setAttribute("aria-invalid", "true"); byId("days-remaining").textContent = "Enter a valid target date."; announce("The target date is incomplete. The previous date was kept."); return; } }
    setAt(input.dataset.path, input.value);
  }
  scheduleSave(); renderScenarios(); renderStatus(); if (input.dataset.path === "targetMoveDate") renderRoadmap();
}

buildForms();
areaProfiles.forEach((area) => byId("candidate-area").append(selectOption(area.key, area.name)));
renderSources(); render();

document.addEventListener("input", onInput);
document.querySelectorAll('input[name="workspace"]').forEach((radio) => radio.addEventListener("change", () => switchWorkspace(radio.value)));
byId("privacy-more").addEventListener("click", () => { const details = byId("privacy-details"); details.hidden = !details.hidden; byId("privacy-more").setAttribute("aria-expanded", String(!details.hidden)); });
byId("hide-values").addEventListener("change", (event) => { state().envelope.plan.preferences.hideValues = event.target.checked; document.body.classList.toggle("hide-values", event.target.checked); if (isPrivate()) scheduleSave(); });
byId("save-device").addEventListener("change", (event) => {
  if (!isPrivate()) return; const slot = activeWorkspace; const workspaceState = state(); workspaceState.envelope.plan.preferences.saveOnDevice = event.target.checked;
  if (event.target.checked) scheduleSave(); else { clearTimeout(workspaceState.saveTimer); workspaceState.saveTimer = null; try { localStorage.removeItem(workspaceStorageKey(slot)); } catch { /* memory-only remains safe */ } announce(`${workspaceNames[slot]} is memory-only · its saved browser copy was removed.`); }
});
document.querySelectorAll("[data-focus]").forEach((button) => button.addEventListener("click", () => { if (!isPrivate()) return; state().envelope.plan.selectedFocus = state().envelope.plan.selectedFocus === button.dataset.focus ? null : button.dataset.focus; scheduleSave(); renderStatus(); }));
byId("commute-target").addEventListener("change", () => { renderMap(); renderAreaDetail(); renderAreaList(); });
document.querySelectorAll("[data-map-layer]").forEach((checkbox) => checkbox.addEventListener("change", renderMap));

byId("candidate-form").addEventListener("submit", (event) => {
  event.preventDefault(); if (!isPrivate()) return;
  const candidate = { id: globalThis.crypto?.randomUUID?.() || `candidate-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: byId("candidate-label").value.trim(), areaKey: byId("candidate-area").value, housingPath: byId("candidate-path").value, status: byId("candidate-status").value, priceUsd: byId("candidate-price").value ? Number(byId("candidate-price").value) : null, url: byId("candidate-url").value.trim(), notes: byId("candidate-notes").value.trim() };
  state().envelope.plan.candidates.push(candidate);
  try { validateEnvelope(state().envelope); } catch (error) { state().envelope.plan.candidates.pop(); announce(`Candidate not added: ${error.message}`); return; }
  event.target.reset(); byId("candidate-area").value = candidate.areaKey; scheduleSave(); renderCandidates(); renderMap(); announce(`${candidate.label} added to ${workspaceNames[activeWorkspace]}.`);
});

byId("candidate-list").addEventListener("change", (event) => {
  const control = event.target; if (!isPrivate() || !control.dataset.candidateId) return; const candidate = state().envelope.plan.candidates.find((item) => item.id === control.dataset.candidateId); if (!candidate) return; const previous = candidate[control.dataset.candidateField]; let value = control.value; if (control.dataset.candidateField === "priceUsd") value = value === "" ? null : Number(value); candidate[control.dataset.candidateField] = value;
  try { validateEnvelope(state().envelope); scheduleSave(); renderMap(); } catch (error) { candidate[control.dataset.candidateField] = previous; control.value = previous ?? ""; announce(`Candidate change not kept: ${error.message}`); }
});
byId("candidate-list").addEventListener("click", (event) => { const button = event.target.closest("[data-remove-candidate]"); if (!button || !isPrivate()) return; const candidate = state().envelope.plan.candidates.find((item) => item.id === button.dataset.removeCandidate); if (!candidate || !window.confirm(`Remove “${candidate.label}” from ${workspaceNames[activeWorkspace]}?`)) return; state().envelope.plan.candidates = state().envelope.plan.candidates.filter((item) => item.id !== candidate.id); scheduleSave(); renderCandidates(); renderMap(); });

byId("roadmap-list").addEventListener("change", (event) => {
  const control = event.target; if (!isPrivate() || !control.dataset.taskId) return; const task = state().envelope.plan.roadmap.find((item) => item.id === control.dataset.taskId); if (!task) return; const previous = task[control.dataset.taskField]; task[control.dataset.taskField] = control.dataset.taskField === "durationWeeks" ? Number(control.value) : control.value;
  try { validateEnvelope(state().envelope); scheduleSave(); renderRoadmap(); renderStatus(); } catch (error) { task[control.dataset.taskField] = previous; announce(`Roadmap change not kept: ${error.message}`); renderRoadmap(); }
});
byId("roadmap-list").addEventListener("click", (event) => { const button = event.target.closest("[data-follow-target]"); if (!button || !isPrivate()) return; const task = state().envelope.plan.roadmap.find((item) => item.id === button.dataset.followTarget); task.dueDateOverride = null; scheduleSave(); renderRoadmap(); renderStatus(); });
byId("reset-roadmap").addEventListener("click", () => { if (!isPrivate() || !window.confirm(`Reset ${workspaceNames[activeWorkspace]}'s task dates, durations, owners, and statuses to the public template?`)) return; state().envelope.plan.roadmap = clone(blankPrivateEnvelope.plan.roadmap); scheduleSave(); renderRoadmap(); renderStatus(); });

byId("clear-plan").addEventListener("click", () => {
  if (!isPrivate() || !window.confirm(`Clear ${workspaceNames[activeWorkspace]}'s browser copy and replace this slot with a blank private model?`)) return; const slot = activeWorkspace; clearTimeout(state().saveTimer); try { localStorage.removeItem(workspaceStorageKey(slot)); } catch { /* already memory-only */ }
  workspaceStates[slot] = { envelope: clone(blankPrivateEnvelope), dirty: false, saveTimer: null, conflictEnvelope: null, loadedMessage: `${workspaceNames[slot]} cleared and reset to a blank memory-only model.` }; render(); announce(workspaceStates[slot].loadedMessage);
});

byId("export-plan").addEventListener("click", () => {
  if (!isPrivate() || !window.confirm(`Export ${workspaceNames[activeWorkspace]} as an unencrypted JSON file containing private estimates and candidate notes?`)) return; state().envelope.updatedAt = new Date().toISOString(); validateEnvelope(state().envelope); const blob = new Blob([JSON.stringify(state().envelope, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `oregon-move-private-${activeWorkspace}-model-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); announce(`${workspaceNames[activeWorkspace]} exported. The JSON is unencrypted.`);
});
byId("import-trigger").addEventListener("click", () => { if (isPrivate()) byId("import-file").click(); });
byId("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; event.target.value = ""; if (!file || !isPrivate()) return; const slot = activeWorkspace;
  try { if (file.size > MAX_IMPORT_BYTES) throw new RangeError("Import is larger than 1 MiB."); const text = await file.text(); const candidate = sanitizeImportedEnvelope(JSON.parse(text), blankPrivateEnvelope, file.size); const summary = `${candidate.plan.roadmap.length} tasks, ${candidate.plan.candidates.length} candidates, target ${candidate.plan.targetMoveDate}.`; if (!window.confirm(`Import into ${workspaceNames[slot]}? ${summary} Its current in-memory values will be replaced.`)) return; candidate.revision = state().envelope.revision + 1; candidate.plan.preferences.saveOnDevice = false; workspaceStates[slot] = { envelope: candidate, dirty: true, saveTimer: null, conflictEnvelope: null, loadedMessage: `${workspaceNames[slot]} imported in memory. Save locally or export after edits.` }; render(); announce(workspaceStates[slot].loadedMessage); } catch (error) { announce(`Import failed; ${workspaceNames[slot]} was not changed. ${error.message}`); }
});

window.addEventListener("storage", (event) => {
  const slot = ["mine", "partner"].find((item) => event.key === workspaceStorageKey(item)); if (!slot || !event.newValue) return;
  try { const candidate = sanitizeImportedEnvelope(JSON.parse(event.newValue), blankPrivateEnvelope, new Blob([event.newValue]).size); const workspaceState = loadWorkspace(slot); if (candidate.revision <= workspaceState.envelope.revision) return; workspaceState.conflictEnvelope = candidate; if (slot === activeWorkspace) { byId("conflict").hidden = false; announce(workspaceState.dirty ? "A newer saved copy exists. Choose which version to keep." : "A newer saved copy exists in another tab."); } else announce(`${workspaceNames[slot]} changed in another tab. Review it when you switch.`); } catch { /* invalid cross-tab data never replaces state */ }
});
byId("load-conflict").addEventListener("click", () => { if (!isPrivate() || !state().conflictEnvelope) return; state().envelope = state().conflictEnvelope; state().conflictEnvelope = null; state().dirty = false; byId("conflict").hidden = true; render(); announce("Newer saved copy loaded."); });
byId("keep-conflict").addEventListener("click", () => { if (!isPrivate() || !state().conflictEnvelope) return; state().envelope.revision = Math.max(state().envelope.revision, state().conflictEnvelope.revision) + 1; state().conflictEnvelope = null; state().dirty = true; byId("conflict").hidden = true; scheduleSave(); announce("This version was kept with a newer revision."); });
window.addEventListener("beforeunload", (event) => { const hasMemoryOnlyChanges = ["mine", "partner"].some((slot) => workspaceStates[slot]?.dirty && !workspaceStates[slot].envelope.plan.preferences.saveOnDevice); if (!hasMemoryOnlyChanges) return; event.preventDefault(); event.returnValue = ""; });
