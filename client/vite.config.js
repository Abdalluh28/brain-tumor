import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // @react-pdf/renderer depends on Node built-ins (zlib, stream) in the browser bundle
        nodePolyfills({
            include: ["stream", "zlib", "util", "buffer"],
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    server: {
        proxy: {
            "/uploads": {
                target: process.env.VITE_PROXY_TARGET || "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
});
