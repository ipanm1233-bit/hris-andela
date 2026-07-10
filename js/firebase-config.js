// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// GANTI BAGIAN INI DENGAN KODE DARI FIREBASE ANDA
const firebaseConfig = {
  apiKey: "AIzaSyAyFFFuXdnTUpxw9wW4uPKwqyeSpZNilRE",
  authDomain: "andela-hris.firebaseapp.com",
  projectId: "andela-hris",
  storageBucket: "andela-hris.firebasestorage.app",
  messagingSenderId: "504290269212",
  appId: "1:504290269212:web:830f76268842c38ad267d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
