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

const db = {
  collection: jest.fn(() => collectionRef),
};

const bucketFile = {
  save: jest.fn(),
  getSignedUrl: jest.fn(),
  delete: jest.fn(),
};

const bucket = {
  file: jest.fn(() => bucketFile),
};

const storage = {bucket: jest.fn(() => bucket)};

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
}

module.exports = {db, storage, resetDbMock, __refs: {docRef, queryRef, collectionRef, bucket, bucketFile}};
