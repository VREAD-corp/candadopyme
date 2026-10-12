import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { MIXED, MIXED_PCT, MIXED_BAND, MIXED_GAPS, GEN, GEN_MUST, GEN_MUST_NOT } from './fixtures.mjs';
const CP = createRequire(import.meta.url)('../../docs/assets/core.js');

test('15 preguntas, ids únicos, artículo y brecha en cada una', () => {
  assert.equal(CP.QUESTIONS.length, 15);
  assert.equal(new Set(CP.QUESTIONS.map(q => q.id)).size, 15);
  for (const q of CP.QUESTIONS) { assert.ok(q.art && q.gap && q.risk && q.kit && q.w > 0, q.id); assert.ok(CP.WHEN_LABEL[q.when], q.id); }
});

test('puntaje mixto calculado a mano', () => {
  const r = CP.score(MIXED);
  assert.equal(r.score, 14); assert.equal(r.max, 28); assert.equal(r.pct, MIXED_PCT); assert.equal(r.band, MIXED_BAND);
  assert.equal(r.answered, 15);
  assert.deepEqual(r.gaps.map(g => g.id), MIXED_GAPS);
});

test('todo sí = 100, todo no = 0, bandas', () => {
  const all = v => Object.fromEntries(CP.QUESTIONS.map(q => [q.id, v]));
  assert.equal(CP.score(all('si')).pct, 100); assert.equal(CP.score(all('si')).band, 'alto');
  assert.equal(CP.score(all('no')).pct, 0); assert.equal(CP.score(all('no')).band, 'bajo');
  assert.equal(CP.score(all('parcial')).pct, 50); assert.equal(CP.score(all('parcial')).band, 'medio');
  assert.equal(CP.score(all('si')).gaps.length, 0); assert.equal(CP.score(all('nose')).gaps.length, 15);
});

test('"No aplica" solo donde está permitido', () => {
  assert.throws(() => CP.score({ inventario: 'na' }));
  assert.doesNotThrow(() => CP.score({ menores: 'na' }));
  assert.throws(() => CP.score({ inventario: 'tal vez' }));
});

test('tamaño Ley 20.416 por ventas en UF', () => {
  assert.equal(CP.sizeFromUF(2400), 'micro'); assert.equal(CP.sizeFromUF(2401), 'pequena');
  assert.equal(CP.sizeFromUF(25000), 'pequena'); assert.equal(CP.sizeFromUF(25001), 'mediana');
  assert.equal(CP.sizeFromUF(100000), 'mediana'); assert.equal(CP.sizeFromUF(100001), 'grande');
});

test('política generada contiene lo exigido y nada que no corresponda', () => {
  assert.deepEqual(CP.validatePolicy(GEN), []);
  const p = CP.buildPolicy(GEN);
  for (const s of GEN_MUST) assert.ok(p.text.includes(s), 'falta: ' + s);
  for (const s of GEN_MUST_NOT) assert.ok(!p.text.includes(s), 'sobra: ' + s);
  assert.ok(p.html.includes('<table>') && p.html.includes('<h1>'));
  assert.ok(!/<script/i.test(CP.buildPolicy({ ...GEN, razon: '<script>alert(1)</script>' }).html));
  // Numeración correlativa de secciones
  const nums = p.sections.map(s => Number(s.h.split('.')[0]));
  assert.deepEqual(nums, nums.map((_, i) => i + 1));
});

test('variantes: datos sensibles, menores, decisiones automatizadas, sin transferencias', () => {
  const p = CP.buildPolicy({ ...GEN, data: [...GEN.data, 'biometria', 'menores'], intl: false, auto: true, autoDetail: 'aprobación automática de crédito en tienda', delegado: 'Juan Rojas, gerente' });
  for (const s of ['Datos biométricos', 'art. 16 ter', 'art. 16 quáter', 'No transferimos tus datos fuera de Chile', 'aprobación automática de crédito en tienda', 'art. 8° bis', 'Juan Rojas, gerente'])
    assert.ok(p.text.includes(s), 'falta: ' + s);
});

test('validación de campos obligatorios', () => {
  const errs = CP.validatePolicy({ data: [], purposes: [], intl: true, email: 'malo' });
  const f = errs.map(e => e.field);
  for (const k of ['razon', 'rut', 'rep', 'domicilio', 'email', 'data', 'purposes', 'intlDetail']) assert.ok(f.includes(k), k);
});

test('RUT módulo 11', () => {
  assert.equal(CP.normRut('76.086.428-5'), '76086428-5');
  assert.equal(CP.normRut('76086428-4'), null);
  assert.equal(CP.normRut('11.111.111-1'), '11111111-1');
  assert.equal(CP.normRut('12.345.678-5'), '12345678-5');
  assert.equal(CP.normRut('abc'), null);
});

test('variante de precio alterna por día de Santiago y acepta override', () => {
  const d1 = CP.priceVariant(new Date('2026-10-13T15:00:00Z')), d2 = CP.priceVariant(new Date('2026-10-14T15:00:00Z'));
  assert.notEqual(d1, d2);
  assert.equal(CP.priceVariant(new Date(), 'b'), 'b');
  assert.equal(CP.clp(39000), '$39.000'); assert.equal(CP.clp(79000), '$79.000');
});
