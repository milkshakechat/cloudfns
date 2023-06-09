import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "../utils/secrets";

// Initialize Firebase
const initFirebase = async () => {
  console.log("Init firebase...");
  const firebaseConfig = await getFirebaseConfig();
  // load firebase app credentials using secretmanager
  // https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments
  const app = initializeApp(firebaseConfig);
  return app;
};

// Initialize Cloud Firestore and get a reference to the service

export default (async () => {
  const firebaseApp = await initFirebase();
  const firestore = getFirestore(firebaseApp);
  return {
    firebaseApp,
    firestore,
  };
})();
