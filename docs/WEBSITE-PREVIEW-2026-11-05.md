# HBPD and Bytes and Bricks website preview

Prepared for review only. Do not merge into main or publish the production site without William's approval in the website conversation.

## Verified starting point
- Existing static HTML/CSS/JS repository, main at d21fbc9dd390a7cd1a3ab2e7b872f1dbf8ad3e5d; no AGENTS.md found in repository or applicable workspace parents.
- Cloudflare Pages project bricksandbytes-website serves bytesandbricks.co.uk. Production branch main, no build command; root directory is published. GitHub previews enabled for non-main branches.
- Live homepage matched repository and led with Relay.
- Existing legal/footer wording is Bytes and Bricks Studio Ltd, conflicting with the brief's Bricks and Bytes Studio Ltd. Preserved existing wording throughout. Owner must confirm actual registered name before any legal-name correction. Existing README also flags registered-office/company-number review.
- Existing contact route is /contact/ with mailto:support@bytesandbricks.co.uk. No new form, mailing list or service created. Mailbox delivery was not tested and no email sent.

## Changes
- HBPD-first homepage with clear final-private-beta status and internal detail link.
- New /products/homeowner-build-pathway/ and /products/bytes-and-bricks/ pages.
- HBPD feature copy checked against the app source: 20 stages, Quick/Detailed, checklists, terms, saved projects and print/PDF summaries. England scope and professional-support limits stated.
- Game copy based on the supplied brief, labelled in development. Three shed contracts/extension unlock described as plans, larger world as a roadmap. No playable-demo link or reward promises.
- Original code-drawn house/pathway and shed concept illustrations; explicitly labelled, not screenshots/gameplay.
- Products page features both products and removes the superseded HBPD release-window card; other portfolio material retained with historical planning context.
- Shared navigation, stronger focus/button contrast and Escape-to-close mobile menu; about copy updated to remove a stale competition reference.
- Existing Cookies anchor repaired; legal wording, contact details, Relay functions and data bindings preserved.

## Validation
- JavaScript syntax and git diff whitespace checks passed.
- Internal paths and anchors, one H1 per page, and image alt presence checked across 15 HTML pages.
- Desktop render reviewed at 1363px; home, HBPD and game detail pages inspected.
- Mobile home and HBPD reviewed in a 375px iframe viewport; no horizontal overflow. Menu opens, Escape closes it and returns focus. Mobile game review recorded separately if completed.
- Existing reduced-motion styles retained. New primary button colour checked for readable white text.
- New promotional pages contain no private beta URL, Base44 editor or repository link.
- Relay server functions and production lead collection were not exercised by submitting data; unchanged in source. Static local preview does not provide these APIs; Cloudflare preview lacks the production D1 binding.

## Remaining inputs
- Owner approval of the preview before production publication.
- Confirmation of legal company name if it should differ from the current site.
- Approved public game URL after playable-version review; until then internal concept links work.
- No approved app/game screenshots supplied; labelled original illustrations used instead.
- HBPD unapproved-email, live expiry/revocation and account-isolation checks remain a separate pending task. No beta protections or data changed here.
