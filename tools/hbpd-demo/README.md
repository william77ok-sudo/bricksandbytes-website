# HBPD public sample project

`/products/homeowner-build-pathway/demo/` is a public, no-sign-in sample of Homeowner Build Pathway. It shows three of the 20 stages for the app's existing fictional demo project, a two-storey side extension on a semi-detached house in England:

- Stage 5, Planning route
- Stage 6, Party walls
- Stage 14, Groundworks, with the inspection markers and the foundations and drainage illustration

The full app stays behind private sign-in.

## The wording comes from the app

The stage text, the tailored notes, the provenance labels, the official sources and the illustration are generated from the HBPD app's own source code. The page builds the notes from `DEMO_PROFILE` and `assessStages`, and the Quick guide from `quickView`. Do not hand-edit the wording in `index.html`. Regenerate the page instead.

To regenerate after the app's content changes:

```bash
# 1. In the HBPD app folder, extract the content to an output folder
cd ../homeowner-build-pathway
npm install
npx vite-node ../bricksandbytes-website/tools/hbpd-demo/extract.tsx <out-dir>

# 2. Build the page from that output
node ../bricksandbytes-website/tools/hbpd-demo/gen.mjs <out-dir> ../bricksandbytes-website/products/homeowner-build-pathway/demo
```

`demo.css` and `demo.js` are written by hand and are not regenerated.

## Privacy

The page sends nothing and saves nothing, apart from the Quick or Detailed choice, which is stored in the visitor's own browser. The only call to action is an email link, "Request early access", to support@bytesandbricks.co.uk. It asks visitors not to send addresses, plans or sensitive documents.
