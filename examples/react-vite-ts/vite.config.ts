import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Required for Hot Module Replacement inside Docker/Podman
    host: '0.0.0.0',          // listen on all interfaces (not just localhost)
    port: 5173,
    hmr: {
      host: 'localhost',       // the browser connects to localhost
      port: 5173,
    },
    watch: {
      usePolling: true,        // needed on some OSes when code is in a volume
      interval: 300,
    },
  },
});
