// Generates products/homeowner-build-pathway/demo/index.html from content
// extracted from the HBPD app (demo-data.json + illustration.html).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const S = process.argv[2];
const OUT = process.argv[3];
const D = JSON.parse(readFileSync(`${S}/demo-data.json`, 'utf8'));
const ILLUSTRATION = readFileSync(`${S}/illustration.html`, 'utf8');
const ICON = readFileSync(`${S}/icon.html`, 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PROV = {
  homeowner: 'Provided by you',
  official: 'Official general guidance',
  typical: 'Typical practice',
  suggestion: 'AI-generated suggestion — not confirmed',
  confirm: 'Needs professional or authority confirmation',
  unknown: 'Unknown',
};
const NATURE = { 'general-rule': 'General rule', 'typical-practice': 'Typical practice', 'project-specific': 'Depends on your project' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const SRC = Object.fromEntries(D.sources.map((s) => [s.id, s]));
const GLOSS = Object.fromEntries(D.glossary.map((g) => [g.id, g]));
const PHASE = Object.fromEntries(D.phases.map((p) => [p.id, p]));
const SHORT = Object.fromEntries(D.allStages.map((s) => [s.n, s.short]));
const DEMO_IDS = ['planning', 'party-wall', 'groundworks'];
const DEMO_NUMS = DEMO_IDS.map((id) => D.stages[id].stage.number);

const list = (items, tag = 'ul') => `<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</${tag}>`;
const prov = (p) => `<span class="prov prov-${p}">${esc(PROV[p])}</span>`;

function statement(st) {
  const sources = st.sourceIds.map((id) => SRC[id]).filter(Boolean)
    .map((s) => `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a> <span class="src-meta">(${esc(s.publisher)} · reviewed ${esc(longDate(s.reviewedOn))})</span>`)
    .join('<br>');
  return `<li class="statement"><p class="statement-tags">${prov(st.provenance)}<span class="nature">${esc(NATURE[st.nature])}</span><span class="nature">${esc(st.jurisdiction)}</span></p>
<p>${esc(st.text)}</p>${st.confirmWith ? `<p class="confirm-with"><strong>Who confirms this:</strong> ${esc(st.confirmWith)}</p>` : ''}${sources ? `<p class="sources">Source: ${sources}</p>` : ''}</li>`;
}

function stageSection(id, idx) {
  const { stage: s, assessment: a, quick: q, practice: p = {}, extra, roles } = D.stages[id];
  const phase = PHASE[s.phase];
  const checklistId = `s${s.number}`;
  const inspection = p.inspectionChecks?.length
    ? `<section class="inspection" aria-labelledby="${checklistId}-insp-h"><h3 id="${checklistId}-insp-h">${ICON} Building control inspection check</h3>${list(p.inspectionChecks)}<p class="inspection-explainer">${esc(D.INSPECTION_EXPLAINER)}</p></section>`
    : '';
  const illustration = p.illustrations?.includes('foundations-drainage') ? `<div class="illustrations">${ILLUSTRATION}</div>` : '';
  const parallel = s.parallelWith.map((n) => `${n} (${SHORT[n]})`).join(', ');
  const glossary = s.glossary.map((g) => GLOSS[g]).filter(Boolean);

  return `
<section class="demo-stage" id="stage-${s.number}" data-stage aria-labelledby="stage-${s.number}-h">
  <header class="stage-head">
    <p class="stage-kicker">Stage ${s.number} of 20 · ${esc(phase.title)}</p>
    <h2 id="stage-${s.number}-h">${esc(s.title)}</h2>
    <p class="stage-summary">${esc(s.summary)}</p>
    <p class="relevance relevance-${a.relevance}">Likely relevant to this project</p>
  </header>

  <section class="for-project" aria-labelledby="stage-${s.number}-fp">
    <h3 id="stage-${s.number}-fp">For this project</h3>
    <ul class="notes">${a.notes.map((n) => `<li>${prov(n.provenance)}<span>${esc(n.text)}</span></li>`).join('')}</ul>
  </section>

  <div class="guide guide-quick" data-guide="quick">
    <div class="quick-grid">
      <article><h3>What it is for</h3><p>${esc(q.purpose)}</p></article>
      <article class="next-action"><h3>What to do next</h3><p data-next-action="${checklistId}">${esc(q.nextAction ?? 'All checklist items are ticked.')}</p></article>
      <article><h3>Who to contact</h3>${list(q.contacts)}</article>
      <article><h3>Essential checks</h3>${list(q.essentialChecks)}</article>
      <article class="cautions"><h3>Cautions</h3>${list(q.cautions)}</article>
    </div>
  </div>

  <div class="guide guide-detailed" data-guide="detailed">
    ${p.inPractice ? `<p class="in-practice"><strong>In practice:</strong> ${esc(p.inPractice)} ${prov('typical')}</p>` : ''}
    <div class="detail-grid">
      <article><h3>What happens</h3>${list(s.whatHappens, 'ol')}</article>
      <article><h3>Why it matters</h3><p>${esc(s.whyItMatters)}</p></article>
      <article><h3>Who is involved</h3>${list(roles)}</article>
      <article><h3>What to prepare</h3>${list(s.prepare)}</article>
      <article><h3>Decisions and documents</h3>${list(s.decisionsAndDocuments)}</article>
      <article><h3>Questions to ask</h3>${list(s.questions)}</article>
      <article class="cautions"><h3>Common mistakes</h3>${list(s.mistakes)}</article>
      <article><h3>Resolve before moving on</h3>${list(s.resolveBefore)}</article>
      <article><h3>Timing</h3><p>${esc(s.timing)}</p><p class="small"><strong>Often runs alongside:</strong> stages ${esc(parallel)}.${s.parallelNote ? ` ${esc(s.parallelNote)}` : ''}</p></article>
    </div>
    <section class="official" aria-labelledby="stage-${s.number}-off">
      <h3 id="stage-${s.number}-off">Official guidance and sources</h3>
      <ul class="statements">${[...s.regulatory, ...extra].map(statement).join('')}</ul>
    </section>
    ${glossary.length ? `<section class="terms" aria-labelledby="stage-${s.number}-terms"><h3 id="stage-${s.number}-terms">Plain-English terms</h3><dl>${glossary.map((g) => `<dt>${esc(g.term)}</dt><dd>${esc(g.plain)}</dd>`).join('')}</dl></section>` : ''}
  </div>

  ${inspection}
  ${illustration}

  <fieldset class="checklist">
    <legend>Stage ${s.number} checklist</legend>
    ${s.checklist.map((c) => `<label><input type="checkbox" data-checklist="${checklistId}" value="${esc(c.text)}"> ${esc(c.text)}</label>`).join('\n    ')}
    <p class="small">Ticks in this sample are not saved. In the full app, your answers, ticks and progress are saved on your device.</p>
  </fieldset>

  <p class="limits"><strong>What HBPD does not do:</strong> ${esc(s.limits)}</p>
  ${idx < DEMO_IDS.length - 1
    ? `<p class="stage-next"><a class="button button-ink" href="#stage-${DEMO_NUMS[idx + 1]}" data-goto="${DEMO_NUMS[idx + 1]}">Next sample stage: ${esc(D.stages[DEMO_IDS[idx + 1]].stage.shortTitle)} →</a></p>`
    : `<p class="stage-next"><a class="button button-primary" href="#early-access">Request early access →</a></p>`}
</section>`;
}

function pathway() {
  return D.phases.map((ph) => {
    const stages = D.allStages.filter((s) => s.phase === ph.id);
    return `<li class="phase"><h3>${esc(ph.title)}</h3><ol>${stages.map((s) => DEMO_NUMS.includes(s.n)
      ? `<li value="${s.n}"><a href="#stage-${s.n}" data-goto="${s.n}" class="path-demo">${esc(s.short)} <span class="path-tag">Try it</span></a></li>`
      : `<li value="${s.n}"><span class="path-locked">${esc(s.short)}</span></li>`).join('')}</ol></li>`;
  }).join('');
}

const MAILTO_BODY = [
  'Hello, I tried the HBPD sample extension and would like to request early access.',
  '',
  'These details are optional:',
  'Name: ',
  'Type of home project: ',
  'Current project stage: ',
  'Device I would use: ',
  'Email address I would like considered for access: ',
  'What I found useful, or where I would like more help: ',
  '',
  'Please do not send home addresses, plans or sensitive documents at this stage.',
  'I understand that requesting access does not guarantee it, and access requires individual approval.',
].join('\r\n');
const MAILTO = `mailto:support@bytesandbricks.co.uk?subject=${encodeURIComponent('HBPD early access request')}&body=${encodeURIComponent(MAILTO_BODY)}`;

const TITLE = 'Try a sample extension | Homeowner Build Pathway | Bytes &amp; Bricks';
const DESC = 'Try Homeowner Build Pathway with a fictional two-storey side extension in England. Explore Quick and Detailed guidance, checklists and building control inspection checks. No sign-in needed.';
const URL = 'https://bytesandbricks.co.uk/products/homeowner-build-pathway/demo/';

const html = `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title><meta name="description" content="${DESC}">
<link rel="canonical" href="${URL}"><meta property="og:url" content="${URL}"><meta name="twitter:url" content="${URL}">
<meta property="og:title" content="${TITLE}"><meta property="og:description" content="${DESC}"><meta property="og:type" content="website"><meta property="og:image" content="https://bytesandbricks.co.uk/assets/bytes-and-bricks-social.jpg"><meta property="og:image:alt" content="Bytes and Bricks studio logo"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${TITLE}"><meta name="twitter:description" content="${DESC}"><meta name="twitter:image" content="https://bytesandbricks.co.uk/assets/bytes-and-bricks-social.jpg">
<link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#031126"><link rel="stylesheet" href="/styles/main.css"><link rel="stylesheet" href="/products/homeowner-build-pathway/demo/demo.css">
</head><body data-mode="quick"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="shell nav-wrap"><a class="brand" href="/" aria-label="Bytes &amp; Bricks — AI Software Studio"><img src="/assets/icon-192.png" alt=""><span>Bytes &amp; Bricks</span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="site-nav" id="site-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/products/homeowner-build-pathway/" aria-current="page">HBPD</a><a href="/products/bytes-and-bricks/">The game</a><a href="/products/">Products</a><a href="/about/">About</a><a href="/contact/">Contact</a><a class="nav-contact" href="/relay/">Relay Demo</a></nav></div></header>
<main id="main">
<!-- Generated from the HBPD app's own content (stages, rules, demo profile, illustration). Do not hand-edit wording; regenerate when app content changes. Content review date: ${D.CONTENT_REVIEW_DATE}. -->
<section class="hero product-hero demo-hero"><div class="shell"><a class="back-link" href="/products/homeowner-build-pathway/">← Homeowner Build Pathway</a><p class="eyebrow">HBPD · Sample project</p><span class="status status-audit">Beta — improving with homeowner feedback</span><h1>Try a sample extension.</h1><p class="hero-copy">Homeowner Build Pathway helps you see what comes next in your home building project in England. Try a sample extension, explore the guidance and checklists, and tell us where you’d like more help. We’ll use feedback from early users to decide what to improve next.</p><div class="actions"><a class="button button-primary" href="#stage-${DEMO_NUMS[0]}" data-goto="${DEMO_NUMS[0]}">Start the sample</a><a class="button button-secondary" href="#early-access">Request early access</a></div><p class="availability-note">No sign-in needed. Nothing you do on this page is saved or sent anywhere.</p></div></section>

<section class="section section-white demo-intro"><div class="shell demo-intro-grid">
  <div class="sample-card">
    <p class="sample-label">Fictional example project</p>
    <h2>Two-storey side extension, semi-detached house, England</h2>
    <p>${esc(D.DEMO_DESCRIPTION)}</p>
    <h3>Still to be decided</h3>
    <ul class="notes">${D.open.map((o) => `<li>${prov(o.provenance)}<span>${esc(o.text)}</span></li>`).join('')}</ul>
    <p class="small">No real people, addresses, companies or documents. In the full app you answer these questions about your own home, and the pathway is tailored to your answers using the same rules.</p>
  </div>
  <div>
    <h2 class="pathway-title">The 20-stage pathway</h2>
    <p class="small">This sample opens three stages. The full app covers all 20, from your first household idea to completion and handover.</p>
    <ol class="pathway">${pathway()}</ol>
  </div>
</div></section>

<section class="section demo-app" aria-label="Sample stages"><div class="shell">
  <div class="demo-controls">
    <fieldset class="mode-switch">
      <legend>How much detail?</legend>
      <div class="mode-options">
        <label class="mode-option"><input type="radio" name="guide-mode" value="quick" checked><span><span class="mode-name">Quick guide</span><span class="mode-desc">The essentials: what it is for, what to do next, who to contact, key checks and cautions.</span></span></label>
        <label class="mode-option"><input type="radio" name="guide-mode" value="detailed"><span><span class="mode-name">Detailed guide</span><span class="mode-desc">Everything: full explanations, questions to ask, documents, mistakes to avoid and official sources.</span></span></label>
      </div>
    </fieldset>
    <nav class="stage-tabs" aria-label="Sample stages">${DEMO_IDS.map((id) => { const s = D.stages[id].stage; return `<a href="#stage-${s.number}" data-goto="${s.number}"><span>Stage ${s.number}</span>${esc(s.shortTitle)}</a>`; }).join('')}</nav>
  </div>
  <p class="legend-note">Every statement carries a label: ${prov('homeowner')} ${prov('official')} ${prov('typical')} ${prov('confirm')} ${prov('unknown')} — so assumptions are never presented as facts.</p>
  ${DEMO_IDS.map(stageSection).join('\n')}
</div></section>

<section class="section section-dark" id="early-access"><div class="shell split"><div><p class="eyebrow">Early access</p><h2>Want to use HBPD on your own project?</h2></div><div>
  <p class="lead">The full app covers all 20 stages, tailored to your answers about your own home.</p>
  <ul class="full-list"><li>All 20 stages, with Quick and Detailed guidance</li><li>A pathway tailored to your answers</li><li>Named projects saved on your device</li><li>A printable project summary you can save as a PDF</li></ul>
  <p>HBPD is in beta. We’re improving it based on homeowner feedback. Email us to request early access and, if you like, tell us what you found useful or where you would like more help.</p>
  <div class="actions"><a class="button button-primary" href="${esc(MAILTO)}">Request early access</a></div>
  <p class="availability-note">No configured mail app? Write to support@bytesandbricks.co.uk with the subject “HBPD early access request”. All details are optional. Please do not send home addresses, plans or sensitive documents. Access is provided only after individual approval. See our <a href="/legal/privacy.html">privacy information</a>.</p>
</div></div></section>

<section class="section"><div class="shell"><div class="notice"><strong>Guidance to support your project.</strong><p>HBPD does not replace designers, engineers, builders or Building Control. Requirements depend on your property and work; the app does not guarantee costs, permission, compliance or outcomes. Confirm requirements with the relevant professionals and authorities.</p><p>The tailored pathway currently covers England. Official sources were last reviewed on ${esc(longDate(D.CONTENT_REVIEW_DATE))}.</p></div></div></section>
</main><footer class="site-footer"><div class="shell"><div class="footer-grid"><div><img class="footer-logo" src="/assets/bytes-and-bricks-logo.webp" alt="Bytes &amp; Bricks — AI Software Studio"><p class="footer-copy">Practical AI software that turns complex information into clear business decisions.</p></div><div><p class="footer-title">Explore</p><div class="footer-links"><a href="/products/homeowner-build-pathway/">Homeowner Build Pathway</a><a href="/products/bytes-and-bricks/">Bytes and Bricks game</a><a href="/products/">All products</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/relay/">Relay demo</a></div></div><div><p class="footer-title">Legal</p><div class="footer-links"><a href="/legal/privacy.html">Privacy</a><a href="/legal/terms.html">Terms</a><a href="/legal/privacy.html#cookies">Cookies</a></div></div></div><div class="copyright"><span>© 2026 Bytes and Bricks Studio Ltd. All rights reserved.</span><span>AI Software Studio</span></div></div></footer><script src="/scripts/main.js"></script><script src="/products/homeowner-build-pathway/demo/demo.js"></script></body></html>
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, html);
console.log('written', html.length);
