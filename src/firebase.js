// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBvDJzI2f39XQRvU7DeGuEXJCC1ND2ToMk",
  authDomain: "community-book-exchange.firebaseapp.com",
  projectId: "community-book-exchange",
  storageBucket: "community-book-exchange.firebasestorage.app",
  messagingSenderId: "257670713323",
  appId: "1:257670713323:web:03dff0883ab594048053ae",
  measurementId: "G-QF7P2KB22C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);