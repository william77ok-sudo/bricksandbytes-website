const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
const STATUSES = new Set(["new", "reviewing", "qualified", "contacted", "pilot", "closed"]);
const CERT_CACHE_MS = 60 * 60 * 1000;
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

let certCache = { domain: "", keys: null, fetchedAt: 0 };

const base64UrlToBytes = (value) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};
const decodeJson = (value) => JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));

async function accessKeys(teamDomain, force = false) {
  const fresh = certCache.domain === teamDomain && certCache.keys && Date.now() - certCache.fetchedAt < CERT_CACHE_MS;
  if (fresh && !force) return certCache.keys;
  const result = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!result.ok) throw new Error(`certs ${result.status}`);
  const { keys } = await result.json();
  certCache = { domain: teamDomain, keys: keys || [], fetchedAt: Date.now() };
  return certCache.keys;
}

function accessToken(request) {
  const header = request.headers.get("cf-access-jwt-assertion");
  if (header) return header;
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? match[1] : "";
}

// Verifies the Cloudflare Access JWT (signature, issuer, audience, expiry) and returns its email,
// or "" when the request is not authenticated. Plain cf-access-* headers are never trusted on their own,
// because they can be supplied by a client when a route is reachable without passing through Access
// (for example on the *.pages.dev hostname).
async function verifiedAccessEmail(request, env) {
  const teamDomain = String(env.RELAY_ACCESS_TEAM_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const audience = String(env.RELAY_ACCESS_AUD || "").trim();
  const token = accessToken(request);
  if (!teamDomain || !audience || !token) return "";

  const parts = token.split(".");
  if (parts.length !== 3) return "";
  let header, payload;
  try { header = decodeJson(parts[0]); payload = decodeJson(parts[1]); } catch { return ""; }
  if (header.alg !== "RS256" || !header.kid) return "";

  let keys;
  try { keys = await accessKeys(teamDomain); } catch { return ""; }
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    try { keys = await accessKeys(teamDomain, true); } catch { return ""; }
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) return "";

  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return "";
  } catch {
    return "";
  }

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== `https://${teamDomain}`) return "";
  if (!audiences.includes(audience)) return "";
  if (typeof payload.exp !== "number" || payload.exp < now - 30) return "";
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) return "";
  return String(payload.email || "").toLowerCase();
}

async function authorised(request, env) {
  const allowed = String(env.RELAY_ADMIN_EMAILS || "").toLowerCase().split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowed.length) return false;
  const email = await verifiedAccessEmail(request, env);
  return Boolean(email) && allowed.includes(email);
}

export async function onRequestGet({ request, env }) {
  if (!(await authorised(request, env))) return response({ error: "Not authorised." }, 403);
  if (!env.RELAY_LEADS) return response({ error: "Lead storage is not configured." }, 503);
  try {
    const result = await env.RELAY_LEADS.prepare(`SELECT id, created_at, name, email, organisation, location,
      applicant_type, participant_count, problem, status, owner, updated_at
      FROM relay_pilot_leads ORDER BY created_at DESC LIMIT 250`).all();
    return response({ leads: result.results || [] });
  } catch (error) {
    console.error("relay-leads: read error", error && error.message);
    return response({ error: "Could not load leads." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!(await authorised(request, env))) return response({ error: "Not authorised." }, 403);
  if (!env.RELAY_LEADS) return response({ error: "Lead storage is not configured." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response({ error: "Request not allowed." }, 403);
  let body;
  try { body = await request.json(); } catch { return response({ error: "Invalid update." }, 400); }
  if (!body || typeof body !== "object") return response({ error: "Invalid update." }, 400);
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const owner = String(body.owner || "").trim().slice(0, 100);
  if (!id || !STATUSES.has(status) || !owner) return response({ error: "Choose a status and enter an owner." }, 422);
  try {
    const result = await env.RELAY_LEADS.prepare("UPDATE relay_pilot_leads SET status = ?, owner = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, owner, id).run();
    if (!result.meta?.changes) return response({ error: "Lead not found." }, 404);
  } catch (error) {
    console.error("relay-leads: update error", error && error.message);
    return response({ error: "Could not save the update." }, 500);
  }
  return response({ updated: true });
}

export function onRequest() {
  return response({ error: "Method not allowed." }, 405);
}
