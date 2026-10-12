const storageKey = "relay-fictional-demo-v3";
const initialState = {
  status: "draft",
  taskDone: false,
  updated: "Today, 4:20 pm",
  remarks: "",
  region: "us",
  supplies: { wipes: 1, lotion: 2, cola: 6 },
  supplyUpdated: "Today, 4:35 pm"
};
const statuses = ["draft", "published", "accepted"];
const maxRemarks = 280;

// Accept only known values from storage so stale or edited data cannot break the demo.
function normalise(saved) {
  const source = saved && typeof saved === "object" ? saved : {};
  const supplies = source.supplies && typeof source.supplies === "object" ? source.supplies : {};
  return {
    ...initialState,
    status: statuses.includes(source.status) ? source.status : initialState.status,
    taskDone: source.taskDone === true,
    updated: typeof source.updated === "string" ? source.updated : initialState.updated,
    remarks: typeof source.remarks === "string" ? source.remarks.slice(0, maxRemarks) : "",
    region: source.region === "uk" ? "uk" : "us",
    supplies: {
      wipes: Number.isFinite(Number(supplies.wipes)) ? Number(supplies.wipes) : initialState.supplies.wipes,
      lotion: Number.isFinite(Number(supplies.lotion)) ? Number(supplies.lotion) : initialState.supplies.lotion,
      cola: Number.isFinite(Number(supplies.cola)) ? Number(supplies.cola) : initialState.supplies.cola
    },
    supplyUpdated: typeof source.supplyUpdated === "string" ? source.supplyUpdated : initialState.supplyUpdated
  };
}

let state = initialState;
try { state = normalise(JSON.parse(localStorage.getItem(storageKey))); } catch { state = normalise(null); }

const $ = (id) => document.getElementById(id);
const names = { sarah: ["Sarah", "SB"], tom: ["Tom", "TB"], jess: ["Jess", "JB"] };
const regions = {
  us: {
    sarah: "Activity coordinator",
    tom: "Certified nursing assistant",
    tomShort: "CNA",
    title: "A note about dementia care",
    copy: "Behavioral shifts and mood changes can be part of the dementia process. These updates are quick snapshots of the day, not medical diagnoses. Please speak with the nursing team if you have concerns."
  },
  uk: {
    sarah: "Activity coordinator",
    tom: "Care assistant",
    tomShort: "Care assistant",
    title: "A note about dementia care",
    copy: "Behavioural shifts and mood changes can be part of the dementia process. These updates are quick snapshots of the day, not medical diagnoses. Please speak with the care team if you have concerns."
  }
};
const supplySettings = {
  wipes: { maximum: 6, lowAt: 1, label: "Preferred wipes" },
  lotion: { maximum: 2, lowAt: 1, label: "Preferred lotion" },
  cola: { maximum: 24, lowAt: 6, label: "Coca-Cola" }
};

function save(next, message) {
  state = next;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  render();
  if (message) announce(message);
}

let announceTimer;
function announce(message) {
  const region = $("announcer");
  window.clearTimeout(announceTimer);
  region.textContent = "";
  announceTimer = window.setTimeout(() => { region.textContent = message; }, 50);
}

function updateStep(id, done, time) {
  const element = $(id);
  element.className = done ? "done" : "";
  element.querySelector("b").textContent = done ? "✓" : id === "shared" ? "2" : "3";
  element.querySelector("small").textContent = time;
}

function renderSupplies(observer) {
  const supplies = { ...initialState.supplies, ...(state.supplies || {}) };
  const low = [];

  Object.entries(supplySettings).forEach(([id, settings]) => {
    const count = Math.max(0, Math.min(settings.maximum, Number(supplies[id]) || 0));
    const isLow = count <= settings.lowAt;
    document.querySelector(`[data-count="${id}"]`).textContent = count;
    const level = document.querySelector(`[data-level="${id}"]`);
    level.textContent = count === 0 ? "Out of stock" : isLow ? "Running low" : "Well stocked";
    level.className = isLow ? "low" : "stocked";
    document.querySelector(`[data-supply="${id}"]`).classList.toggle("is-low", isLow);
    if (isLow) low.push(settings.label);
  });

  $("supply-alert-count").textContent = low.length ? `${low.length} running low` : "All stocked";
  $("supply-alert-count").classList.toggle("all-stocked", low.length === 0);
  $("family-supply-alert").hidden = !observer || low.length === 0;
  $("family-supply-alert-copy").textContent = `${low.join(" and ")} ${low.length === 1 ? "is" : "are"} running low.`;
  $("supply-updated").textContent = state.supplyUpdated || initialState.supplyUpdated;
  $("empty-supply-copy").textContent = `Preferred wipes: ${supplies.wipes} of 6 packages · Coca-Cola: ${supplies.cola} of 24 cans`;
  $("empty-supply-status").textContent = low.length ? `${low.length} preferred ${low.length === 1 ? "supply is" : "supplies are"} running low.` : "Preferred supplies are well stocked.";
  document.querySelectorAll(".supply-controls").forEach((controls) => { controls.hidden = observer; });
}

