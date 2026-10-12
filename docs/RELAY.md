# Relay — setup and launch checklist

Relay is the current product. "Kind Link" is an older name for the same idea; its separate repository/app is intentionally left in place for now.

This file contains no secrets. Note that Cloudflare Pages serves the whole repository root, so this file is publicly reachable at `/docs/RELAY.md`.

## What lives where

| Path | Purpose |
| --- | --- |
| `relay/index.html`, `relay/relay.js`, `relay/relay.css` | Fictional guided demo. State is stored only in the visitor's browser (`localStorage` key `relay-fictional-demo-v3`). |
| `relay/pilot/` | Public pilot application form. Posts JSON to `/api/relay-pilot`. |
| `relay/admin/` | Private lead tracker. The page itself holds no data; it calls `/api/admin/relay-leads`. |
| `functions/api/relay-pilot.js` | Validates and stores pilot applications in D1. |
| `functions/api/admin/relay-leads.js` | Lists and updates applications. Requires a verified Cloudflare Access token. |
| `migrations/` | D1 schema. Apply in filename order. All migrations are additive. |
| `_headers` | Security headers for `/relay/*` only. |
| `tests/relay/` | Automated checks (see below). |

## Cloudflare configuration (Pages project → Settings)

Bindings and variables. None of these are secret, but the admin email list is personal data, so set it in the dashboard rather than in the repository.

| Name | Type | Value |
| --- | --- | --- |
| `RELAY_LEADS` | D1 database binding | The Relay leads database |
| `RELAY_ADMIN_EMAILS` | Variable | Comma-separated emails allowed to use the tracker |
| `RELAY_ACCESS_TEAM_DOMAIN` | Variable | Your Zero Trust team domain, e.g. `yourteam.cloudflareaccess.com` |
| `RELAY_ACCESS_AUD` | Variable | The Application Audience (AUD) tag of the Access application below |

If any admin setting is missing, the tracker API refuses every request (fails closed).

Do not add a `wrangler.toml` to this repository without checking first: once present, it becomes the source of truth for the Pages project's bindings and can override what is set in the dashboard.

### Cloudflare Access

Create one self-hosted Access application that covers **both** paths, on **every hostname that serves the site**:

- `bytesandbricks.co.uk/relay/admin*` and `bytesandbricks.co.uk/api/admin*`
- `bricksandbytes-website.pages.dev/relay/admin*` and `bricksandbytes-website.pages.dev/api/admin*` (or enable Access for preview/`*.pages.dev` deployments)

Allow only the administrator emails. Copy the application's AUD tag into `RELAY_ACCESS_AUD`.

The API verifies the signed Access token (`Cf-Access-Jwt-Assertion` header or `CF_Authorization` cookie) against your team's public keys, and then checks the email against `RELAY_ADMIN_EMAILS`. It no longer trusts the plain `Cf-Access-Authenticated-User-Email` header, which a client can set itself on any route Access does not cover.

### Database

```sh
# Remote (production) — run deliberately, after review:
npx wrangler d1 migrations apply <database-name> --remote
```

`0002_relay_pilot_leads_email_index.sql` only adds an index. It does not change or remove data.

### Recommended (not configured in code)

- A Cloudflare rate-limiting rule on `POST /api/relay-pilot` (for example 5 requests per minute per IP). The endpoint already caps body size, rejects cross-origin posts, uses a honeypot and ignores duplicate emails within 24 hours.
- Optionally Cloudflare Turnstile on the pilot form if spam appears.

## Checks

From the repository root:

```sh
node --test tests/relay/api.test.mjs        # API + migrations (Node 22.5+, uses node:sqlite)
python3 tests/relay/browser_test.py         # demo, pilot form, admin page, mobile layout (Playwright + Chromium)
```

There is no build step; the site is static HTML, CSS and JavaScript plus Pages Functions.

## Before inviting real pilot users

- The privacy notice (`legal/privacy.html`) does not yet mention the Relay pilot application or what is stored (name, email, organisation, location, role, participant count, problem description, consent time) or how long it is kept. Update it before promoting the form.
- Decide a retention period for pilot leads.
- The demo and form must keep telling people not to enter personal or medical information until production data safeguards exist.
