// Octave CRO (cro.js in the site, Cro.js in gas/): vendored checks, the price test ported onto OCTAVE_XP, backend routes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const path = (p) => fileURLToPath(new URL('../../' + p, import.meta.url));
const CP = createRequire(import.meta.url)('../../docs/assets/core.js');
const CRO = fs.readFileSync(path('docs/assets/cro.js'), 'utf8');

function check(script, target) {
  const r = spawnSync(process.execPath, [path(script), path(target)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
}
test('vendored cro.check.mjs passes on docs/assets/cro.js', () => check('tests/cro/cro.check.mjs', 'docs/assets/cro.js'));
test('vendored cro-gas.check.mjs passes on gas/src/Cro.js', () => check('tests/cro/cro-gas.check.mjs', 'gas/src/Cro.js'));

/* ---------- the built pages carry the same experiment as before ---------- */

function xpConfig(html) {
  const m = html.match(/<script>window\.OCTAVE_XP = (.*?);<\/script>/);
  assert.ok(m, 'OCTAVE_XP inline config');
  return JSON.parse(m[1]);
}
const PAGES = ['docs/index.html', 'docs/kit/index.html', 'docs/autodiagnostico/index.html', 'docs/politica-de-privacidad/index.html',
  'docs/ley-21719/index.html', 'docs/privacidad/index.html', 'docs/terminos/index.html', 'docs/404.html'];

test('every built page loads cro.js after OCTAVE_XP and before app.js', () => {
  for (const p of PAGES) {
    const html = fs.readFileSync(path(p), 'utf8');
    const xp = html.indexOf('window.OCTAVE_XP'), cro = html.search(/<script src="[^"]*assets\/cro\.js\?v=\w+" data-site="candadopyme"/), app = html.indexOf('assets/app.js');
    assert.ok(xp > 0 && cro > xp && app > cro, p);
    assert.deepEqual(xpConfig(html), [{ id: 'price', variants: ['a', 'b'], mode: 'day', tz: 'America/Santiago', param: 'precio' }], p);
    assert.match(html, /data-api="https:\/\/script\.google\.com\/macros\/s\/AKfycbzO-[\w-]+\/exec" data-hosts="outils\.vread\.fr candadopyme\.github\.io"/, p);
    assert.doesNotMatch(html, /<script[^>]*type="module"[^>]*cro\.js/, p);
  }
});

/** Runs cro.js in a fake browser at instant `now` (as an automated browser: variants apply, nothing is sent). */
function croAt(now, search = '') {
  const attrs = {}, session = {}, sent = [];
  class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
  const html = { setAttribute: (k, v) => { attrs[k] = v; }, scrollHeight: 800 };
  const store = (o) => ({ getItem: (k) => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: (k) => { delete o[k]; } });
  const ctx = {
    Date: FakeDate, URLSearchParams, Intl, Math, JSON, String, RegExp,
    navigator: { userAgent: 'Mozilla/5.0 Chrome/141.0.0.0', webdriver: true },
    location: { hostname: 'outils.vread.fr', pathname: '/candadopyme/kit/', search },
    document: { readyState: 'complete', currentScript: { dataset: { site: 'candadopyme', api: 'https://x/exec' } }, documentElement: html,
      querySelectorAll: () => [], addEventListener: () => {} },
    sessionStorage: store(session), localStorage: store({}), innerWidth: 1200, addEventListener: () => {},
    fetch: (u, o) => { sent.push(o); return Promise.resolve(); },
  };
  ctx.window = ctx;
  ctx.OCTAVE_XP = xpConfig(fs.readFileSync(path('docs/kit/index.html'), 'utf8'));
  vm.runInNewContext(CRO, ctx);
  return { v: ctx.octaveCro.v('price'), attrs, session, sent };
}

test('octaveCro.v("price") = CP.priceVariant on every day, around Santiago midnight and DST changes', () => {
  const instants = [
    '2026-10-13T15:00:00Z', '2026-10-14T02:59:59Z', '2026-10-14T03:00:00Z', // Santiago midnight in summer time (UTC-3)
    '2026-07-01T03:59:59Z', '2026-07-01T04:00:00Z',                         // in winter time (UTC-4)
    '2026-04-05T02:30:00Z', '2026-04-05T03:30:00Z', '2026-04-05T04:30:00Z', // back to UTC-4
    '2026-09-06T03:30:00Z', '2026-09-06T04:30:00Z',                         // forward to UTC-3
    '2027-01-01T02:59:59Z', '2027-01-01T03:00:00Z', '2026-12-31T23:59:59Z', '2024-02-29T12:00:00Z',
  ].map((s) => Date.parse(s));
  for (let i = 0; i < 40; i++) instants.push(Date.UTC(2026, 9, 1) + i * 86400e3 + 7 * 3600e3 * (i % 4));
  const seen = new Set();
  for (const t of instants) {
    const r = croAt(t);
    assert.equal(r.v, CP.priceVariant(new Date(t)), new Date(t).toISOString());
    assert.equal(r.attrs['data-xp-price'], r.v);
    assert.deepEqual(r.session, {}, 'mode day: no storage at all');
    assert.deepEqual(r.sent, [], 'automated browser: nothing sent');
    seen.add(r.v);
  }
  assert.deepEqual([...seen].sort(), ['a', 'b']);
  // The letter changes exactly at Santiago midnight, not UTC midnight.
  assert.notEqual(croAt(Date.parse('2026-10-14T02:59:59Z')).v, croAt(Date.parse('2026-10-14T03:00:00Z')).v);
  assert.equal(croAt(Date.parse('2026-10-14T00:30:00Z')).v, croAt(Date.parse('2026-10-13T12:00:00Z')).v);
});

test('?precio=a|b forces the variant like before; anything else keeps the day', () => {
  const t = Date.parse('2026-10-13T15:00:00Z'), day = CP.priceVariant(new Date(t));
  for (const p of ['a', 'b']) {
    assert.equal(croAt(t, '?precio=' + p).v, p);
    assert.equal(CP.priceVariant(new Date(t), p), p);
  }
  for (const q of ['?precio=', '?precio=c', '?precio=A', '']) assert.equal(croAt(t, q).v, CP.priceVariant(new Date(t), new URLSearchParams(q).get('precio')), q);
  assert.equal(croAt(t, '?precio=zz').v, day);
  assert.deepEqual(CP.PRICES, { a: 39000, b: 79000 });
});

test('app.js reads octaveCro.v("price") and records the preorder / waitlist / download goals', () => {
  const app = fs.readFileSync(path('docs/assets/app.js'), 'utf8');
  assert.match(app, /window\.octaveCro\.v\('price'\)/);
  assert.match(app, /goal\('preorder'\)/);
  assert.match(app, /goal\('waitlist'\)/);
  assert.match(app, /goal\('download'\)/);
});

/* ---------- backend routes (Code.js + Cro.js with stub Apps Script services) ---------- */

function backend() {
  const ctx = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(String(s)).digest()].map((b) => (b > 127 ? b - 256 : b)),
      formatDate: () => '2026-10-13',
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => { throw new Error('no write'); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    console,
  };
  vm.runInNewContext(fs.readFileSync(path('gas/src/Code.js'), 'utf8') + '\n' + fs.readFileSync(path('gas/src/Cro.js'), 'utf8'), ctx);
  const post = (body, action = body.action) => ctx.doPost({ parameter: { action }, postData: { contents: JSON.stringify(body) } });
  return { ctx, post, get: (p) => ctx.doGet({ parameter: p }) };
}

test('backend: CRO settings match the site experiment', () => {
  const { ctx } = backend();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.CRO_EXPERIMENTS_)), { price: ['a', 'b'] });
  assert.deepEqual([...ctx.CRO_SITES_], ['candadopyme']);
  assert.equal(ctx.CRO_TZ_, 'America/Santiago');
  assert.equal(ctx.croPageOf_('candadopyme', '/candadopyme/kit/'), '/kit/');
  assert.equal(ctx.croPageOf_('candadopyme', '/candadopyme/404.html'), ctx.trackPage_('/candadopyme/404.html'));
});

