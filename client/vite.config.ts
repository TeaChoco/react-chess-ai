//- Path: "client/vite.config.ts"
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
    base: '/react-chess-ai/',
    plugins: [react(), tailwindcss()],
});
