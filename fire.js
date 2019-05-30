// Initialize Firebase
var config = {
  apiKey: "AIzaSyCWUda-jN_N_kCbV5EnqO8ED4o0BqEQc98",
  authDomain: "messierrank.firebaseapp.com",
  databaseURL: "https://messierrank.firebaseio.com",
  projectId: "messierrank",
  storageBucket: "messierrank.appspot.com",
  messagingSenderId: "887901245951"
};
firebase.initializeApp(config);

// Annonymous Login
firebase.auth().signInAnonymously();