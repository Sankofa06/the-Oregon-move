import {
  MAX_IMPORT_BYTES,
  computePlan,
  daysRemaining,
  deriveTaskDueDate,
  earliestIncompleteTask,
  sanitizeImportedEnvelope,
  validateEnvelope,
} from "./model.mjs";
import { exampleEnvelope, sources } from "./public-data.mjs";

const STORAGE_KEY = "oregonMove.plan.v1";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const clone = (value) => structuredClone(value);
const byId = (id) => document.getElementById(id);

let envelope = clone(exampleEnvelope);
let planMode = "example";
let dirty = false;
let saveTimer = null;
let conflictEnvelope = null;

const fieldGroups = {
  shared: [
    ["career.householdNetIncomeMonthlyUsd", "Monthly net household income", "USD / month", "money"],
    ["career.nonHousingSpendMonthlyUsd", "Non-housing spending", "USD / month", "money"],
    ["funds.liquidUsd", "Liquid funds", "USD", "money"],
    ["funds.otherMoveFundsUsd", "Other move funds", "USD", "money"],
    ["funds.reserveFloorUsd", "Reserve floor", "USD", "money"],
    ["commonMove.movingAndTravelUsd", "Moving and travel", "USD", "money"],
  ],
  landBuild: [
    ["scenarios.landBuild.landPriceUsd", "Land price", "USD", "money"], ["scenarios.landBuild.buildBaseUsd", "Base build", "USD", "money"],
    ["scenarios.landBuild.siteWorkUsd", "Site work", "USD", "money"], ["scenarios.landBuild.designPermitDueDiligenceCashOnlyUsd", "Cash-only diligence", "USD", "money"],
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
    ["scenarios.rentFirst.petDepositUsd", "Pet deposit", "USD", "money"], ["scenarios.rentFirst.applicationAndMoveInFeesUsd", "Application and move-in fees", "USD", "money"],
    ["scenarios.rentFirst.rentersInsuranceMonthlyUsd", "Renters insurance", "USD / month", "money"], ["scenarios.rentFirst.petRentMonthlyUsd", "Pet rent", "USD / month", "money"],
    ["scenarios.rentFirst.parkingAndOtherMonthlyUsd", "Parking and other", "USD / month", "money"], ["scenarios.rentFirst.transition.oneTimeSetupUsd", "One-time setup", "USD", "money"],
    ["scenarios.rentFirst.transition.transitionMonthlyUsd", "Other transition cost", "USD / month", "money"], ["scenarios.rentFirst.transition.transitionMonths", "Transition duration", "months", "integer"],
  ],
  sale: [
    ["currentHomeSale.estimatedSalePriceUsd", "Working sale price", "USD", "money"], ["currentHomeSale.mortgagePayoffUsd", "Mortgage / lien payoff", "USD", "money"],
    ["currentHomeSale.sellingCostRate", "Selling cost", "%", "percent"], ["currentHomeSale.prepAndRepairUsd", "Preparation and repairs", "USD", "money"],
    ["currentHomeSale.sellerFixedClosingUsd", "Fixed seller costs", "USD", "money"],
  ],
};

function valueAt(path) {
  return path.split(".").reduce((value, key) => value?.[key], envelope.plan);
}

function setAt(path, value) {
  const keys = path.split(".");
  const final = keys.pop();
  const target = keys.reduce((value, key) => value[key], envelope.plan);
  target[final] = value;
}

