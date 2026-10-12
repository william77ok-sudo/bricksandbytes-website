const list = document.getElementById("lead-list");
const statuses = ["new", "reviewing", "qualified", "contacted", "pilot", "closed"];
const unavailable = "Tracker access is unavailable. Confirm Cloudflare Access, the Access audience settings and the administrator allowlist are configured.";

function message(text, isError = false) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (isError) paragraph.className = "form-status error";
  list.replaceChildren(paragraph);
}

async function loadLeads() {
  let leads;
  try {
    const response = await fetch("/api/admin/relay-leads", { headers: { accept: "application/json" }, credentials: "same-origin" });
    if (!response.ok) throw new Error(String(response.status));
    ({ leads } = await response.json());
  } catch {
    message(unavailable, true);
    return;
  }
  if (!Array.isArray(leads) || !leads.length) { message("No pilot applications yet."); return; }
  list.replaceChildren(...leads.map(renderLead));
}

function renderLead(lead) {
  const article = document.createElement("article");
  article.className = "lead-card";
  const heading = document.createElement("h2");
  heading.textContent = lead.name;
  const details = document.createElement("p");
  const organisation = lead.organisation ? ` · ${lead.organisation}` : "";
  details.textContent = `${lead.email}${organisation} · ${lead.applicant_type} · ${lead.location} · ${lead.participant_count} participants · received ${lead.created_at} UTC`;
  const problem = document.createElement("p");
  problem.textContent = lead.problem;

  const owner = document.createElement("input");
  owner.value = lead.owner || "";
  owner.maxLength = 100;
  owner.setAttribute("aria-label", `Owner for ${lead.name}`);
  const status = document.createElement("select");
  status.setAttribute("aria-label", `Status for ${lead.name}`);
  statuses.forEach((value) => status.add(new Option(value, value, false, value === lead.status)));
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save";
  const feedback = document.createElement("p");
  feedback.className = "form-status";
  feedback.setAttribute("role", "status");

  save.addEventListener("click", async () => {
    save.disabled = true;
    feedback.className = "form-status";
    feedback.textContent = "Saving…";
    try {
      const response = await fetch("/api/admin/relay-leads", {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: lead.id, owner: owner.value, status: status.value })
      });
      let result = {};
      try { result = await response.json(); } catch { result = {}; }
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not save. Try again.");
      feedback.className = "form-status success";
      feedback.textContent = `Saved ${lead.name}: ${status.value}, owner ${owner.value.trim()}.`;
    } catch (error) {
      feedback.className = "form-status error";
      feedback.textContent = error instanceof TypeError ? "Could not reach the server. Try again." : error.message;
    } finally {
      save.disabled = false;
    }
  });

  const controls = document.createElement("div");
  controls.className = "lead-controls";
  controls.append(status, owner, save);
  article.append(heading, details, problem, controls, feedback);
  return article;
}

loadLeads();
