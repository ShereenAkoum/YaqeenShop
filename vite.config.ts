import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages needs the repository sub-path. Local dev should open at localhost:5173/.
  base: command === 'build' ? '/YaqeenShop/' : '/',
}));