function createField(path, labelText, unit, kind) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const id = `field-${path.replaceAll(".", "-")}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.append(document.createTextNode(`${labelText} `));
  const unitText = document.createElement("span");
  unitText.className = "unit";
  unitText.textContent = `(${unit})`;
  label.append(unitText);
  const input = document.createElement("input");
  input.id = id;
  input.type = "number";
  input.inputMode = kind === "integer" ? "numeric" : "decimal";
  input.min = kind === "integer" && labelText.includes("term") ? "1" : "0";
  input.max = kind === "percent"
    ? (labelText.includes("Mortgage") ? "30" : "100")
    : kind === "integer" ? (labelText.includes("term") ? "50" : "60") : "100000000";
  input.step = kind === "integer" ? "1" : kind === "percent" ? "0.01" : "100";
  input.dataset.modelPath = path;
  input.dataset.kind = kind;
  input.setAttribute("aria-describedby", `${id}-error`);
  const error = document.createElement("span");
  error.id = `${id}-error`;
  error.className = "error";
  wrapper.append(label, input, error);
  return wrapper;
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
    input.disabled = planMode !== "private";
  });
  document.querySelectorAll("[data-path]").forEach((input) => {
    input.value = valueAt(input.dataset.path);
    input.disabled = planMode !== "private";
  });
}

function outputText(value, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Needs input";
  return `${money.format(Math.round(value))}${suffix}`;
}

function reserveText(result) {
  if (result.cushion === null) return "Needs input";
  return result.shortfall > 0 ? `${money.format(Math.round(result.shortfall))} shortfall` : `${money.format(Math.round(result.cushion))} above floor`;
}

function runwayText(result) {
  if (result.monthsUntilReserve === null) return "Needs input";
  if (result.monthsUntilReserve === "not-depleting") return "Not depleting";
  return `${result.monthsUntilReserve.toFixed(1)} months`;
}

function renderScenarios() {
  let result;
  try {
    result = computePlan(envelope.plan);
  } catch (error) {
    byId("save-status").textContent = error.message;
    return;
  }
  for (const [key, scenario] of Object.entries(result.scenarios)) {
    const entry = document.querySelector(`[data-output="${key}.entryCash"]`);
    const committed = document.querySelector(`[data-output="${key}.committedCash"]`);
    const available = document.querySelector(`[data-output="${key}.availableFunds"]`);
    const postMove = document.querySelector(`[data-output="${key}.postMoveCash"]`);
    const monthly = document.querySelector(`[data-output="${key}.monthly"]`);
    const cushion = document.querySelector(`[data-output="${key}.cushion"]`);
    const cashFlow = document.querySelector(`[data-output="${key}.cashFlow"]`);
    const runway = document.querySelector(`[data-output="${key}.runway"]`);
    entry.textContent = outputText(scenario.entryCash);
    committed.textContent = outputText(scenario.committedCash);
    available.textContent = outputText(scenario.availableMoveFunds);
    postMove.textContent = outputText(scenario.postMoveCash);
    monthly.textContent = outputText(scenario.monthly.value, " / mo");
    cushion.textContent = reserveText(scenario);
    cashFlow.textContent = outputText(scenario.monthlyCashFlow, " / mo");
    runway.textContent = runwayText(scenario);
    const missing = document.querySelector(`[data-missing="${key}"]`);
    missing.textContent = scenario.missing.length ? `Needs input: ${scenario.missing.slice(0, 3).join(", ")}${scenario.missing.length > 3 ? "…" : ""}` : "All comparison inputs present.";
  }
  if (result.sale.netProceeds === null) {
    byId("sale-net").textContent = "Needs input";
    byId("sale-detail").textContent = `Missing: ${result.sale.missing.join(", ")}`;
  } else {
    const negative = result.sale.netProceeds < 0;
    byId("sale-net").textContent = negative ? `${money.format(Math.abs(result.sale.netProceeds))} cash needed at sale` : outputText(result.sale.netProceeds);
    byId("sale-detail").textContent = negative ? "Negative proceeds are carried into every scenario." : "Available funds include these proceeds only when the sale closes.";
  }
}

function renderStatus() {
  const remaining = daysRemaining(envelope.plan.targetMoveDate);
  byId("days-remaining").textContent = remaining < 0 ? "Target date has passed" : `${remaining.toLocaleString()} days to plan`;
  const secured = ["offer-accepted", "employed"].includes(envelope.plan.career.status);
  byId("career-note").textContent = secured ? "Verify location, start timing, benefits, and net income." : "Income is not yet secured for this move.";
  const next = earliestIncompleteTask(envelope.plan.roadmap, envelope.plan.targetMoveDate);
  byId("next-action").textContent = next?.title || "All roadmap tasks are complete.";
  byId("next-action-meta").textContent = next ? `${next.phaseId} · ${next.owner} · due ${dateFormat.format(new Date(`${next.dueDate}T00:00:00Z`))}` : "Review together and refresh dated assumptions.";
  byId("mode-label").textContent = planMode === "private" ? "Private plan" : "Illustrative example";
  byId("assumption-note").textContent = planMode === "private"
    ? "Private workspace: financial fields begin blank. Enter your own values; nothing is stored unless you turn on Save on this device."
    : "Example assumptions: 6.66% mortgage rate, 20% down, and illustrative tax, insurance, maintenance, income, cash, and current-home values. These are not quotes, a 2027 forecast, or this household’s private financials.";
  document.body.classList.toggle("private-plan", planMode === "private");
  document.body.classList.toggle("hide-values", envelope.plan.preferences.hideValues);
  byId("hide-values").checked = envelope.plan.preferences.hideValues;
  byId("save-device").disabled = planMode !== "private";
  byId("save-device").checked = planMode === "private" && envelope.plan.preferences.saveOnDevice;
  byId("start-private").disabled = planMode === "private";
  byId("export-plan").disabled = planMode !== "private";
  byId("clear-plan").disabled = planMode !== "private";
  byId("reset-roadmap").disabled = planMode !== "private";
  document.querySelectorAll("[data-focus]").forEach((button) => {
    const selected = envelope.plan.selectedFocus === button.dataset.focus;
    button.disabled = planMode !== "private";
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "Current focus" : "Set as focus";
    button.closest(".scenario-card").classList.toggle("is-focus", selected);
  });
}

function selectOption(value, text) {
  const option = document.createElement("option");
  option.value = value; option.textContent = text;
  return option;
}

function renderRoadmap() {
  const list = byId("roadmap-list");
  list.replaceChildren();
  const tasks = envelope.plan.roadmap.map((task) => ({ ...task, dueDate: deriveTaskDueDate(task, envelope.plan.targetMoveDate) })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  tasks.forEach((task) => {
    const row = document.createElement("article"); row.className = "roadmap-item";
    const due = document.createElement("time"); due.className = "roadmap-date"; due.dateTime = task.dueDate; due.textContent = dateFormat.format(new Date(`${task.dueDate}T00:00:00Z`));
    const title = document.createElement("div"); title.className = "roadmap-title"; title.textContent = task.title;
    const meta = document.createElement("small"); meta.textContent = `${task.phaseId} · ${task.scenario === "all" ? "all paths" : task.scenario}`; title.append(meta);
    const owner = document.createElement("select"); owner.setAttribute("aria-label", `Owner for ${task.title}`); owner.dataset.taskId = task.id; owner.dataset.taskField = "owner";
    [["unassigned", "Unassigned"], ["me", "Me"], ["partner", "Partner"], ["both", "Both"]].forEach(([value, text]) => owner.append(selectOption(value, text))); owner.value = task.owner;
    const status = document.createElement("select"); status.setAttribute("aria-label", `Status for ${task.title}`); status.dataset.taskId = task.id; status.dataset.taskField = "status";
    [["not-started", "Not started"], ["in-progress", "In progress"], ["blocked", "Blocked"], ["done", "Done"]].forEach(([value, text]) => status.append(selectOption(value, text))); status.value = task.status;
    owner.disabled = planMode !== "private"; status.disabled = planMode !== "private";
    row.append(due, title, owner, status); list.append(row);
  });
}

function renderSources() {
  const list = byId("source-list");
  sources.forEach((source) => {
    const item = document.createElement("article"); item.className = "source-item";
    const meta = document.createElement("span"); meta.textContent = `${source.group} · ${source.date}`;
    const link = document.createElement("a"); link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = source.label;
    const note = document.createElement("p"); note.textContent = source.note;
    item.append(meta, link, note); list.append(item);
  });
}

function render() {
  syncInputs(); renderScenarios(); renderStatus(); renderRoadmap();
}

function announce(message) { byId("save-status").textContent = message; }

function scheduleSave() {
  dirty = true;
  if (!envelope.plan.preferences.saveOnDevice) { announce("Memory-only · export to keep a portable copy."); return; }
  announce("Unsaved changes…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (planMode !== "private" || !envelope.plan.preferences.saveOnDevice) {
      announce("Memory-only · no private values were stored.");
      return;
    }
    try {
      validateEnvelope(envelope);
    } catch (error) {
      announce(`Not saved: ${error.message}`);
      return;
    }
    try {
      envelope.revision += 1; envelope.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope)); dirty = false;
      announce(`Saved on this browser at ${new Date(envelope.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch {
      envelope.plan.preferences.saveOnDevice = false;
      byId("save-device").checked = false;
      announce("Browser storage is unavailable. Your plan remains memory-only; export still works.");
    }
  }, 450);
}

