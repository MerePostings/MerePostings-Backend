// Manual mock for config/db.js. Chainable jest.fn()-based Firestore/Storage stand-in.
//
// Only db.collection().doc()/.where()/.orderBy() keep a stable default
// implementation (so chaining always works); the *terminal* methods
// (get/update/set/add) are left unimplemented on purpose — tests must set
// their own return value for each case. Call resetDbMock() in beforeEach to
// wipe leftover .mockResolvedValueOnce()/.mockReturnValueOnce() queues, since
// jest's global `clearMocks` option only clears call history, not queued
// mock implementations (see jest.config.js for why `restoreMocks` alone
// isn't enough here — it has no effect on plain jest.fn(), only jest.spyOn).

const docRef = {
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
};

const queryRef = {
  where: jest.fn(),
  orderBy: jest.fn(),
  get: jest.fn(),
};
queryRef.where.mockReturnValue(queryRef);
queryRef.orderBy.mockReturnValue(queryRef);

const collectionRef = {
  doc: jest.fn(() => docRef),
  add: jest.fn(),
  where: jest.fn(() => queryRef),
  orderBy: jest.fn(() => queryRef),
  get: jest.fn(),
};

const tx = {
  get: jest.fn(),
  getAll: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
};

const db = {
  collection: jest.fn(() => collectionRef),
  // Runs the callback synchronously against the shared `tx` stand-in and
  // returns whatever it returns, mirroring real Firestore's runTransaction.
  // Tests control behavior entirely via tx.get/getAll/set/update mocks.
  runTransaction: jest.fn((fn) => fn(tx)),
};

const bucketFile = {
  save: jest.fn(),
  getSignedUrl: jest.fn(),
  delete: jest.fn(),
};

// config/db.js exports `storage` as an already-bucket-scoped object
// (admin.storage().bucket()), so real callers do storage.file(...) directly —
// there is no separate .bucket() hop to mock.
const storage = {
  file: jest.fn(() => bucketFile),
};

function resetDbMock() {
  docRef.get.mockReset();
  docRef.update.mockReset();
  docRef.set.mockReset();
  collectionRef.add.mockReset();
  collectionRef.get.mockReset();
  queryRef.get.mockReset();
  bucketFile.save.mockReset();
  bucketFile.getSignedUrl.mockReset();
  bucketFile.delete.mockReset();
  storage.file.mockClear();
  tx.get.mockReset();
  tx.getAll.mockReset();
  tx.set.mockReset();
  tx.update.mockReset();
  db.runTransaction.mockClear();
  db.runTransaction.mockImplementation((fn) => fn(tx));
}

module.exports = {db, storage, resetDbMock, __refs: {docRef, queryRef, collectionRef, bucketFile, tx}};