function render() {
  const who = $("role").value;
  const region = $("region").value;
  const [name, initials] = names[who];
  const labels = regions[region];
  const observer = who === "jess";
  const published = state.status !== "draft";
  const accepted = state.status === "accepted";
  const visible = !observer || published;

  $("greeting").textContent = `Good afternoon, ${name}.`;
  $("intro").textContent = observer ? "A simple snapshot of Anne’s day." : "A calm, clear handover for today.";
  $("avatar").textContent = initials;
  $("sarah-role").textContent = labels.sarah;
  $("tom-role").textContent = labels.tom;
  $("role").options[0].textContent = `Sarah · ${labels.sarah}`;
  $("role").options[1].textContent = `Tom · ${labels.tomShort}`;
  $("context-title").textContent = labels.title;
  $("context-copy").textContent = labels.copy;
  $("family-context").hidden = !observer;
  renderSupplies(observer);

  $("observer-empty").hidden = visible;
  $("dashboard").hidden = !visible;
  if (!visible) return;

  $("headline").textContent = state.status === "draft" ? "Ready for review" : accepted ? "Handover accepted" : "Waiting for Tom to accept";
  $("status").textContent = state.status;
  $("status").className = `status ${state.status}`;
  $("updated").textContent = state.updated;
  $("publish").hidden = !(who === "sarah" && state.status === "draft");
  $("accept").hidden = !(who === "tom" && state.status === "published");
  $("success").hidden = !accepted || observer;
  $("actions").hidden = observer;
  $("remarks-editor").hidden = observer || state.status !== "draft";
  if ($("remarks").value !== state.remarks) $("remarks").value = state.remarks;
  $("remark-count").textContent = state.remarks.length;
  $("published-remarks").hidden = !published || !state.remarks;
  $("published-remarks-copy").textContent = state.remarks;
  const chosen = state.remarks ? state.remarks.split(" · ") : [];
  document.querySelectorAll("[data-remark]").forEach((button) => button.setAttribute("aria-pressed", String(chosen.includes(button.dataset.remark))));
  $("task").checked = state.taskDone;
  $("task").disabled = observer || who !== "tom" || !accepted;
  updateStep("shared", published, published ? state.updated : "Not published yet");
  updateStep("accepted", accepted, accepted ? state.updated : "Waiting");
}

$("role").addEventListener("change", render);
$("region").addEventListener("change", (event) => save({ ...state, region: event.target.value }));
$("remarks").addEventListener("input", (event) => save({ ...state, remarks: event.target.value }));
document.querySelectorAll("[data-remark]").forEach((button) => button.addEventListener("click", () => {
  const remark = button.dataset.remark;
  const parts = state.remarks ? state.remarks.split(" · ") : [];
  const removing = parts.includes(remark);
  const remarks = removing ? parts.filter((item) => item !== remark).join(" · ") : [...parts, remark].join(" · ");
  if (remarks.length > maxRemarks) { announce(`Remarks are limited to ${maxRemarks} characters.`); return; }
  save({ ...state, remarks }, removing ? `Removed remark: ${remark}` : `Added remark: ${remark}`);
}));
$("publish").addEventListener("click", () => save({ ...state, status: "published", updated: "Just now" }, "Handover published to Tom. Waiting for Tom to accept."));
$("accept").addEventListener("click", () => save({ ...state, status: "accepted", updated: "Just now" }, "Tom accepted responsibility. This record is saved."));
$("task").addEventListener("change", (event) => save({ ...state, taskDone: event.target.checked }));
document.querySelectorAll("[data-adjust]").forEach((button) => button.addEventListener("click", () => {
  const [id, amount] = button.dataset.adjust.split(":");
  const settings = supplySettings[id];
  const current = Number((state.supplies || initialState.supplies)[id]);
  const next = Math.max(0, Math.min(settings.maximum, current + Number(amount)));
  save({ ...state, supplies: { ...initialState.supplies, ...state.supplies, [id]: next }, supplyUpdated: "Just now" }, `${settings.label}: ${next} of ${settings.maximum}.`);
}));
document.querySelectorAll("[data-restock]").forEach((button) => button.addEventListener("click", () => {
  const id = button.dataset.restock;
  save({
    ...state,
    supplies: { ...initialState.supplies, ...state.supplies, [id]: supplySettings[id].maximum },
    supplyUpdated: "Just now"
  }, `${supplySettings[id].label} restocked to ${supplySettings[id].maximum}.`);
}));
$("reset").addEventListener("click", () => {
  $("role").value = "sarah";
  $("region").value = "us";
  save(initialState, "Fictional demo reset.");
});

$("region").value = state.region;
render();
