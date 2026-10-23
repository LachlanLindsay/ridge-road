// A replay code: everything needed to rebuild an expedition exactly (the build, the new-game
// options and every order given), compressed into a short line of text a tester can paste into a
// message. The engine is deterministic, so `sim/replay.ts` turns a code back into the same game.
// Works in browsers and in Node, which both have CompressionStream.
import type { Action, GameState, NewGameOptions } from '../engine';

export interface ReplayData {
  v: 1;
  /** The build that wrote it. */
  b: string;
  o: NewGameOptions;
  a: Action[];
}

function toBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** RR1 is deflated; RR0, for browsers without CompressionStream, is plain. */
export async function encodeReplay(s: GameState, build: string): Promise<string> {
  const data: ReplayData = { v: 1, b: build, o: s.opts, a: s.actions };
  const json = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream === 'function') {
    try {
      return `RR1.${toBase64url(await through(json, new CompressionStream('deflate-raw')))}`;
    } catch {
      // Fall back to the plain form.
    }
  }
  return `RR0.${toBase64url(json)}`;
}

/** Find a replay code anywhere in `text` (a whole pasted report will do) and unpack it. */
export async function decodeReplay(text: string): Promise<ReplayData> {
  const m = text.match(/RR([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('No replay code found: it starts with RR1. or RR0.');
  const raw = fromBase64url(m[2]!);
  const bytes = m[1] === '1' ? await through(raw, new DecompressionStream('deflate-raw')) : raw;
  const data = JSON.parse(new TextDecoder().decode(bytes)) as ReplayData;
  if (data.v !== 1 || !data.o || !Array.isArray(data.a)) throw new Error('Not a Ridge Road replay code.');
  return data;
}
