const {toSiteActionLink} = require("../authActionLink");

const FIREBASE_LINK =
  "https://mere-postings-auei.firebaseapp.com/__/auth/action" +
  "?mode=verifyEmail&oobCode=abc%2B123&apiKey=AIzaKey" +
  "&continueUrl=https%3A%2F%2Fmerepostings.com&lang=en";

describe("toSiteActionLink", () => {
  it("points a verifyEmail link at our /email-verified page", () => {
    const link = new URL(toSiteActionLink(FIREBASE_LINK, "https://merepostings.com"));

    expect(link.origin + link.pathname).toBe("https://merepostings.com/email-verified");
    expect(Object.fromEntries(link.searchParams)).toEqual({
      mode: "verifyEmail",
      oobCode: "abc+123",
      apiKey: "AIzaKey",
      lang: "en",
    });
  });

  it("defaults to FRONTEND_URL and ignores a trailing slash or path on it", () => {
    expect(toSiteActionLink(FIREBASE_LINK)).toMatch(/^http:\/\/localhost:3000\/email-verified\?/);
    expect(toSiteActionLink(FIREBASE_LINK, "https://merepostings.com/"))
        .toMatch(/^https:\/\/merepostings\.com\/email-verified\?/);
  });

  it("skips params the Firebase link doesn't have", () => {
    const link = new URL(toSiteActionLink(
        "https://x.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=c",
        "https://merepostings.com",
    ));
    expect([...link.searchParams.keys()]).toEqual(["mode", "oobCode"]);
  });

  it("rejects modes we have no page for, and links without an oobCode", () => {
    expect(() => toSiteActionLink(
        "https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=c",
    )).toThrow("No page for Firebase action mode \"resetPassword\"");
    expect(() => toSiteActionLink(
        "https://x.firebaseapp.com/__/auth/action?mode=verifyEmail",
    )).toThrow("no oobCode");
  });
});
