import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { MIXED, MIXED_PCT, MIXED_GAPS, GEN, GEN_MUST, GEN_MUST_NOT } from '../unit/fixtures.mjs';
import { call, excludedCount } from './api.mjs';
const CP = createRequire(import.meta.url)('../../docs/assets/core.js');

// Las pruebas nunca cuentan como visitas: octave_notrack=1 manda sus hits al contador aparte (pestaña Exclus, motivo notrack).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('octave_notrack', '1'));
});

const PAGES = ['', 'autodiagnostico/', 'politica-de-privacidad/', 'kit/', 'ley-21719/', 'privacidad/', 'terminos/'];

test('todas las páginas: pie legal, aviso, sin scroll horizontal', async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p);
    const foot = page.locator('footer');
    await expect(foot).toContainText('READ FRANCE SAS (SIREN 988 741 773)');
    await expect(foot).toContainText('octave@vread.fr');
    await expect(foot).toContainText('No es asesoría legal');
    await expect(foot.getByRole('link', { name: 'Política de privacidad' })).toBeVisible();
    await expect(foot.getByRole('link', { name: 'Términos y condiciones' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'scroll horizontal en ' + p).toBeLessThanOrEqual(0);
    expect(await page.title()).toMatch(/Candado Pyme|Ley 21\.719/);
  }
});

test('autodiagnóstico: puntaje y orden de brechas correctos', async ({ page }) => {
  await page.goto('autodiagnostico/');
  await expect(page.locator('.q')).toHaveCount(15);
  await page.selectOption('#size', 'micro');
  // Enviar incompleto muestra el error
  await page.getByRole('button', { name: 'Ver mi resultado' }).click();
  await expect(page.locator('#diag-error')).toContainText('faltan 15 preguntas');
  for (const [id, v] of Object.entries(MIXED)) await page.locator(`#q-${id} input[value="${v}"]`).check({ force: true });
  await expect(page.locator('#progress-text')).toHaveText('15 de 15 respondidas');
  await page.getByRole('button', { name: 'Ver mi resultado' }).click();
  await expect(page.locator('.score')).toHaveText(MIXED_PCT + '%');
  await expect(page.locator('#resultado')).toContainText('8 brechas, 7 de ellas sobre obligaciones legales');
  await expect(page.locator('#resultado')).toContainText('Tu empresa es de menor tamaño');
  const gaps = await page.locator('#gap-list > li b').allTextContents();
  const expected = MIXED_GAPS.map(id => CP.QUESTIONS.find(q => q.id === id).gap);
  expect(gaps).toEqual(expected);
  await expect(page.locator('#resultado a', { hasText: 'Ver el kit' })).toHaveAttribute('href', '../kit/?diag=' + MIXED_PCT);
});

test('autodiagnóstico: todo "Sí" da 100% sin brechas; empresa grande sin regla pyme', async ({ page }) => {
  await page.goto('autodiagnostico/');
  await page.selectOption('#size', 'grande');
  for (const q of CP.QUESTIONS) await page.locator(`#q-${q.id} input[value="si"]`).check({ force: true });
  await page.getByRole('button', { name: 'Ver mi resultado' }).click();
  await expect(page.locator('.score')).toHaveText('100%');
  await expect(page.locator('#resultado')).toContainText('No detectamos brechas');
  await expect(page.locator('#resultado')).toContainText('no le aplica la regla transitoria');
});