test('backend: track kind cro goes to croTrack_ before the mesure.js validation; cro and cro_init routes', () => {
  const b = backend();
  // An unknown site is refused by Cro.js (not by track_, which would answer field "site").
  assert.deepEqual(b.post({ action: 'track', kind: 'cro', v: 2, site: 'nope', page: '/', e: [['pv', '', '']] }), { ok: false, error: 'bad_request' });
  const calls = [];
  b.ctx.croTrack_ = (req) => (calls.push('cro'), { ok: true, n: req.e.length });
  b.ctx.track_ = () => (calls.push('track'), { ok: true });
  assert.deepEqual(b.post({ action: 'track', kind: 'cro', v: 2, site: 'candadopyme', page: '/candadopyme/', e: [['pv', '', '']] }), { ok: true, n: 1 });
  b.post({ action: 'track', site: 'candadopyme', event: 'view', page: '/' });
  assert.deepEqual(calls, ['cro', 'track']);
  assert.deepEqual(b.get({ action: 'cro', key: 'x' }), { ok: false, error: 'forbidden' });
  assert.deepEqual(b.get({ action: 'cro_init', key: 'k'.repeat(40) }), { ok: false, error: 'method_not_allowed' });
  assert.deepEqual(b.post({ action: 'cro_init', key: 'short' }), { ok: false, error: 'bad_request' });
});

test('backend: summary adds cro for the last 7 days (or from..to)', () => {
  const b = backend();
  b.ctx.croSummary_ = (from, to) => ({ from, to });
  assert.deepEqual(b.ctx.croSummaryRange_({}), { from: '2026-10-07', to: '2026-10-13' });
  assert.deepEqual(b.ctx.croSummaryRange_({ days: 1 }), { from: '2026-10-13', to: '2026-10-13' });
  assert.deepEqual(b.ctx.croSummaryRange_({ from: '2026-10-01', to: '2026-10-05' }), { from: '2026-10-01', to: '2026-10-05' });
  assert.match(fs.readFileSync(path('gas/src/Code.js'), 'utf8'), /out\.cro = croSummaryRange_\(req\);/);
});
