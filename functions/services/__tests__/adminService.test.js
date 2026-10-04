jest.mock("../../config/db");

const {__refs: dbRefs, resetDbMock} = require("../../config/db");
const adminService = require("../adminService");

describe("adminService.getListingCompleteness", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(adminService.getListingCompleteness("listing-1")).rejects.toMatchObject({statusCode: 404});
  });

  test("runs the checkout check against the registry key for the stored slug", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({propertyType: "semi-detached", exteriorLot: {homeStyle: "bungalow"}}),
    });

    const result = await adminService.getListingCompleteness("listing-1");

    expect(result.propertyType).toBe("semiDetached");
    expect(result.checked).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.problems.find((p) => p.field === "homeStyle")).toBeUndefined();
    expect(result.problems.find((p) => p.field === "numberOfStoreys")).toMatchObject({section: "exterior-lot"});
  });
});
