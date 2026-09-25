/**
 * Regenerates data/lucideIconNames.json — the icon names the FE's installed
 * lucide-react version can render — so utils/__tests__/iconNames.test.js can
 * check every icon the property schema sends. Re-run after upgrading
 * lucide-react in the FE:
 *
 *   npm run sync:icons [-- <path to Mere-Postings-FE>]
 *
 * Defaults to the sibling checkout ../../Mere-Postings-FE.
 */
const fs = require("fs");
const path = require("path");
const {pathToFileURL} = require("url");

async function main() {
  const feDir = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "..", "Mere-Postings-FE"));
  const lucideDir = path.join(feDir, "node_modules", "lucide-react");
  const {version} = JSON.parse(fs.readFileSync(path.join(lucideDir, "package.json"), "utf8"));
  const imports = await import(pathToFileURL(path.join(lucideDir, "dist", "esm", "dynamicIconImports.js")).href);
  const names = Object.keys(imports.default).sort();

  const out = path.join(__dirname, "..", "data", "lucideIconNames.json");
  fs.writeFileSync(out, JSON.stringify({lucideReactVersion: version, names}, null, 0) + "\n");
  console.log(`Wrote ${names.length} icon names (lucide-react ${version}) to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
