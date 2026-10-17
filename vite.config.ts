import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const projectRoot=path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: process.env.VITE_BASE_PATH ?? '/',
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
  };
});
