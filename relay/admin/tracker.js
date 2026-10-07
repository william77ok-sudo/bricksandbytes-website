const list = document.getElementById("lead-list");
const statuses = ["new", "reviewing", "qualified", "contacted", "pilot", "closed"];

async function loadLeads() {
  const response = await fetch("/api/admin/relay-leads", { headers: { accept: "application/json" } });
  if (!response.ok) {
    list.innerHTML = '<p class="form-status error">Tracker access is unavailable. Confirm Cloudflare Access and the administrator allowlist are configured.</p>';
    return;
  }
  const { leads } = await response.json();
  if (!leads.length) { list.innerHTML = "<p>No pilot applications yet.</p>"; return; }
  list.replaceChildren(...leads.map(renderLead));
}

function renderLead(lead) {
  const article = document.createElement("article");
  article.className = "lead-card";
  const heading = document.createElement("h2");
  heading.textContent = lead.name;
  const details = document.createElement("p");
  details.textContent = `${lead.email} · ${lead.applicant_type} · ${lead.location} · ${lead.participant_count} participants`;
  const problem = document.createElement("p");
  problem.textContent = lead.problem;
  const owner = document.createElement("input");
  owner.value = lead.owner;
  owner.maxLength = 100;
  owner.setAttribute("aria-label", `Owner for ${lead.name}`);
  const status = document.createElement("select");
  status.setAttribute("aria-label", `Status for ${lead.name}`);
  statuses.forEach((value) => status.add(new Option(value, value, false, value === lead.status)));
  const save = document.createElement("button");
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    save.disabled = true;
    const response = await fetch("/api/admin/relay-leads", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: lead.id, owner: owner.value, status: status.value })
    });
    save.textContent = response.ok ? "Saved" : "Try again";
    save.disabled = false;
  });
  const controls = document.createElement("div");
  controls.className = "lead-controls";
  controls.append(status, owner, save);
  article.append(heading, details, problem, controls);
  return article;
}

loadLeads();
