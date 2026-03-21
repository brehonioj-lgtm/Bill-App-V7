import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const cloudAvailable = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app = null;
let auth = null;
let db = null;
let currentUid = null;

if (cloudAvailable) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export async function signInCloud() {
  if (!cloudAvailable) throw new Error('Cloud not configured');
  const result = await signInAnonymously(auth);
  currentUid = result.user.uid;
  return currentUid;
}

export function subscribeToBills(uid, callback) {
  if (!cloudAvailable) return () => {};
  const ref = doc(db, 'monthlyBillsUsers', uid);
  return onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (data && Array.isArray(data.bills)) {
      callback(data.bills);
    } else {
      callback([]);
    }
  });
}

export async function saveBillsToCloud(bills) {
  if (!cloudAvailable || !currentUid) return;
  const ref = doc(db, 'monthlyBillsUsers', currentUid);
  await setDoc(ref, { bills, updatedAt: Date.now() }, { merge: true });
}

export async function getBillsFromCloud(uid) {
  if (!cloudAvailable) return [];
  const ref = doc(db, 'monthlyBillsUsers', uid);
  const snap = await getDoc(ref);
  const data = snap.data();
  return data?.bills || [];
}
