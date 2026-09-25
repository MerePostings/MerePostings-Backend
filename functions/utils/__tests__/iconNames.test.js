const {buildPropertySchemaResponse} = require("../buildPropertySchemaResponse");
const {lucideReactVersion, names} = require("../../data/lucideIconNames.json");

// Every `icon` value, and every value of an `optionIcons` map, anywhere in
// the schema response — with where it was found, for a readable failure.
function collectIcons(node, where, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectIcons(item, `${where}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "icon" && typeof value === "string") out.push({where, icon: value});
      else if (key === "optionIcons") {
        for (const [option, icon] of Object.entries(value)) out.push({where: `${where}.optionIcons.${option}`, icon});
      } else collectIcons(value, `${where}.${key}`, out);
    }
  }
  return out;
}

describe("icon names sent to the FE", () => {
  const icons = collectIcons(buildPropertySchemaResponse(), "schema", []);
  const known = new Set(names);

  test("the schema sends icons at all (the walk isn't silently finding nothing)", () => {
    expect(icons.length).toBeGreaterThan(100);
  });

  // The FE renders these with lucide-react's DynamicIcon, which only knows
  // kebab-case names from its own version. If this fails after a FE lucide
  // upgrade, run `npm run sync:icons` and pick a replacement for any icon
  // that was renamed or removed.
  test(`every icon exists in lucide-react ${lucideReactVersion}`, () => {
    const unknown = icons.filter(({icon}) => !known.has(icon));
    expect(unknown).toEqual([]);
  });
});
