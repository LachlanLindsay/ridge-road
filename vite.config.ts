import { execSync } from 'node:child_process';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

/** The build's name for feedback reports: date and commit, "+" if the tree had changes. */
function buildId(): string {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const git = (cmd: string) => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return `${day}.${git('git rev-parse --short HEAD')}${git('git status --porcelain') ? '+' : ''}`;
  } catch {
    return day;
  }
}

// host: true listens on every interface, so a phone on the same tailnet or Wi-Fi can connect.
// allowedHosts: true accepts Tailscale MagicDNS names (my-mac or my-mac.tailnet.ts.net); the game
// serves static files only, so the dev server's host check protects nothing here.
export default defineConfig({
  plugins: [preact({ prerender: { enabled: false } })],
  base: './',
  define: { __BUILD__: JSON.stringify(buildId()) },
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 4173, strictPort: true, allowedHosts: true },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false },
});
