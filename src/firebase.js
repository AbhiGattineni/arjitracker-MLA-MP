import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Demo / local mode: talk to the Firebase emulators through the dev server
// (see the proxy in vite.config.js), so it also works from a remote preview.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useEmulators ? 'demo-key' : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: useEmulators ? 'demo-arji' : import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(config.apiKey && config.projectId);

const app = isConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;

function makeDb() {
  if (!app) return null;
  if (!useEmulators) return getFirestore(app);
  connectAuthEmulator(auth, window.location.origin, { disableWarnings: true });
  return initializeFirestore(app, {
    host: window.location.host,
    ssl: window.location.protocol === 'https:',
    experimentalForceLongPolling: true,
  });
}
export const db = makeDb();
