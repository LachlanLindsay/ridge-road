// Turn the Vite build into one self-contained page for publishing as a claude.ai artifact:
// the script and styles are inlined, and the document skeleton is left to the host.
// Run after `vite build`: node scripts/build-artifact.mjs → dist/ridge-road.html
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(`${dist}index.html`, 'utf8');
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/)?.[1];
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)?.[1];
if (!js || !css) throw new Error('Could not find the built script and stylesheet in dist/index.html. Run vite build first.');

const script = readFileSync(`${dist}${js}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const styles = readFileSync(`${dist}${css}`, 'utf8').replace(/<\/style/gi, '<\\/style');

const page = `<title>Ridge Road</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap">
<style>${styles}</style>
<div id="app"></div>
<script type="module">${script}</script>
`;
writeFileSync(`${dist}ridge-road.html`, page);
console.log(`dist/ridge-road.html: ${(page.length / 1024).toFixed(0)} KB`);