function startPrivate() {
  envelope = clone(exampleEnvelope);
  for (const fields of Object.values(fieldGroups)) {
    for (const [path] of fields) {
      const keys = path.split(".");
      const final = keys.pop();
      const target = keys.reduce((value, key) => value[key], envelope.plan);
      target[final] = null;
    }
  }
  envelope.plan.household = { adults: null, children: null, dogs: null };
  envelope.updatedAt = new Date().toISOString(); envelope.mode = "private";
  planMode = "private"; dirty = true;
  announce("Blank private plan started · memory-only until you opt into saving. Enter your own financial assumptions.");
  render();
}

function readStoredPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    envelope = sanitizeImportedEnvelope(parsed, exampleEnvelope, new Blob([raw]).size);
    planMode = "private"; dirty = false;
    announce(`Saved private plan loaded from this browser.`);
  } catch {
    envelope = clone(exampleEnvelope); planMode = "example";
    announce("A saved plan could not be read. It was left untouched; import a valid export or clear it when ready.");
  }
}

function onInput(event) {
  const input = event.target;
  if (planMode !== "private") return;
  if (input.dataset.modelPath) {
    const raw = input.value.trim();
    const displayValue = raw === "" ? null : Number(raw);
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    if (displayValue !== null && (!Number.isFinite(displayValue) || displayValue < minimum || displayValue > maximum)) {
      input.setAttribute("aria-invalid", "true");
      input.nextElementSibling.textContent = `Enter a value from ${minimum} to ${maximum.toLocaleString()}.`;
      return;
    }
    let value = displayValue;
    if (input.dataset.kind === "percent" && value !== null) value /= 100;
    if (input.dataset.kind === "integer" && value !== null && !Number.isInteger(value)) {
      input.setAttribute("aria-invalid", "true"); input.nextElementSibling.textContent = "Enter a whole number."; return;
    }
    input.removeAttribute("aria-invalid"); input.nextElementSibling.textContent = ""; setAt(input.dataset.modelPath, value);
  } else if (input.dataset.path) {
    if (input.dataset.path === "targetMoveDate") {
      try {
        daysRemaining(input.value);
        input.removeAttribute("aria-invalid");
      } catch {
        input.setAttribute("aria-invalid", "true");
        byId("days-remaining").textContent = "Enter a valid target date.";
        announce("The target date is incomplete. The current plan date was kept.");
        return;
      }
    }
    setAt(input.dataset.path, input.value);
  }
  scheduleSave(); renderScenarios(); renderStatus(); if (input.dataset.path === "targetMoveDate") renderRoadmap();
}

