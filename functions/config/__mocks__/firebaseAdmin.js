// Manual mock for config/firebaseAdmin.js. The real module exports the
// `admin` object directly (module.exports = admin), so this mirrors that
// shape rather than wrapping it. Only auth().verifyIdToken is used anywhere
// in the codebase that this test suite touches.

const verifyIdToken = jest.fn();
const auth = jest.fn(() => ({verifyIdToken}));

module.exports = {auth, __refs: {verifyIdToken}};
