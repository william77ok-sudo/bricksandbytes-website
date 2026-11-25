import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
// Run from the HBPD app folder: npx vite-node <this file> <output dir>
// HBPD_SRC overrides the app's src folder (forward slashes).
const R = process.env.HBPD_SRC ?? `${process.cwd().split('\\').join('/')}/src`;
const { Illustration } = await import(`${R}/components/Illustrations.tsx`);
const { InspectionIcon } = await import(`${R}/components/InspectionMarker.tsx`);
const { STAGES, PHASES } = await import(`${R}/content/stages.ts`);
const { DEMO_PROFILE, DEMO_DESCRIPTION } = await import(`${R}/content/demo.ts`);
const { assessStages, openItems } = await import(`${R}/logic/assess.ts`);
const { quickView } = await import(`${R}/logic/quick.ts`);
const { PRACTICE, EXTRA_STATEMENTS, INSPECTION_EXPLAINER } = await import(`${R}/content/practice.ts`);
const glossaryMod = await import(`${R}/content/glossary.ts`);
const { ROLE_BY_ID } = await import(`${R}/content/roles.ts`);
const sourcesMod = await import(`${R}/content/sources.ts`);

const ids = ['planning', 'party-wall', 'groundworks'];
const a = assessStages(DEMO_PROFILE);
const out: any = { DEMO_DESCRIPTION, INSPECTION_EXPLAINER, phases: PHASES, open: openItems(DEMO_PROFILE), allStages: STAGES.map((s: any) => ({ n: s.number, id: s.id, phase: s.phase, short: s.shortTitle, title: s.title })), stages: {} };
for (const id of ids) {
  const s = STAGES.find((x: any) => x.id === id);
  const q = quickView(s, {});
  out.stages[id] = { stage: s, assessment: a[id], quick: { ...q, contacts: q.contacts.map((r: any) => r.name) }, practice: PRACTICE[id], extra: EXTRA_STATEMENTS[id] ?? [], roles: s.whoInvolved.map((r: string) => ROLE_BY_ID[r].name) };
}
out.glossaryExports = Object.keys(glossaryMod);
out.sourcesExports = Object.keys(sourcesMod);
const g = Object.values(glossaryMod).find((v: any) => Array.isArray(v)) as any[];
out.glossary = g?.filter((t: any) => ids.some((id) => STAGES.find((x: any) => x.id === id).glossary.includes(t.id)));
const src = Object.values(sourcesMod).find((v: any) => Array.isArray(v)) as any[];
out.sources = src;
out.CONTENT_REVIEW_DATE = (sourcesMod as any).CONTENT_REVIEW_DATE;
writeFileSync(process.argv[2] + '/demo-data.json', JSON.stringify(out, null, 2));
writeFileSync(process.argv[2] + '/illustration.html', renderToStaticMarkup(<Illustration id="foundations-drainage" />));
writeFileSync(process.argv[2] + '/icon.html', renderToStaticMarkup(<InspectionIcon />));
console.log('ok');
