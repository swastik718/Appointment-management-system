import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:  import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "queue-management-32672.firebaseapp.com",
  projectId: "queue-management-32672",
  storageBucket: "queue-management-32672.firebasestorage.app",
  messagingSenderId: "791882753327",
  appId: "1:791882753327:web:4b848012cb7b9c5d922dda",
  measurementId: "G-M0DLEH2PH3"
};

// Initialize Firebase only if there's no app initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
