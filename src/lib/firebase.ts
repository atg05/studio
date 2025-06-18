// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZGYBChlEvqp-EufUiXJJ8sAcqS5EuhkQ",
  authDomain: "pomodoro-together-9pail.firebaseapp.com",
  projectId: "pomodoro-together-9pail",
  storageBucket: "pomodoro-together-9pail.firebasestorage.app",
  messagingSenderId: "726114905017",
  appId: "1:726114905017:web:ba0c63b6b5cea2144fa468"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
