// Which build this is, for feedback reports and saves. Vite stamps it at build time (vite.config.ts):
// the build date and commit, with "+" when the tree had uncommitted changes.
declare const __BUILD__: string | undefined;

export const BUILD: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';
