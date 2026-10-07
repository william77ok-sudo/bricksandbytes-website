const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const STATUSES = new Set(["new", "reviewing", "qualified", "contacted", "pilot", "closed"]);
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function authorised(request, env) {
  const identity = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  const allowed = String(env.RELAY_ADMIN_EMAILS || "").toLowerCase().split(",").map((value) => value.trim()).filter(Boolean);
  return identity && allowed.includes(identity);
}

export async function onRequestGet({ request, env }) {
  if (!authorised(request, env)) return response({ error: "Not authorised." }, 403);
  if (!env.RELAY_LEADS) return response({ error: "Lead storage is not configured." }, 503);
  const result = await env.RELAY_LEADS.prepare(`SELECT id, created_at, name, email, organisation, location,
    applicant_type, participant_count, problem, status, owner, updated_at
    FROM relay_pilot_leads ORDER BY created_at DESC LIMIT 250`).all();
  return response({ leads: result.results || [] });
}

export async function onRequestPatch({ request, env }) {
  if (!authorised(request, env)) return response({ error: "Not authorised." }, 403);
  if (!env.RELAY_LEADS) return response({ error: "Lead storage is not configured." }, 503);
  let body;
  try { body = await request.json(); } catch { return response({ error: "Invalid update." }, 400); }
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const owner = String(body.owner || "").trim().slice(0, 100);
  if (!id || !STATUSES.has(status) || !owner) return response({ error: "Invalid status update." }, 422);
  const result = await env.RELAY_LEADS.prepare("UPDATE relay_pilot_leads SET status = ?, owner = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(status, owner, id).run();
  if (!result.meta?.changes) return response({ error: "Lead not found." }, 404);
  return response({ updated: true });
}

export function onRequest() {
  return response({ error: "Method not allowed." }, 405);
}
