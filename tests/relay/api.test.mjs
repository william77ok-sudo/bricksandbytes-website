// Tests for the Relay Pages Functions, using node:sqlite as a stand-in for D1
// and a locally generated RSA key standing in for Cloudflare Access.
// Run from the repository root:  node --test tests/relay/api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { webcrypto } from "node:crypto";

const root = new URL("../../", import.meta.url);
const pilot = await import(new URL("functions/api/relay-pilot.js", root));
const admin = await import(new URL("functions/api/admin/relay-leads.js", root));

function d1() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("migrations/", root)).sort()) {
    db.exec(readFileSync(new URL(`migrations/${file}`, root), "utf8"));
  }
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) || null
  });
  return { db, prepare: (sql) => statement(sql) };
}

const valid = {
  name: "Test Person", email: "Test@Example.com", organisation: "", location: "Leeds, UK",
  applicant_type: "family", participant_count: 3, problem: "Handovers get lost.", consent: "yes"
};
const post = (body, headers = {}) => new Request("https://relay.test/api/relay-pilot", {
  method: "POST", headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body)
});

test("pilot: stores a valid application", async () => {
  const env = { RELAY_LEADS: d1() };
  const result = await pilot.onRequestPost({ request: post(valid), env });
  assert.equal(result.status, 201);
  const row = env.RELAY_LEADS.db.prepare("SELECT * FROM relay_pilot_leads").get();
  assert.equal(row.email, "test@example.com");
  assert.equal(row.status, "new");
});

test("pilot: duplicate within a day is not stored twice", async () => {
  const env = { RELAY_LEADS: d1() };
  await pilot.onRequestPost({ request: post(valid), env });
  const second = await pilot.onRequestPost({ request: post(valid), env });
  assert.equal(second.status, 200);
  assert.equal(env.RELAY_LEADS.db.prepare("SELECT COUNT(*) AS n FROM relay_pilot_leads").get().n, 1);
});

test("pilot: rejects bad input without crashing", async () => {
  const env = { RELAY_LEADS: d1() };
  for (const body of ["null", "[]", "not json", JSON.stringify({ ...valid, consent: "no" }), JSON.stringify({ ...valid, participant_count: 1 }), JSON.stringify({ ...valid, email: "a@b" }), JSON.stringify({ ...valid, name: { x: 1 } })]) {
    const result = await pilot.onRequestPost({ request: post(body), env });
    assert.ok([400, 422].includes(result.status), `${body} -> ${result.status}`);
    assert.ok((await result.json()).error);
  }
});

test("pilot: honeypot is accepted but discarded", async () => {
  const env = { RELAY_LEADS: d1() };
  const result = await pilot.onRequestPost({ request: post({ ...valid, website: "spam" }), env });
  assert.equal(result.status, 200);
  assert.equal(env.RELAY_LEADS.db.prepare("SELECT COUNT(*) AS n FROM relay_pilot_leads").get().n, 0);
});

test("pilot: cross-origin, oversize and missing storage", async () => {
  const env = { RELAY_LEADS: d1() };
  assert.equal((await pilot.onRequestPost({ request: post(valid, { origin: "https://evil.test" }), env })).status, 403);
  assert.equal((await pilot.onRequestPost({ request: post({ ...valid, problem: "x".repeat(20000) }), env })).status, 413);
  assert.equal((await pilot.onRequestPost({ request: post(valid), env: {} })).status, 503);
  assert.equal((await pilot.onRequest()).status, 405);
});

test("pilot: storage failure returns JSON 500", async () => {
  const broken = { prepare: () => { throw new Error("no such table"); } };
  const result = await pilot.onRequestPost({ request: post(valid), env: { RELAY_LEADS: broken } });
  assert.equal(result.status, 500);
  assert.ok((await result.json()).error);
});

