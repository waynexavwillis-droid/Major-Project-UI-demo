declare global {
  interface Window {
    firebase: any;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyCYE1hpoQV_QlfhQz7hlZResGuunbY1DG0",
  authDomain: "trolley-tracking-678c5.firebaseapp.com",
  databaseURL: "https://trolley-tracking-678c5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trolley-tracking-678c5",
  storageBucket: "trolley-tracking-678c5.appspot.com",
  messagingSenderId: "830477552391",
  appId: "1:830477552391:web:558930d01a8f594a3953a2"
};

const firebase = window.firebase;

if (firebase && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase ? firebase.database() : null;
