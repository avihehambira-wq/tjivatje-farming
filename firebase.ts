
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "farm-dashboard-ec4e4",
    storageBucket: "farm-dashboard-ec4e4.appspot.com",
    messagingSenderId: "666774993878",
    appId: "1:666774993878:web:3be640c66137c4d0448277"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
