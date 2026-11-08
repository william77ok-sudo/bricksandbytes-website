# HBPD homepage beta enquiry preview — 8 November 2026

Prepared on the existing `website-hbpd-game-preview` branch and PR #2. Production publication requires William's approval in this chat.

## Verified configuration and preservation
- No applicable AGENTS.md found in the repository or ancestor directories. Website checkout was clean before switching to the fetched existing preview branch; HBPD source checkout was clean and was read only.
- Cloudflare API confirms GitHub source william77ok-sudo/bricksandbytes-website, production branch main, empty root/output/build settings (static root), preview setting all. Production remains main commit d21fbc9dd390a7cd1a3ab2e7b872f1dbf8ad3e5d.
- Live homepage and contact route returned HTTP 200; live contact page and repository confirm support@bytesandbricks.co.uk. No mailbox delivery test or message sent.
- Retained the prepared product pages, labelled illustrations, branding and existing Bytes and Bricks Studio Ltd wording. Relay directory and server functions match production main byte-for-byte.

## Changes
- HBPD is the primary feature with the requested headline, description, England scope and Private beta — inviting expressions of interest status. Game feature reduced to a secondary product card; its development page remains available.
- Welcoming beta enquiry section: eligible project types, 15–20-minute independent trial, optional further use during a 14-day window, and honest feedback request.
- Email CTA has the exact subject and optional fields, encoded with CRLF line breaks. Visible address and subject remain usable without JavaScript or a mail application. Copy button announces success; if Clipboard API is denied or absent, a focused, selected readonly address supports manual copying.
- Limited spaces and individual approval stated. No public registration, embedded app, owner hub, tester data, external service or private app URLs added. No HBPD permissions/authentication/data changed.
- Existing privacy notice extended narrowly for optional email enquiries. No invented fixed retention period, new form or automatic enrolment.
- Shared navigation restores Relay Demo. Mobile menu closes on nested link clicks and Escape with accurate labels and focus return. Improved eyebrow contrast on light sections.

## Feature evidence (local HBPD source at d34d281)
- src/content/stages.ts: 20 numbered stages, stage checklists and plain-English explanations.
- src/components/GuideModeSwitch.tsx: Quick and Detailed modes.
- src/screens/StageDetail.tsx and src/content/practice.ts: illustrations and inspection checks/reminders.
- src/screens/Projects.tsx and src/logic/storage.ts: separate named projects and browser-local persistence.
- src/screens/PrintSummary.tsx: browser print and inspection summary. PDF saving depends on browser print options.

## Validation
- All 15 HTML pages checked for local paths/assets/anchors, image alt attributes, duplicate IDs, single H1 and heading sequence: pass.
- Exact mailto recipient, subject, optional body fields and CRLF encoding: pass; email client launch/delivery deliberately not exercised.
- JavaScript syntax and git whitespace checks: pass. Clipboard behavior checked for correct success payload plus denied/missing API manual fallback; pass.
- Browser: desktop homepage and 375px mobile homepage reviewed; no horizontal overflow at those widths. Mobile menu Enter/Escape and visible focus return checked; copy action announces success.
- Local static preview cannot run Cloudflare lead APIs. Production Relay submissions, pilot data collection and mailbox delivery remain untested; no test email/invitation sent.

## Approval boundary
No merge to main, production deploy, authentication change or invitation is authorized by this work. Review the completed Cloudflare branch preview before approving publication.
