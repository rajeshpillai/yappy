import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
    plugins: [solidPlugin()],
    publicDir: false, // Don't copy public assets, we want a clean JS bundle
    build: {
        outDir: 'dist/player',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                player: path.resolve(__dirname, 'src/player.tsx')
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        },
        minify: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
});