// ---- Admin / Cloudflare Access ----
const team = "team.cloudflareaccess.com";
const aud = "test-aud";
const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...(await webcrypto.subtle.exportKey("jwk", publicKey)), kid: "k1", alg: "RS256" };
const b64 = (value) => Buffer.from(value).toString("base64url");
async function jwt(claims, kid = "k1") {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", kid }));
  const body = b64(JSON.stringify({ iss: `https://${team}`, aud: [aud], exp: now + 600, iat: now, email: "william@example.com", ...claims }));
  const signature = await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(signature)}`;
}
globalThis.fetch = async (url) => {
  assert.equal(String(url), `https://${team}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify({ keys: [jwk] }));
};

const adminEnv = (database = d1()) => ({ RELAY_LEADS: database, RELAY_ADMIN_EMAILS: "William@example.com, other@example.com", RELAY_ACCESS_TEAM_DOMAIN: team, RELAY_ACCESS_AUD: aud });
const get = (headers = {}) => new Request("https://relay.test/api/admin/relay-leads", { headers });

test("admin: spoofed email header alone is rejected", async () => {
  const result = await admin.onRequestGet({ request: get({ "cf-access-authenticated-user-email": "william@example.com" }), env: adminEnv() });
  assert.equal(result.status, 403);
});

test("admin: valid Access token for allowlisted email can read", async () => {
  const env = adminEnv();
  await pilot.onRequestPost({ request: post(valid), env });
  const result = await admin.onRequestGet({ request: get({ "cf-access-jwt-assertion": await jwt({}) }), env });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).leads.length, 1);
});

test("admin: token via CF_Authorization cookie also works", async () => {
  const result = await admin.onRequestGet({ request: get({ cookie: `a=b; CF_Authorization=${await jwt({})}` }), env: adminEnv() });
  assert.equal(result.status, 200);
});

test("admin: rejects wrong audience, issuer, expiry, email, signature, missing config", async () => {
  const now = Math.floor(Date.now() / 1000);
  const bad = [
    await jwt({ aud: ["other"] }),
    await jwt({ iss: "https://evil.cloudflareaccess.com" }),
    await jwt({ exp: now - 3600 }),
    await jwt({ email: "stranger@example.com" }),
    await jwt({}, "unknown-kid"),
    (await jwt({})).replace(/\.[^.]+$/, ".AAAA"),
    "garbage"
  ];
  for (const token of bad) {
    const result = await admin.onRequestGet({ request: get({ "cf-access-jwt-assertion": token }), env: adminEnv() });
    assert.equal(result.status, 403, token.slice(0, 20));
  }
  const unconfigured = { ...adminEnv(), RELAY_ACCESS_AUD: "" };
  assert.equal((await admin.onRequestGet({ request: get({ "cf-access-jwt-assertion": await jwt({}) }), env: unconfigured })).status, 403);
});

test("admin: PATCH updates status and owner, validates input", async () => {
  const env = adminEnv();
  await pilot.onRequestPost({ request: post(valid), env });
  const id = env.RELAY_LEADS.db.prepare("SELECT id FROM relay_pilot_leads").get().id;
  const token = await jwt({});
  const patch = (body, extra = {}) => new Request("https://relay.test/api/admin/relay-leads", {
    method: "PATCH", headers: { "content-type": "application/json", "cf-access-jwt-assertion": token, ...extra }, body: JSON.stringify(body)
  });
  assert.equal((await admin.onRequestPatch({ request: patch({ id, status: "reviewing", owner: "William" }), env })).status, 200);
  assert.equal(env.RELAY_LEADS.db.prepare("SELECT status FROM relay_pilot_leads").get().status, "reviewing");
  assert.equal((await admin.onRequestPatch({ request: patch({ id, status: "bogus", owner: "W" }), env })).status, 422);
  assert.equal((await admin.onRequestPatch({ request: patch({ id: "nope", status: "new", owner: "W" }), env })).status, 404);
  assert.equal((await admin.onRequestPatch({ request: patch({ id, status: "new", owner: "W" }, { origin: "https://evil.test" }), env })).status, 403);
});
