import { defineConfig } from 'vite';

export default defineConfig({
    base: '/pathfinding/',
    server: {
        port: 5173,
    },
    build: {
        outDir: 'dist',
    },
});
