const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  connectFirestoreEmulator 
} = require("firebase/firestore");
const { 
  getStorage, 
  connectStorageEmulator 
} = require("firebase/storage");

const firebaseConfig = {
  apiKey: process.env.APIKEY,
  authDomain: process.env.AUTHDOMAIN,
  projectId: process.env.PROJECTID,
  storageBucket: process.env.STORAGEBUCKET,
  messagingSenderId: process.env.MESSAGINGSENDERID,
  appId: process.env.APPID,
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);

if (process.env.NODE_ENV === "development") {

  connectFirestoreEmulator(db, "localhost", 8090);

}

module.exports = { app, storage, db };
