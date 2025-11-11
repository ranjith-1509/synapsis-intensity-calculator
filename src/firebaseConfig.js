import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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

export const auth = getAuth(app);
export default app;


