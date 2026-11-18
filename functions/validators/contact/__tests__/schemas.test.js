const {contactInquirySchema, CONTACT_TOPICS} = require("../schemas");

describe("contactInquirySchema", () => {
  const valid = {name: "Jane Doe", email: "jane@example.com", topic: "My listing", message: "Hello"};

  test("accepts a valid inquiry and trims it", () => {
    const result = contactInquirySchema.safeParse({...valid, name: " Jane Doe ", message: " Hello \n"});
    expect(result.success).toBe(true);
    expect(result.data).toEqual(valid);
  });

  test("offers the Contact us page's topics", () => {
    expect(CONTACT_TOPICS).toContain("Other");
    for (const topic of CONTACT_TOPICS) {
      expect(contactInquirySchema.safeParse({...valid, topic}).success).toBe(true);
    }
  });

  test.each([
    ["a missing name", {name: " "}],
    ["a bad email", {email: "jane"}],
    ["an unknown topic", {topic: "Free money"}],
    ["an empty message", {message: ""}],
    ["a message over 5000 characters", {message: "x".repeat(5001)}],
    ["a name over 200 characters", {name: "x".repeat(201)}],
  ])("rejects %s", (_label, change) => {
    expect(contactInquirySchema.safeParse({...valid, ...change}).success).toBe(false);
  });

  test("rejects unknown fields from the old forms", () => {
    expect(contactInquirySchema.safeParse({...valid, phone: "416"}).success).toBe(false);
  });
});
