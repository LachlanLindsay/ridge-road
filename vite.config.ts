import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// host: true listens on every interface, so a phone on the same tailnet or Wi-Fi can connect.
// allowedHosts: true accepts Tailscale MagicDNS names (my-mac or my-mac.tailnet.ts.net); the game
// serves static files only, so the dev server's host check protects nothing here.
export default defineConfig({
  plugins: [preact({ prerender: { enabled: false } })],
  base: './',
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 4173, strictPort: true, allowedHosts: true },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false },
});
