const {buildPropertySchemaResponse} = require("../buildPropertySchemaResponse");

describe("buildPropertySchemaResponse", () => {
  const result = buildPropertySchemaResponse();

  test("lists every known property type, including aliases", () => {
    expect(result.propertyTypes).toEqual(expect.arrayContaining([
      "detached", "semiDetached", "condoApartment", "condoTownhouse",
      "rural", "residentialIncome", "stackedTownhouse", "coOperativeApartment",
    ]));
  });

  test("commonFields includes askingPrice with its path/dbKey and a JSON Schema", () => {
    const field = result.commonFields.askingPrice;
    expect(field.path).toBe("pricing");
    expect(field.dbKey).toBe("askingPrice");
    expect(field.schema.type).toBe("number");
  });

  test("commonFields.sellerEmail publishes format: 'email' (not dropped by the TLD-plausibility refine)", () => {
    expect(result.commonFields.sellerEmail.schema.format).toBe("email");
  });

  describe("residentialIncome", () => {
    const fields = result.propertyTypeFields.residentialIncome;

    test("units is a list with per-entry itemFields, not a flat set of fields", () => {
      expect(fields.units.path).toBe("unitBasics");
      expect(fields.units.schema.type).toBe("array");
      expect(fields.units.maxItems).toBe(50);
      expect(Object.keys(fields.units.itemFields)).toEqual([
        "location", "position", "bedrooms", "bathrooms", "approxSqFt", "separateEntrance", "walkOut",
      ]);
      expect(fields.units.itemFields.separateEntrance).toMatchObject({
        label: "Does this unit have a separate entrance?",
        required: true,
        requiredWhen: {anyOf: [
          {field: "position", includes: "lower_level"},
          {field: "location", in: ["lower_level"]},
        ]},
      });
    });

    test("optional fields are published as required: false", () => {
      expect(fields.idealBuyer.required).toBe(false);
      expect(fields.additionalComments.required).toBe(false);
      expect(fields.propertyHighlights.required).toBe(true);
    });

    test("options keep on-screen order and wording", () => {
      expect(fields.units.itemFields.bathrooms.options.map((o) => o.label))
          .toEqual(["1", "1.5", "2", "2.5", "3", "4+"]);
      expect(fields.garageType.options).toContainEqual({value: "built_in_underneath", label: "Built-in (underneath)"});
      expect(fields.unitCount.options[0]).toEqual({value: "duplex", label: "2 units (Duplex)"});
    });

    test("conditional, exclusive-option and hint metadata is published", () => {
      expect(fields.garageSpaces.requiredWhen).toEqual({field: "garageType", notIn: ["none"]});
      expect(fields.deckPatioBalcony.exclusiveOptions).toEqual(["none"]);
      expect(fields.heatingSystem).toMatchObject({label: "Heating System", hint: "How is the property heated?"});
      expect(fields.unitTenancies).not.toHaveProperty("hint");
      expect(fields.unitTenancies.itemFields.tenantPaidUtilities.exclusiveOptions).toEqual(["none"]);
    });

    test("input furniture (placeholder / prefix / suffix / multiline) is published as ui", () => {
      expect(fields.approxBuildingSqFt.ui).toEqual({placeholder: "e.g. 2,400", suffix: "sq ft"});
      expect(fields.unitTenancies.itemFields.monthlyRent.ui).toEqual({prefix: "$", groupTitle: "Tenant Details"});
      expect(fields.idealBuyer.ui.multiline).toBe(true);
    });

    test("sections carry the page copy, but not the internal Firestore paths", () => {
      const tenancy = result.sections.residentialIncome.find((s) => s.id === "tenancy");
      expect(tenancy).toMatchObject({
        title: "Tenancy Information",
        subtitle: "Tell us about the current occupancy and tenant details for each unit.",
        fields: ["unitTenancies"],
      });
      expect(tenancy.notice).toMatch(/^Complete the tenancy information/);
      expect(tenancy.panels.map((p) => p.type)).toEqual(["image", "info", "tips", "image"]);
      expect(tenancy.panels[0].image.src).toBe("/assets/images/create-listing/ri-building-exterior.jpg");
      expect(tenancy.panels[1].body).toMatch(/income potential/);
      expect(tenancy.panels[2].items).toHaveLength(5);
      expect(tenancy).not.toHaveProperty("paths");
    });

    test("numbered cards cover each page's fields exactly once, in order", () => {
      for (const section of result.sections.residentialIncome) {
        expect(section.groups.flatMap((g) => g.fields)).toEqual(section.fields);
      }
    });

    test("fields-less content cards pass through with an empty fields list", () => {
      const items = result.sections.residentialIncome.find((s) => s.id === "sale-items");
      expect(items.groups.at(-1)).toEqual({
        fields: [], content: {body: "We'll review your answers and prepare the appropriate listing wording."},
      });
    });

    test("an untitled card is headed by its first field's label and hint", () => {
      const utilities = result.sections.residentialIncome.find((s) => s.id === "utilities-systems");
      expect(utilities.groups[0]).toEqual({
        title: "Heating System", hint: "How is the property heated?",
        fields: ["heatingSystem"], headerField: "heatingSystem",
      });
      const exterior = result.sections.residentialIncome.find((s) => s.id === "exterior-outdoor");
      expect(exterior.groups[1]).toEqual({
        title: "Driveway & Parking", fields: ["drivewayType", "totalParkingSpaces", "parkingArrangement"],
      });
      expect(exterior.groups[2]).toMatchObject({title: "Garage", headerField: "garageType"});
    });

    test("unit lists number each entry as its own card", () => {
      expect(fields.units.ui.numberedItems).toBe(true);
      expect(fields.unitTenancies.ui.numberedItems).toBe(true);
    });

    test("the one-off sidebars are published as panels too", () => {
      const [config, unitBasics] = result.sections.residentialIncome;
      expect(config.panels.map((p) => p.type)).toEqual(["image", "highlight", "note"]);
      expect(config.panels[1].items).toContain("Year built");
      expect(unitBasics.panels[1]).toMatchObject({type: "steps", title: "How to identify each unit"});
      expect(unitBasics.panels[1].items).toHaveLength(3);
    });

    test("sidebar photos sit where the mockups draw them", () => {
      const byId = Object.fromEntries(result.sections.residentialIncome.map((s) => [s.id, s]));
      expect(byId["unit-basics"].panels[0].image.src).toBe("/assets/images/create-listing/ri-unit-layout.jpg");
      expect(byId["utilities-systems"].panels.at(-1).image.src).toBe("/assets/images/create-listing/ri-ac-units.jpg");
      expect(byId["location-nearby"].panels[0].image).toEqual({
        src: "/assets/images/create-listing/ri-waterfront-skyline.jpg",
        alt: "Waterfront path with the city skyline",
      });
    });

    test("every input says which control the mockup uses", () => {
      expect(fields.unitCount.ui.control).toBe("cards");
      expect(fields.sqFtSource.ui.control).toBe("select");
      expect(fields.fencing.ui.control).toBe("radio");
      expect(fields.nearbyAmenities.ui.control).toBe("checkboxes");
      expect(fields.units.itemFields.bathrooms.ui.control).toBe("select");
    });

    test("list fields publish their per-entry wording and mirroring", () => {
      expect(fields.units.ui).toMatchObject({itemTitle: "Unit {n}", initialItems: 2, addLabel: "Add another unit"});
      expect(fields.units.itemFields.position.ui.addedItemOptions)
          .toEqual({fromIndex: 2, values: ["front", "rear", "apartment_unit_number"]});
      expect(fields.unitTenancies.ui).toMatchObject({mirrorsListOf: "units", itemTitle: "Unit {n} – Tenancy Information"});
      expect(fields.unitTenancies.ui.notes[0].when).toEqual({field: "occupancy", in: ["vacant"]});
    });

    test("fields without extra metadata don't carry empty keys", () => {
      expect(fields.fencing).not.toHaveProperty("requiredWhen");
      expect(fields.fencing).not.toHaveProperty("itemFields");
      expect(fields.fencing).not.toHaveProperty("hint");
    });
  });

  describe("propertyTypeOptions", () => {
    test("lists the tiles in display order with slug, label and icon", () => {
      expect(result.propertyTypeOptions.map((o) => o.label)).toEqual([
        "Detached", "Semi-Detached", "Condo Apartment", "Condo Townhouse", "Rural / Acreage", "Residential Income",
      ]);
      expect(result.propertyTypeOptions.at(-1)).toMatchObject({
        value: "residentialIncome", slug: "residential-income", label: "Residential Income",
        displayName: "Residential Income Property", icon: "warehouse", legacySlugs: ["duplex-triplex"],
      });
    });

    test("every tile carries its Location & Property Type page copy", () => {
      for (const option of result.propertyTypeOptions) {
        expect(["standard", "rural", "income"]).toContain(option.detailsPage.layout);
        expect(["orange", "green", "navy"]).toContain(option.detailsPage.accent);
        expect(option.detailsPage.title).toBeTruthy();
        expect(option.detailsPage.sidebar.bullets.length).toBeGreaterThan(0);
        expect(option.detailsPage.sidebar.image.src).toMatch(/^\/assets\//);
      }
    });

    test("every tile points at a real registry type, and slugs are unique", () => {
      for (const option of result.propertyTypeOptions) {
        expect(result.propertyTypes).toContain(option.value);
      }
      const slugs = result.propertyTypeOptions.flatMap((o) => [o.slug, ...(o.legacySlugs || [])]);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  test("every property type's fields resolve to a JSON Schema (no fields silently dropped)", () => {
    for (const propertyType of result.propertyTypes) {
      const fields = result.propertyTypeFields[propertyType];
      expect(Object.keys(fields).length).toBeGreaterThan(0);
      for (const [fieldName, field] of Object.entries(fields)) {
        expect(field.schema).toBeDefined();
        expect(typeof field.path).toBe("string");
        expect(field.dbKey).toBe(fieldName);
      }
    }
  });

  test("calling buildPropertySchemaResponse() twice returns an equivalently-structured (memoized) result", () => {
    const first = buildPropertySchemaResponse();
    const second = buildPropertySchemaResponse();

    expect(second).toBe(first); // memoized: same object reference, not just deep-equal
    expect(second).toEqual(first);
  });

  test("$schema appears once at the top level, not duplicated on every field", () => {
    expect(result.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(result.commonFields.askingPrice.schema.$schema).toBeUndefined();
    expect(result.propertyTypeFields.detached.garageType.schema.$schema).toBeUndefined();
  });

  test("the cached response is deep-frozen so a caller can't mutate it and corrupt future responses", () => {
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.propertyTypes)).toBe(true);
    expect(Object.isFrozen(result.commonFields)).toBe(true);
    expect(Object.isFrozen(result.commonFields.askingPrice)).toBe(true);
    expect(Object.isFrozen(result.commonFields.askingPrice.schema)).toBe(true);

    expect(() => {
      "use strict";
      result.propertyTypes.push("fake");
    }).toThrow(TypeError);

    expect(result.propertyTypes).not.toContain("fake");
  });
});

describe("buildPropertySchemaResponse — detached", () => {
  const result = buildPropertySchemaResponse();
  const sections = result.sections.detached;
  const fields = result.propertyTypeFields.detached;

  test("publishes the stage titles and marks the final pages' stage", () => {
    expect(result.stages).toEqual({finalListing: {title: "Final Listing Information"}});
    expect(sections.filter((s) => s.stage === "finalListing").map((s) => s.id)).toEqual(["listing-remarks", "sale-items"]);
  });

  test("each page says how its cards render, matching the mockups", () => {
    expect(sections.map((s) => s.groupStyle)).toEqual(["titled", "plain", "numbered", "plain", "titled", "numberedTitle"]);
  });

  test("a titled card can still name a header field (Driveway / Does the property have a driveway?)", () => {
    const parking = sections.find((s) => s.id === "parking-outdoor");
    expect(parking.groups[0]).toMatchObject({
      title: "Driveway", hint: "Does the property have a driveway?", headerField: "hasDriveway",
    });
  });

  test("notes, tinted cards and the completion banner are published", () => {
    const basement = sections.find((s) => s.id === "basement");
    expect(basement.groups[1].variant).toBe("tinted");
    expect(basement.completeNote.title).toBe("Your basement details are complete");
    expect(sections[0].groups[2].note.style).toBe("tip");
  });

  test("the remarks page has its own button wording and colour", () => {
    const remarks = sections.find((s) => s.id === "listing-remarks");
    expect(remarks).toMatchObject({continueLabel: "Continue to What Stays & What Goes", accent: "orange"});
  });

  test("inputs carry controls, help text, icons and upload settings", () => {
    expect(fields.hasFireplace.ui).toEqual({control: "segmented", helpText: "If Yes, we'll ask for the number and type."});
    expect(fields.yardOutdoorFeatures.ui.optionIcons.pool).toBe("waves");
    expect(fields.basementBedrooms.ui).toEqual({control: "radio", inline: true});
    expect(fields.rentalItemDetails.ui.entriesFor).toBe("rentalItems");
    expect(fields.rentalItemDetails.itemFields.agreement.ui).toMatchObject({control: "file", uploadCategory: "rental_agreement"});
    expect(fields.rentalItemDetails.itemFields.detailsUnavailable.ui).toEqual({control: "checkbox", placement: "end"});
  });
});

describe("buildPropertySchemaResponse — semiDetached", () => {
  const result = buildPropertySchemaResponse();
  const sections = result.sections.semiDetached;

  test("guide panels can emphasise a closing sentence and carry a photo", () => {
    const systems = sections.find((s) => s.id === "systems-utilities");
    expect(systems.panels[0].items[2]).toEqual({
      title: "What happens later?",
      body: "We'll review visible equipment during the Verification Visit.",
      emphasis: "The visit is not a home inspection.",
    });
    expect(systems.panels[0].image).toEqual({
      src: "/assets/images/create-listing/semi-systems-utilities.jpg",
      alt: "Furnace, water heater and electrical panel",
    });
  });

  test("notes carry their own icon", () => {
    const basement = sections.find((s) => s.id === "basement");
    expect(basement.groups.at(-1).note).toMatchObject({style: "tip", icon: "cog"});
  });

  test("card hints keep the mockups' line breaks", () => {
    const inside = sections.find((s) => s.id === "inside-home");
    expect(inside.groups[1].hint).toBe("Which of these are included in the home?\nSelect all that apply.");
  });
});

describe("buildPropertySchemaResponse — rural", () => {
  const result = buildPropertySchemaResponse();
  const sections = result.sections.rural;

  test("every page has the eyebrow and the five-panel rural sidebar", () => {
    for (const section of sections) {
      expect(section.eyebrow).toBe("Rural / Acreage");
      expect(section.panels.map((p) => p.type)).toEqual(["image", "callout", "checklist", "callout", "callout"]);
      expect(section.panels.map((p) => p.tone).filter(Boolean)).toEqual(["green", "yellow", "plain"]);
    }
  });

  test("groups carry icons, tile layouts and side-by-side rows", () => {
    expect(sections[0].groups[0]).toMatchObject({title: "Property & Land Details", icon: "file-text"});
    expect(sections[4].groups.map((g) => g.layout)).toEqual(["tiles", "tiles"]);
    const rows = sections[5].groups.filter((g) => g.row === "items").map((g) => g.title);
    expect(rows).toEqual(["Chattels Included", "Fixtures Excluded", "Rented or Leased Items"]);
  });

  test("the description page ends with the notice banner and its own button label", () => {
    const description = sections[5];
    expect(description.continueLabel).toBe("Review & Continue to Payment");
    expect(description.groups.at(-1)).toEqual({
      fields: [],
      content: {
        variant: "notice",
        title: "Important:",
        body: "Items not checked above are assumed to be excluded from the sale. Please be clear to avoid " +
          "misunderstandings.",
      },
    });
  });

  test("optional fields are published as not required", () => {
    const fields = result.propertyTypeFields.rural;
    expect(fields.lotShape.required).toBe(false);
    expect(fields.acreage.required).toBe(true);
    expect(fields.outbuildings.options[0]).toEqual({value: "garage", label: "Garage"});
  });
});

describe("buildPropertySchemaResponse — condoApartment", () => {
  const result = buildPropertySchemaResponse();
  const sections = result.sections.condoApartment;

  test("every page has the eyebrow, a hero image, asterisk markers and a titled card sidebar", () => {
    for (const section of sections) {
      expect(section).toMatchObject({eyebrow: "Condo Apartment", requiredMarker: "asterisk"});
      expect(section.heroImage.alt).toEqual(expect.any(String));
      expect(section.panels).toEqual([{type: "cards", title: expect.any(String), items: expect.any(Array)}]);
      expect(section.panels[0].items).toHaveLength(3);
    }
  });

  test("trailing yes/no cards are unnumbered and headed by their question", () => {
    const amenities = sections.find((s) => s.id === "building-amenities");
    expect(amenities.groups.at(-1)).toMatchObject({
      title: "Is there another shared amenity?", headerField: "hasOtherAmenity", unnumbered: true,
    });
  });

  test("the tenancy banner only shows while the tenant remains", () => {
    const occupancy = sections.find((s) => s.id === "occupancy-tenancy");
    expect(occupancy.groups[1].note).toMatchObject({
      style: "warning", title: "Listing status: Sold with tenant remaining",
      when: {field: "tenantRemainsAfterClosing", in: [true]},
    });
  });

  test("the description page ends with its own button label and side-by-side item cards", () => {
    const description = sections.at(-1);
    expect(description.continueLabel).toBe("Review Listing Details");
    expect(description.groups.filter((g) => g.row === "items").map((g) => g.title))
        .toEqual(["Items included with the sale", "Excluded fixtures"]);
  });

  test("published fields carry labels, required flags and list item fields", () => {
    const fields = result.propertyTypeFields.condoApartment;
    expect(fields.squareFootage).toMatchObject({label: "Square footage", required: true});
    expect(fields.buildingStoreys.required).toBe(false);
    expect(fields.rentedItems.itemFields.item.options[0]).toEqual({value: "water_heater", label: "Water heater"});
    expect(fields.bedrooms.options[0]).toEqual({value: "0", label: "Studio"});
  });
});

describe("buildPropertySchemaResponse — condoTownhouse", () => {
  const result = buildPropertySchemaResponse();
  const sections = result.sections.condoTownhouse;
  const fields = result.propertyTypeFields.condoTownhouse;

  test("pages publish their condition, and fields carry it", () => {
    const bungalow = sections.find((s) => s.id === "bungalow-exterior");
    expect(bungalow.when).toEqual({field: "townhouseConfiguration", in: ["bungalow"]});
    expect(fields.bgPosition.requiredWhen).toEqual(bungalow.when);
    expect(fields.bgPosition.required).toBe(true);
  });

  test("the parking page summarises the exterior answers and totals the confirmed spaces", () => {
    const parking = sections.find((s) => s.id === "parking-locker");
    expect(parking.groups[0].content).toMatchObject({
      variant: "summary", edit: {section: "exterior-outdoor", label: "Edit exterior details"},
    });
    expect(parking.groups[1].boxes.map((b) => b.title)).toEqual(["Private garage", "Private driveway"]);
    expect(parking.groups[1].total.sum).toEqual(["garagePermittedSpaces", "drivewayPermittedSpaces"]);
  });

  test("the equipment table publishes its rows and columns", () => {
    expect(fields.bbEquipmentOwnership.options.map((o) => o.value))
        .toEqual(["furnace", "air_conditioner", "hot_water_tank", "heat_pump", "water_softener"]);
    expect(fields.bbEquipmentOwnership.ui.columns.map((c) => c.value)).toEqual(["owned", "rented", "not_present"]);
  });

  test("each flow has its own look", () => {
    expect(sections.find((s) => s.id === "exterior-outdoor")).toMatchObject({requiredMarker: "asterisk"});
    expect(sections.find((s) => s.id === "bungalow-interior").panels.map((p) => p.type))
        .toEqual(["image", "cards", "callout", "callout"]);
    expect(sections.find((s) => s.id === "b2b-condo").panels.map((p) => p.type))
        .toEqual(["image", "text", "text", "callout"]);
    expect(sections.find((s) => s.id === "corporation-fees").eyebrow).toBe("Condo Townhouse");
  });
});

describe("buildPropertySchemaResponse — pattern checks", () => {
  const result = buildPropertySchemaResponse();

  test("a regex field publishes its flags and message, which JSON Schema's `pattern` can't carry", () => {
    const phone = result.propertyTypeFields.condoApartment.managementTelephone;
    expect(phone.schema.pattern).toBeDefined();
    expect(phone.patternCheck).toEqual({flags: "i", message: "Enter a valid telephone number"});
    expect(result.propertyTypeFields.condoApartment.assessmentEndDate.patternCheck)
        .toEqual({message: "Use the format YYYY-MM"});
  });

  test("fields without a regex publish no pattern check", () => {
    expect(result.propertyTypeFields.residentialIncome.approxYearBuilt.patternCheck).toBeUndefined();
  });
});
