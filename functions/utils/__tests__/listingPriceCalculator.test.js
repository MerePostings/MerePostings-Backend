const calculateListingPrice = require("../listingPriceCalculator");
const {ADDONS_BY_ID} = require("../../data/addons");

// jest.setup.js stubs BASE_FEE_CENTS to "9900" for the whole suite.
const BASE_FEE_CENTS = 9900;

describe("calculateListingPrice", () => {
  test("returns the base fee when no addons are selected", () => {
    const result = calculateListingPrice([]);

    expect(result.totalCents).toBe(BASE_FEE_CENTS);
    expect(result.totalCAD).toBe(BASE_FEE_CENTS / 100);
  });

  test("defaults to the base fee when called with no argument", () => {
    const result = calculateListingPrice();

    expect(result.totalCents).toBe(BASE_FEE_CENTS);
  });

  test("adds a single addon's price to the base fee", () => {
    const addon = ADDONS_BY_ID.professional_photography;
    const result = calculateListingPrice([addon.id]);

    expect(result.totalCents).toBe(BASE_FEE_CENTS + addon.priceCents);
    expect(result.totalCAD).toBe((BASE_FEE_CENTS + addon.priceCents) / 100);
  });

  test("sums multiple addon prices with the base fee", () => {
    const ids = ["professional_photography", "showing_coordination"];
    const expectedCents =
      BASE_FEE_CENTS +
      ADDONS_BY_ID.professional_photography.priceCents +
      ADDONS_BY_ID.showing_coordination.priceCents;

    const result = calculateListingPrice(ids);

    expect(result.totalCents).toBe(expectedCents);
  });

  test("throws when given an unknown addon id", () => {
    expect(() => calculateListingPrice(["not_a_real_addon"])).toThrow(
        "Unknown addon id: not_a_real_addon",
    );
  });

  test("throws on the first unknown id even when other ids are valid", () => {
    expect(() =>
      calculateListingPrice(["professional_photography", "bogus_id"]),
    ).toThrow("Unknown addon id: bogus_id");
  });

  // Regression test: documents current (buggy) behavior rather than allowing
  // it to silently get worse. See CLAUDE.md / test plan findings.
  test("silently propagates NaN when BASE_FEE_CENTS is unset", () => {
    const original = process.env.BASE_FEE_CENTS;
    delete process.env.BASE_FEE_CENTS;

    const result = calculateListingPrice([]);

    expect(Number.isNaN(result.totalCents)).toBe(true);
    expect(Number.isNaN(result.totalCAD)).toBe(true);

    process.env.BASE_FEE_CENTS = original;
  });
});
