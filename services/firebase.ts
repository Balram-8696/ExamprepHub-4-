
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = { 
    apiKey: "AIzaSyC3LR1VwIj8S_5iv3BjB_bPZtbGHFvRWhc", 
    authDomain: "test-ee5ae.firebaseapp.com", 
    projectId: "test-ee5ae", 
    storageBucket: "test-ee5ae.appspot.com", 
    messagingSenderId: "266414136259", 
    appId: "1:266414136259:web:fe1f82d7a29e19d35d7b76" 
};

// Use the officially recommended singleton pattern for HMR environments
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };
