//- Path: "client/vite.config.ts"
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
    base: '/react-chess-ai/',
    plugins: [
        react(),
        tailwindcss(),
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/stockfish.js/stockfish.js',
                    dest: 'stockfish',
                },
                {
                    src: 'node_modules/stockfish.js/stockfish.wasm',
                    dest: 'stockfish',
                },
            ],
        }),
    ],
});
