import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  collection,
  doc,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBL0u5Vybv4NLc7u1QHhKdYtNMnZeQRnAg",
    authDomain: "spyk-spo2.firebaseapp.com",
    projectId: "spyk-spo2",
    storageBucket: "spyk-spo2.firebasestorage.app",
    messagingSenderId: "978275538085",
    appId: "1:978275538085:web:f0f1523c87327f1895294c",
    measurementId: "G-STKLTL3X2D"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const auth = getAuth(app);
export { db, serverTimestamp };

export const userSessionsCollection = (userId) =>
  collection(db, "users", userId, "sessions");

export const sessionDoc = (userId, sessionId) =>
  doc(db, "users", userId, "sessions", sessionId);

export const sessionMetricsCollection = (userId, sessionId) =>
  collection(db, "users", userId, "sessions", sessionId, "metrics");

export default app;
