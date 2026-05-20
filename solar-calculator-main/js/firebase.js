import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuração do Firebase da MF Soluções
const firebaseConfig = {
  apiKey: "AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU",
  authDomain: "mf-solucoes-crm.firebaseapp.com",
  projectId: "mf-solucoes-crm",
  storageBucket: "mf-solucoes-crm.firebasestorage.app",
  messagingSenderId: "492242482187",
  appId: "1:492242482187:web:34c99a57f3b99c2260030e"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase falhou ao inicializar: ", e);
}

export { app, db, collection, addDoc, updateDoc, doc, serverTimestamp };
