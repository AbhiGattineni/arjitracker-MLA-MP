import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    // Demo mode (npm run demo): the browser reaches the emulators through
    // these paths on the dev server, so one port is enough.
    allowedHosts: true,
    proxy: {
      '/identitytoolkit.googleapis.com': AUTH,
      '/securetoken.googleapis.com': AUTH,
      '/emulator': AUTH,
      '/google.firestore.v1.Firestore': FIRESTORE,
      '/v1/projects': FIRESTORE,
    },
  },
});
