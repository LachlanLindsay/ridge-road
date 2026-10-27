import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// SPEC.md, "History and Country content": the game's own voice never says "natives" (the word appears
// only inside the journal's quotation marks), and unwalked ground is unknown to the party, never to
// "nobody". These lines go to the Darug, Gundungurra and Wiradjuri reviewers as they stand.
function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'art' ? [] : files(p, ext);
    return ext.test(e.name) ? [p] : [];
  });
}
const sources = [...files('src', /\.tsx?$/), ...files('data', /\.json$/)];
/** The text outside quotation marks, where the game speaks for itself. */
const ownVoice = (text: string) => text.replace(/“[^”]*”/g, '“…”');

describe('the Country rules in the game’s own words', () => {
  it('never says natives outside a quotation', () => {
    for (const f of sources) {
      const own = ownVoice(readFileSync(f, 'utf8')).replace(/native dogs/g, '');
      expect(own.match(/\bnatives?\b/gi), f).toBeNull();
    }
  });

  it('says unwalked ground is unknown to the party, not to nobody', () => {
    for (const f of sources) {
      const own = ownVoice(readFileSync(f, 'utf8'));
      expect(own.match(/nobody (has walked|has been there|knows where)|unexplored ridge:|ridge nobody/gi), f).toBeNull();
    }
  });
});
