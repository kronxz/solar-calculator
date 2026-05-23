import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

/* PROD - original (commented) */
const firebaseConfigProd = {
  apiKey: "AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU",
  authDomain: "mf-solucoes-crm.firebaseapp.com",
  projectId: "mf-solucoes-crm",
  storageBucket: "mf-solucoes-crm.firebasestorage.app",
  messagingSenderId: "492242482187",
  appId: "1:492242482187:web:34c99a57f3b99c2260030e"
};

/* DEV - mf-solucoes-dev */
const firebaseConfig = {
  apiKey: "AIzaSyCI0FKKsy3WMcvagF2JXtChhuSxS5Y7L-0",
  authDomain: "mf-solucoes-dev.firebaseapp.com",
  projectId: "mf-solucoes-dev",
  storageBucket: "mf-solucoes-dev.firebasestorage.app",
  messagingSenderId: "431430457702",
  appId: "1:431430457702:web:6a30286e56de91ad9c50a7",
  measurementId: "G-QK81S43JLJ"
};

// Singleton pattern
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
console.log('FIREBASE APP (DEV):', app);
} else {
    app = getApp(); // if already initialized, use that one
}

const db = getFirestore(app);
const storage = getStorage(app);
let analytics = null;

try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics not initialized", e);
}

export { app, db, storage, analytics, collection, addDoc, updateDoc, doc, serverTimestamp };
