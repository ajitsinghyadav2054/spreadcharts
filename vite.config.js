import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',       // Listen on ALL interfaces so cloudflared can reach it
        port: 5173,
        allowedHosts: true,    // Allow any host (Cloudflare, ngrok, etc.)
        proxy: {
            // Forward all /api/* requests to the Express backend
            '/api': {
                target: 'http://localhost:3002',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})