buildForms(); renderSources(); readStoredPlan(); render();

document.addEventListener("input", onInput);
document.addEventListener("change", (event) => {
  const select = event.target;
  if (select.dataset.taskId && planMode === "private") {
    const task = envelope.plan.roadmap.find((item) => item.id === select.dataset.taskId);
    task[select.dataset.taskField] = select.value; scheduleSave(); renderStatus();
  }
});
byId("start-private").addEventListener("click", startPrivate);
byId("privacy-more").addEventListener("click", () => {
  const details = byId("privacy-details"); details.hidden = !details.hidden;
  byId("privacy-more").setAttribute("aria-expanded", String(!details.hidden));
});
byId("hide-values").addEventListener("change", (event) => {
  envelope.plan.preferences.hideValues = event.target.checked;
  document.body.classList.toggle("hide-values", event.target.checked);
  if (planMode === "private") scheduleSave();
});
byId("save-device").addEventListener("change", (event) => {
  envelope.plan.preferences.saveOnDevice = event.target.checked;
  if (event.target.checked) scheduleSave();
  else {
    clearTimeout(saveTimer); saveTimer = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* memory-only is still safe */ }
    announce("Memory-only · the saved browser copy was removed.");
  }
});
document.querySelectorAll("[data-focus]").forEach((button) => button.addEventListener("click", () => {
  if (planMode !== "private") return;
  envelope.plan.selectedFocus = envelope.plan.selectedFocus === button.dataset.focus ? null : button.dataset.focus;
  scheduleSave(); renderStatus();
}));
byId("reset-roadmap").addEventListener("click", () => {
  if (planMode !== "private" || !window.confirm("Reset roadmap owners and statuses to the public template?")) return;
  envelope.plan.roadmap = clone(exampleEnvelope.plan.roadmap); scheduleSave(); renderRoadmap(); renderStatus();
});
byId("clear-plan").addEventListener("click", () => {
  if (!window.confirm("Clear this planner's private browser copy and return to the illustrative example?")) return;
  clearTimeout(saveTimer); saveTimer = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* already memory-only */ }
  envelope = clone(exampleEnvelope); planMode = "example"; dirty = false; announce("Private plan cleared. Illustrative example restored."); render();
});
byId("export-plan").addEventListener("click", () => {
  if (planMode !== "private" || !window.confirm("Export an unencrypted JSON file containing private financial estimates? Share and store it securely.")) return;
  envelope.updatedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `oregon-move-private-plan-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  announce("Private JSON exported. The file is unencrypted.");
});
byId("import-trigger").addEventListener("click", () => byId("import-file").click());
byId("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new RangeError("Import is larger than 1 MiB.");
    const text = await file.text(); const parsed = JSON.parse(text);
    const candidate = sanitizeImportedEnvelope(parsed, exampleEnvelope, file.size); validateEnvelope(candidate);
    const summary = `${candidate.plan.roadmap.length} roadmap tasks; target ${candidate.plan.targetMoveDate}; ${candidate.plan.destinationFocus} focus.`;
    if (!window.confirm(`Import this private plan? ${summary} Your current in-memory values will be replaced.`)) return;
    envelope = candidate; planMode = "private"; dirty = true; envelope.plan.preferences.saveOnDevice = false;
    announce("Private plan imported in memory. Opt into device saving or export it after edits."); render();
  } catch (error) { announce(`Import failed; current plan was not changed. ${error.message}`); }
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue || planMode !== "private") return;
  try {
    const candidate = sanitizeImportedEnvelope(JSON.parse(event.newValue), exampleEnvelope, new Blob([event.newValue]).size);
    if (candidate.revision <= envelope.revision) return;
    conflictEnvelope = candidate; byId("conflict").hidden = false;
    announce(dirty ? "A newer saved copy exists. Choose which version to keep." : "A newer saved copy exists in another tab.");
  } catch { /* invalid cross-tab data never replaces state */ }
});
byId("load-conflict").addEventListener("click", () => {
  if (!conflictEnvelope) return; envelope = conflictEnvelope; conflictEnvelope = null; dirty = false; byId("conflict").hidden = true; announce("Newer saved copy loaded."); render();
});
byId("keep-conflict").addEventListener("click", () => { conflictEnvelope = null; byId("conflict").hidden = true; dirty = true; announce("This tab kept its values. Save again to make it the device copy."); });
