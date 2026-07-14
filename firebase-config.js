// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7mVAxmQF7jmH0FnVvFPeCLLBYF-ZVza4",
  authDomain: "nightlens-a20a0.firebaseapp.com",
  projectId: "nightlens-a20a0",
  storageBucket: "nightlens-a20a0.firebasestorage.app",
  messagingSenderId: "878491848864",
  appId: "1:878491848864:web:f7614de5f505d8217cb9c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
