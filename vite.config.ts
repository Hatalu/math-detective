import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' + HashRouter = works under any GitHub Pages repo path
export default defineConfig({ plugins: [react()], base: './' });
