// Capturas de todas las páginas a 390 px y 1440 px. Uso: node tools/shots.mjs [base]
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:4517/';
const pages = ['', 'autodiagnostico/', 'politica-de-privacidad/', 'kit/', 'ley-21719/', 'privacidad/', 'terminos/', 'no-existe/'];
const b = await chromium.launch();
for (const [w, h, tag] of [[390, 844, 'm'], [1440, 900, 'd']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    const name = (path.replace(/\/$/, '') || 'home').replace(/\//g, '_');
    await p.screenshot({ path: `shots/${tag}-${name}.png`, fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log('HORIZONTAL OVERFLOW', tag, path, overflow);
  }
  await ctx.close();
}
await b.close();
console.log('ok');
