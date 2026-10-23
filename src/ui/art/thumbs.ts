// Journal thumbnails as small pictures: each plate is drawn once, off screen, at thumbnail size, and
// the picture is reused wherever that card shows. A plate's full drawing can run to half a megabyte
// of path data; the picture is a few kilobytes, and the Country plate's five cards share one.
import type { Scene } from './compose';

/** The theme the colours were read under: a new theme draws the pictures again. */
export function themeKey(): string {
  try {
    const cs = getComputedStyle(document.documentElement);
    return `${cs.getPropertyValue('--paper').trim()}/${cs.getPropertyValue('--art-0').trim()}/${document.documentElement.dataset.theme ?? ''}`;
  } catch {
    return '';
  }
}

interface Ink {
  fill: string;
  stroke: string;
  opacity: string;
}

/** The colours the stylesheet gives each mark class, read from a hidden probe in the page. */
const inkCache = new Map<string, Map<string, Ink>>();
function inks(classes: string[], theme: string): Map<string, Ink> {
  let known = inkCache.get(theme);
  if (!known) {
    known = new Map();
    inkCache.set(theme, known);
  }
  const missing = classes.filter((c) => !known!.has(c));
  if (missing.length) {
    const NS = 'http://www.w3.org/2000/svg';
    const probe = document.createElementNS(NS, 'svg');
    probe.setAttribute('class', 'art');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    const paths = missing.map((c) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', c);
      probe.appendChild(p);
      return p;
    });
    document.body.appendChild(probe);
    missing.forEach((c, i) => {
      const cs = getComputedStyle(paths[i]!);
      known!.set(c, { fill: cs.fill, stroke: cs.stroke, opacity: cs.opacity });
    });
    probe.remove();
  }
  return known;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The plate as a self-contained SVG document, its colours written in. */
export function thumbSvg(scene: Scene, view: readonly [number, number, number, number] | undefined, w: number, h: number, ink: Map<string, Ink>): string {
  const vb = view ? view.join(' ') : `0 0 ${scene.w} ${scene.h}`;
  const body = scene.marks
    .map((mk) => {
      const i = ink.get(mk.c);
      const attrs = [`d="${esc(mk.d)}"`, `fill="${esc(i?.fill ?? 'none')}"`, `stroke="${esc(i?.stroke ?? 'none')}"`];
      if (mk.w !== undefined) attrs.push(`stroke-width="${mk.w}"`);
      if (i && i.opacity !== '1') attrs.push(`opacity="${esc(i.opacity)}"`);
      return `<path ${attrs.join(' ')}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const LIMIT = 48;
const pictures = new Map<string, Promise<string>>();

/** The picture for `key`, drawing it from `make` the first time. */
export function thumbPicture(key: string, make: () => { scene: Scene; view?: readonly [number, number, number, number] } | null, w: number, h: number, theme: string): Promise<string> | null {
  const hit = pictures.get(key);
  if (hit) return hit;
  const made = make();
  if (!made) return null;
  const classes = [...new Set(made.scene.marks.map((m) => m.c))];
  const svg = thumbSvg(made.scene, made.view, w, h, inks(classes, theme));
  const p = raster(svg, w, h);
  pictures.set(key, p);
  if (pictures.size > LIMIT) {
    const [oldest, url] = pictures.entries().next().value as [string, Promise<string>];
    pictures.delete(oldest);
    void url.then((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
  }
  return p;
}

/** Draws the SVG onto a canvas at the screen's pixel density and keeps the PNG; the SVG itself where that fails. */
async function raster(svg: string, w: number, h: number): Promise<string> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = svgUrl;
    await img.decode();
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return svgUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return svgUrl;
    URL.revokeObjectURL(svgUrl);
    return URL.createObjectURL(blob);
  } catch {
    return svgUrl;
  }
}
