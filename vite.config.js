import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/online-exam-system/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // แยก vendor libs ออกจาก app code → cache ได้นาน + lazy loading ทำงาน
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
            if (id.includes('sweetalert2')) return 'swal';
            if (id.includes('canvas-confetti')) return 'confetti';
            return 'vendor';
          }
        },
      },
    },
  },
});
