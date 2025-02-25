// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";

import { getStorage, ref, uploadBytes } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  authDomain: "zen-plus-eaed2.firebaseapp.com",
  projectId: "zen-plus-eaed2",
  storageBucket: "zen-plus-eaed2.appspot.com",
  messagingSenderId: "437333940458",
  appId: "1:437333940458:web:d110ce59255ada9f5b5f93",
};

console.log("FIREBASE INIT");
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Get a reference to the storage service
const storage = getStorage();
export { db, auth, storage };
