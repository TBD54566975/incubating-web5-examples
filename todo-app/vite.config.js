import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins : [vue()],
  build   : {
    target: ['esnext'],
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: { 
        bigint: true 
      },
    }
  }, 
});
