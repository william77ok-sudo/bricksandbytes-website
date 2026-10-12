const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const TYPES = new Set(["family", "independent-caregiver", "care-organisation", "other"]);
const MAX_BODY_BYTES = 10_000;

const clean = (value, maximum) => (typeof value === "string" || typeof value === "number" ? String(value) : "").trim().slice(0, maximum);
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export async function onRequestPost({ request, env }) {
  if (!env.RELAY_LEADS) return response({ error: "Applications are temporarily unavailable." }, 503);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response({ error: "Request not allowed." }, 403);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return response({ error: "Application is too large." }, 413);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return response({ error: "Application is too large." }, 413);
    body = JSON.parse(text);
  } catch {
    return response({ error: "Invalid application." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return response({ error: "Invalid application." }, 400);

  // Honeypot: quietly accept and discard bot submissions.
  if (body.website) return response({ received: true });

  const lead = {
    id: crypto.randomUUID(),
    name: clean(body.name, 100),
    email: clean(body.email, 160).toLowerCase(),
    organisation: clean(body.organisation, 120),
    location: clean(body.location, 100),
    applicantType: clean(body.applicant_type, 40),
    participantCount: Number(body.participant_count),
    problem: clean(body.problem, 800),
    consent: body.consent === "yes"
  };

  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || !lead.location || !TYPES.has(lead.applicantType) || !Number.isInteger(lead.participantCount) || lead.participantCount < 2 || lead.participantCount > 1000 || !lead.problem || !lead.consent) {
    return response({ error: "Please complete every required field." }, 422);
  }

  try {
    // Avoid duplicate rows when someone resubmits the same email within a day.
    const existing = await env.RELAY_LEADS.prepare(
      "SELECT id FROM relay_pilot_leads WHERE email = ? AND created_at > datetime('now', '-1 day') LIMIT 1"
    ).bind(lead.email).first();
    if (existing) return response({ received: true, application_id: existing.id }, 200);

    await env.RELAY_LEADS.prepare(`INSERT INTO relay_pilot_leads
      (id, created_at, name, email, organisation, location, applicant_type, participant_count, problem, consent_at, status, owner)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'new', 'Unassigned')`)
      .bind(lead.id, lead.name, lead.email, lead.organisation, lead.location, lead.applicantType, lead.participantCount, lead.problem)
      .run();
  } catch (error) {
    console.error("relay-pilot: storage error", error && error.message);
    return response({ error: "We could not save your application. Please try again later." }, 500);
  }

  return response({ received: true, application_id: lead.id }, 201);
}

export function onRequest() {
  return response({ error: "Method not allowed." }, 405);
}