test('generador: la política contiene lo exigido por el art. 14 ter', async ({ page }) => {
  await page.goto('politica-de-privacidad/');
  const fill = { razon: GEN.razon, fantasia: GEN.fantasia, rut: GEN.rut, rep: GEN.rep, domicilio: GEN.domicilio, email: GEN.email, form: GEN.form };
  // Errores de validación primero
  await page.getByRole('button', { name: 'Generar la política' }).click();
  await expect(page.locator('#gen-errors')).toContainText('Falta la razón social');
  for (const [k, v] of Object.entries(fill)) await page.fill('#g-' + k, v);
  for (const name of ['people', 'data', 'purposes', 'recipients', 'security', 'sources']) {
    const boxes = page.locator(`input[name="${name}"]`);
    for (let i = 0; i < await boxes.count(); i++) {
      const b = boxes.nth(i);
      const want = (GEN[name] || []).includes(await b.getAttribute('value'));
      if (await b.isChecked() !== want) await b.setChecked(want);
    }
  }
  await page.check('#g-intl');
  await page.fill('#g-intlDetail', GEN.intlDetail);
  await page.fill('#g-ret-clientes', GEN.retention.clientes);
  await page.getByRole('button', { name: 'Generar la política' }).click();
  const preview = page.locator('#gen-preview');
  await expect(preview.locator('h1')).toHaveText('Política de tratamiento de datos personales de ' + GEN.razon);
  const text = await preview.innerText();
  for (const s of GEN_MUST.filter(s => !s.startsWith('Versión'))) expect(text, 'falta: ' + s).toContain(s);
  for (const s of GEN_MUST_NOT) expect(text, 'sobra: ' + s).not.toContain(s);
  // Descarga .txt idéntica al texto construido por el núcleo con la fecha de hoy
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#gen-dl-txt')]);
  expect(dl.suggestedFilename()).toBe('politica-privacidad-comercial-los-aromos-spa.txt');
  const body = await (await dl.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'));
  const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  expect(body).toBe(CP.buildPolicy({ ...GEN, date: today, intlBasis: 'cláusulas contractuales con garantías adecuadas', delegado: '', autoDetail: '', retention: { clientes: '2 años', postulantes: '6 meses', camaras: '30 días' } }).text + '\n');
});

test('generador: RUT inválido se rechaza', async ({ page }) => {
  await page.goto('politica-de-privacidad/');
  for (const [k, v] of Object.entries({ razon: 'X SpA', rut: '76.086.428-4', rep: 'A', domicilio: 'B', email: 'a@b.cl' })) await page.fill('#g-' + k, v);
  await page.getByRole('button', { name: 'Generar la política' }).click();
  await expect(page.locator('#gen-errors')).toContainText('El RUT no es válido');
});

test('precio A/B: variante b muestra $79.000 y la oferta correspondiente', async ({ page }) => {
  await page.goto('kit/?precio=b');
  await expect(page.locator('.price [data-price]')).toHaveText('$79.000');
  await expect(page.locator('#p-offer')).toHaveValue('kit-79000');
  await page.goto('kit/?precio=a');
  await expect(page.locator('#p-submit')).toContainText('$39.000');
});

test('preventa: valida RUT y B2B, y registra la reserva en la hoja', async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;
  await page.goto('kit/?precio=a&diag=50');
  await page.fill('#p-razon', 'Prueba Automatizada SpA');
  await page.fill('#p-rut', '76.086.428-4');
  await page.fill('#p-email', email);
  await page.getByRole('button', { name: /Reservar el kit/ }).click();
  await expect(page.locator('#p-error')).toContainText('El RUT no es válido');
  await expect(page.locator('#p-error')).toContainText('solo para empresas');
  await page.fill('#p-rut', '76.086.428-5');
  await page.check('#p-b2b');
  await page.check('#p-consent');
  await page.check('#p-buzon');
  await page.selectOption('#p-size', 'pequena');
  await page.getByRole('button', { name: /Reservar el kit/ }).click();
  await expect(page.locator('#p-ok')).toContainText('Reserva registrada', { timeout: 30000 });
  await expect(page.locator('#p-ok')).toContainText('$39.000');
  const s = await call('summary', { email });
  expect(s.hasEmail).toBe(true);
});

test('medición anónima: los contadores de pruebas suben (view y diag_complete), no las visitas', async ({ page }) => {
  await page.addInitScript(() => { window.cpForceTrack = true; });
  const before = { view: await excludedCount('view'), diag_complete: await excludedCount('diag_complete') };
  await page.goto('autodiagnostico/');
  for (const q of CP.QUESTIONS) await page.locator(`#q-${q.id} input[value="no"]`).check({ force: true });
  await page.getByRole('button', { name: 'Ver mi resultado' }).click();
  await expect(page.locator('.score')).toHaveText('0%');
  await expect.poll(async () => await excludedCount('view'), { timeout: 30000 }).toBeGreaterThan(before.view);
  await expect.poll(async () => await excludedCount('diag_complete'), { timeout: 30000 }).toBeGreaterThan(before.diag_complete);
  // Sin cookies
  expect(await page.context().cookies()).toEqual([]);
});
