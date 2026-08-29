const {checkStepCompletion, checkViewedStepsCompletion} = require("../viewedStepsCompletion");

describe("checkStepCompletion", () => {
  test("garage step with no required fields is complete when applicable", () => {
    const result = checkStepCompletion("detached", "garage", {garage: {}});
    expect(result.applicable).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  test("contact step is incomplete when required seller fields are missing", () => {
    const result = checkStepCompletion("detached", "contact", {contact: {}});
    expect(result.applicable).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(expect.arrayContaining([
      "contact.sellerFullName",
      "contact.sellerEmail",
      "contact.sellerPhone",
      "contact.preferredContactMethod",
    ]));
  });

  test("contact step is complete when required fields are present", () => {
    const result = checkStepCompletion("detached", "contact", {
      contact: {
        sellerFullName: "Jane Doe",
        sellerEmail: "jane@example.com",
        sellerPhone: "555-1234",
        preferredContactMethod: "email",
      },
    });
    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  test("unknown path for property type is not applicable", () => {
    const result = checkStepCompletion("detached", "units", {});
    expect(result.applicable).toBe(false);
    expect(result.complete).toBe(true);
  });

  test("duplex-only path is not applicable on detached", () => {
    const result = checkStepCompletion("detached", "units", {});
    expect(result.applicable).toBe(false);
  });
});

describe("checkViewedStepsCompletion", () => {
  test("checks each viewed step", () => {
    const steps = checkViewedStepsCompletion("detached", ["garage", "contact"], {
      contact: {
        sellerFullName: "Jane Doe",
        sellerEmail: "jane@example.com",
        sellerPhone: "555-1234",
        preferredContactMethod: "email",
      },
    });
    expect(steps).toHaveLength(2);
    expect(steps.find((s) => s.stepId === "garage").complete).toBe(true);
    expect(steps.find((s) => s.stepId === "contact").complete).toBe(true);
  });
});
