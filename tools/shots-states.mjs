// Capturas de estados interactivos: resultado del autodiagnóstico, política generada y formulario del kit.
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:4517/candadopyme/';
const CP = (await import('../docs/assets/core.js')).default;
const MIX = { inventario: 'si', licitud: 'parcial', politica: 'no', canal: 'si', plazo: 'nose', consentimiento: 'parcial', sensibles: 'na', menores: 'na', encargados: 'si', transferencias: 'no', seguridad: 'parcial', brechas: 'si', conservacion: 'no', confidencialidad: 'si', delegado: 'no' };
const b = await chromium.launch();
for (const [w, h, tag] of [[390, 844, 'm'], [1440, 900, 'd']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(base + 'autodiagnostico/');
  await p.selectOption('#size', 'pequena');
  for (const [id, v] of Object.entries(MIX)) await p.locator(`#q-${id} input[value="${v}"]`).check({ force: true });
  await p.click('#diag-submit');
  await p.waitForSelector('#resultado');
  await p.locator('#resultado').screenshot({ path: `shots/${tag}-state-diag.png` });
  await p.goto(base + 'politica-de-privacidad/');
  for (const [k, v] of Object.entries({ razon: 'Comercial Los Aromos SpA', rut: '76.086.428-5', rep: 'María Soto Pérez', domicilio: 'Av. Providencia 1234, Santiago', email: 'datos@losaromos.cl' })) await p.fill('#g-' + k, v);
  await p.click('#gen-submit');
  await p.waitForSelector('#gen-preview h1');
  await p.screenshot({ path: `shots/${tag}-state-gen.png`, fullPage: false });
  await p.locator('#gen-preview').screenshot({ path: `shots/${tag}-state-gen-preview.png` });
  await p.goto(base + 'kit/');
  await p.locator('#reservar').screenshot({ path: `shots/${tag}-state-kit-form.png` });
}
await b.close();
console.log('ok');
