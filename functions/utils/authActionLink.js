// Firebase Admin builds action links on Firebase's hosted handler
// (https://<project>.firebaseapp.com/__/auth/action?mode=...&oobCode=...).
// We send links to our own pages instead, which complete the action with the
// client SDK (applyActionCode, confirmPasswordReset, ...). Only these params
// are carried over; continueUrl is dropped because our page decides where to go.
const ACTION_PARAMS = ["mode", "oobCode", "apiKey", "lang"];

// Our page for each Firebase action. Add resetPassword here when the
// password-reset email moves off Firebase's template.
const ACTION_PAGES = {
  verifyEmail: "/email-verified",
};

/**
 * Rewrites a link from admin.auth().generate*Link() to the FE page for its mode.
 * @param {string} firebaseLink link returned by the Admin SDK
 * @param {string} [baseUrl] FE origin; FRONTEND_URL so staging links stay on staging
 * @return {string} absolute link to our page
 */
function toSiteActionLink(firebaseLink, baseUrl = process.env.FRONTEND_URL) {
  const source = new URL(firebaseLink).searchParams;
  const mode = source.get("mode");
  const page = ACTION_PAGES[mode];
  if (!page) throw new Error(`No page for Firebase action mode "${mode}"`);
  if (!source.get("oobCode")) throw new Error("Firebase action link has no oobCode");

  const target = new URL(page, baseUrl);
  for (const key of ACTION_PARAMS) {
    const value = source.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return target.toString();
}

module.exports = {toSiteActionLink};
