/**
 * Candado Pyme web app (READ FRANCE SAS). Standalone Apps Script with its own spreadsheet.
 * Separate from octave-checkout and from every other READ FRANCE project.
 *
 * Actions (POST text/plain JSON, or GET with the same fields as query parameters):
 *   track        cookieless, anonymous daily counters (Stats tab), same pattern as octave-checkout Track.js.
 *                A hit flagged `excluded` by mesure.js (crawler or headless user agent, navigator.webdriver, or our
 *                own tests with octave_notrack=1) is counted in the `Exclus` tab by reason instead, so the summary
 *                shows counted and raw visits side by side.
 *   preorder     B2B pre-sale / waitlist for the Ley 21.719 kit (Preventa tab): company RUT + razón social required
 *   rights       data-subject request about our own data: acceso | rectificacion | supresion | oposicion | portabilidad | bloqueo
 *   ping         health check
 *   summary      counts for the operator (admin key; never returns personal data)
 *   purge_tests  deletes rows created by automated tests (admin key)
 *   reset_stats  clears the Stats tab (admin key; used once, before launch, to drop test traffic)
 *
 * The spreadsheet is created on first use and its id kept in Script Properties (SHEET_ID).
 * Only scope: spreadsheets. No e-mail is sent from here. No payment is taken here.
 */

var APP = {
  name: 'CandadoPyme',
  tz: 'America/Santiago',
  consentVersion: 'pv-2026-10-13',
  adminHash: '6713709b672c5fa0f779a53079a47b3ea3ee0cdf28a369969a9259d1a9850723',
  sites: ['candadopyme'],
  events: ['view', 'cta_click', 'diag_start', 'diag_complete', 'policy_generated', 'policy_copy', 'policy_download',
    'preorder_view', 'preorder_submit', 'sample_view'],
  ownHosts: ['outils.vread.fr', 'vread-corp.github.io', 'candadopyme.github.io'],
  offers: { 'kit-39000': 39000, 'kit-79000': 79000 },
  sizes: ['micro', 'pequena', 'mediana', 'grande', 'nose'],
  sectors: ['comercio', 'ecommerce', 'salud', 'educacion', 'servicios', 'inmobiliaria', 'turismo', 'tecnologia', 'contabilidad', 'otro'],
  rightsTypes: ['acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo'],
  ratePerMin: 200,
  formRatePerMin: 20,
};

var PREORDER_HEADER = ['created_at', 'updated_at', 'email', 'rut', 'razon_social', 'nombre', 'size', 'sector', 'offer', 'price_clp',
  'variant', 'buzon', 'diag_pct', 'consent_version', 'page', 'status', 'test'];
var REQUEST_HEADER = ['created_at', 'type', 'email_sha256', 'message', 'matched_rows', 'status', 'due_date', 'test'];
var STATS_HEADER = ['date', 'site', 'page', 'event', 'variant', 'source', 'medium', 'campaign', 'count', 'mobile', 'desktop', 'updated_at'];
var STATS_KEYS = 8;
var EXCL_HEADER = ['date', 'site', 'page', 'event', 'variant', 'reason', 'count', 'mobile', 'desktop', 'updated_at'];
var EXCL_KEYS = 6;
// Why a hit is not a visit (decided in the browser; the user agent itself is never sent).
// 'legacy': a hit without `v` comes from a mesure.js older than these checks (often a crawler's cached copy).
var EXCL_REASONS = ['webdriver', 'bot', 'notrack', 'legacy'];

function doGet(e) { return handle_(e, (e && e.parameter) || {}); }

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}') || {}; } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  return handle_(e, req);
}

function handle_(e, req) {
  var action = String((e && e.parameter && e.parameter.action) || req.action || '');
  try {
    switch (action) {
      case 'track': return json_(track_(req));
      case 'preorder': return json_(preorder_(req));
      case 'rights': return json_(rights_(req));
      case 'summary': return json_(summary_(req));
      case 'purge_tests': return json_(purgeTests_(req));
      case 'reset_stats': return json_(resetStats_(req));
      case 'ping': return json_({ ok: true, app: APP.name, consentVersion: APP.consentVersion });
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    if (err && err.userError) return json_({ ok: false, error: err.code, field: err.field || '' });
    console.error(String(err && err.stack || err));
    return json_({ ok: false, error: 'server_error' });
  }
}

/* ---------- helpers ---------- */

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function userError_(code, field) { var e = new Error(code); e.userError = true; e.code = code; e.field = field; return e; }
function now_() { return new Date(); }
function clDate_(d) { return Utilities.formatDate(d, APP.tz, 'yyyy-MM-dd'); }
/** Text cell: a leading quote stops formula injection (=, +, -, @). */
function txt_(v) { var s = String(v === undefined || v === null ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function cell_(v) { return v instanceof Date ? Utilities.formatDate(v, APP.tz, 'yyyy-MM-dd') : String(v); }
function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function clean_(v, max) { return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function token_(v, max) { return String(v === undefined || v === null ? '' : v).toLowerCase().replace(/[^a-z0-9._ -]+/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }
function isTestEmail_(email) { return /@example\.(com|org|cl)$/.test(email); }
function checkAdmin_(req) { if (!req.key || sha256Hex_(String(req.key)) !== APP.adminHash) throw userError_('forbidden'); }
function truthy_(v) { return v === true || v === 'true' || v === '1' || v === 'on'; }

/** Chilean RUT: "76.123.456-7" -> "76123456-7" when the check digit (módulo 11) is right, else null. */
function normRut_(v) {
  var s = String(v === undefined || v === null ? '' : v).toUpperCase().replace(/[^0-9K]/g, '');
  if (s.length < 2 || s.length > 9) return null;
  var body = s.slice(0, -1), dv = s.slice(-1);
  if (!/^\d+$/.test(body) || Number(body) < 1000000) return null;
  var sum = 0, mul = 2;
  for (var i = body.length - 1; i >= 0; i--) { sum += Number(body[i]) * mul; mul = mul === 7 ? 2 : mul + 1; }
  var r = 11 - (sum % 11);
  var expect = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return expect === dv ? body + '-' + dv : null;
}

function ss_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    id = props.getProperty('SHEET_ID');
    if (id) return SpreadsheetApp.openById(id);
    var ss = SpreadsheetApp.create('Candado Pyme: preventa y estadísticas (READ FRANCE SAS)');
    ss.setSpreadsheetTimeZone(APP.tz);
    props.setProperty('SHEET_ID', ss.getId());
    return ss;
  } finally { lock.releaseLock(); }
}

function tab_(name, header) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);
    ['Sheet1', 'Hoja 1', 'Feuille 1'].forEach(function (n) {
      var def = ss.getSheetByName(n);
      if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
    });
  }
  return sh;
}

function rateOk_(bucket, max) {
  var cache = CacheService.getScriptCache();
  var k = 'rl:' + bucket + ':' + Math.floor(now_().getTime() / 60000);
  var n = Number(cache.get(k) || 0);
  if (n >= max) return false;
  cache.put(k, String(n + 1), 120);
  return true;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw userError_('busy');
  try { return fn(); } finally { lock.releaseLock(); }
}

function validEmail_(v) {
  var s = clean_(v, 254).toLowerCase();
  if (!/^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(s) || s.indexOf('..') >= 0) throw userError_('bad_request', 'email');
  return s;
}

/* ---------- tracking (cookieless, anonymous daily counters) ---------- */

function trackPage_(page) {
  var p = String(page === undefined || page === null ? '' : page).slice(0, 300).toLowerCase().replace(/[?#].*$/, '');
  if (!/^\/[a-z0-9\/._%~-]*$/.test(p)) return null;
  if (p === '/candadopyme' || p.indexOf('/candadopyme/') === 0) p = p.slice('/candadopyme'.length) || '/';
  p = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/{2,}/g, '/');
  return p.slice(0, 80) || '/';
}

function validateTrack_(req) {
  var site = String(req.site || '');
  if (APP.sites.indexOf(site) < 0) throw userError_('bad_request', 'site');
  var event = String(req.event || '');
  if (APP.events.indexOf(event) < 0) throw userError_('bad_request', 'event');
  var page = trackPage_(req.page);
  if (page === null) throw userError_('bad_request', 'page');
  if (req.ts !== undefined && req.ts !== null && req.ts !== '') {
    var ts = Number(req.ts);
    if (!isFinite(ts) || Math.abs(ts - now_().getTime()) > 2 * 86400 * 1000) throw userError_('bad_request', 'ts');
  }
  var ref = String(req.ref_domain || '').toLowerCase().replace(/^www\./, '');
  if (ref && !/^[a-z0-9.-]{1,100}$/.test(ref)) ref = '';
  if (APP.ownHosts.indexOf(ref) >= 0) ref = '(interno)';
  var variant = req.variant === 'a' || req.variant === 'b' ? req.variant : '';
  return {
    date: clDate_(now_()), site: site, page: page, event: event, variant: variant,
    source: token_(req.utm_source, 50) || ref || '(directo)',
    medium: token_(req.utm_medium, 30), campaign: token_(req.utm_campaign, 50),
    device: req.device === 'mobile' || req.device === 'desktop' ? req.device : '',
    reason: EXCL_REASONS.indexOf(String(req.excluded || '')) >= 0 ? String(req.excluded) : (req.excluded ? 'bot' : (!req.v ? 'legacy' : '')),
  };
}

function track_(req) {
  var hit = validateTrack_(req);
  if (!rateOk_('track', APP.ratePerMin)) return { ok: false, error: 'rate_limited' };
  withLock_(function () { if (hit.reason) incrementExcluded_(hit); else incrementStat_(hit); });
  return { ok: true };
}

function incrementStat_(h) {
  incrementRow_('Stats', STATS_HEADER, STATS_KEYS, [h.date, h.site, h.page, h.event, h.variant, h.source, h.medium, h.campaign], h.device);
}

/** Hits that are not visits: same daily counters, keyed by reason instead of source. */
function incrementExcluded_(h) {
  incrementRow_('Exclus', EXCL_HEADER, EXCL_KEYS, [h.date, h.site, h.page, h.event, h.variant, h.reason], h.device);
}

/** Caller holds the lock. Increments the daily counter row `keys` (date first) of tab `name`, or appends it. */
function incrementRow_(name, header, nKeys, keys, device) {
  var sh = tab_(name, header);
  var key = keys.join('\u001f');
  var last = sh.getLastRow();
  var rowNum = 0;
  var n = Math.min(Math.max(last - 1, 0), 3000);
  if (n > 0) {
    var vals = sh.getRange(last - n + 1, 1, n, nKeys).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (cell_(vals[i][0]) < keys[0]) break;
      if (vals[i].map(cell_).join('\u001f') === key) { rowNum = last - n + 1 + i; break; }
    }
  }
  var stamp = now_().toISOString();
  if (!rowNum) {
    sh.appendRow(keys.map(txt_).concat([1, device === 'mobile' ? 1 : 0, device === 'desktop' ? 1 : 0, stamp]));
  } else {
    var c = sh.getRange(rowNum, nKeys + 1, 1, 3).getValues()[0];
    sh.getRange(rowNum, nKeys + 1, 1, 4).setValues([[Number(c[0] || 0) + 1, Number(c[1] || 0) + (device === 'mobile' ? 1 : 0), Number(c[2] || 0) + (device === 'desktop' ? 1 : 0), stamp]]);
  }
}

/* ---------- B2B pre-sale / waitlist (no payment taken here) ---------- */

function preorder_(req) {
  if (req.website) return { ok: true }; // honeypot: silently ignore bots
  if (!truthy_(req.consent)) throw userError_('consent_required', 'consent');
  if (!truthy_(req.b2b)) throw userError_('b2b_required', 'b2b');
  if (String(req.consent_version || '') !== APP.consentVersion) throw userError_('consent_outdated', 'consent_version');
  var email = validEmail_(req.email);
  var rut = normRut_(req.rut);
  if (!rut) throw userError_('bad_request', 'rut');
  var razon = clean_(req.razon, 140);
  if (razon.length < 2) throw userError_('bad_request', 'razon');
  var offer = String(req.offer || '');
  if (!APP.offers.hasOwnProperty(offer)) throw userError_('bad_request', 'offer');
  var size = String(req.size || 'nose');
  if (APP.sizes.indexOf(size) < 0) throw userError_('bad_request', 'size');
  var sector = String(req.sector || 'otro');
  if (APP.sectors.indexOf(sector) < 0) throw userError_('bad_request', 'sector');
  var pct = req.diag_pct === undefined || req.diag_pct === '' || req.diag_pct === null ? '' : Math.max(0, Math.min(100, Math.round(Number(req.diag_pct) || 0)));
  var rec = {
    email: email, rut: rut, razon: razon, nombre: clean_(req.nombre, 80), size: size, sector: sector, offer: offer,
    price: APP.offers[offer], variant: req.variant === 'a' || req.variant === 'b' ? req.variant : '',
    buzon: truthy_(req.buzon) ? 'si' : '', pct: pct, page: trackPage_(req.page) || '', test: isTestEmail_(email),
  };
  if (!rateOk_('preorder', APP.formRatePerMin)) throw userError_('rate_limited');
  var updated = withLock_(function () {
    var sh = tab_('Preventa', PREORDER_HEADER);
    var stamp = now_().toISOString();
    var last = sh.getLastRow();
    var row = 0;
    if (last >= 2) {
      var keys = sh.getRange(2, 3, last - 1, 2).getValues();
      for (var i = keys.length - 1; i >= 0; i--) if (String(keys[i][0]) === email && String(keys[i][1]) === rut) { row = i + 2; break; }
    }
    var values = [txt_(rec.email), txt_(rec.rut), txt_(rec.razon), txt_(rec.nombre), rec.size, rec.sector, rec.offer, rec.price, rec.variant,
      rec.buzon, rec.pct, APP.consentVersion, txt_(rec.page), 'activa', rec.test ? 'yes' : ''];
    if (row) {
      sh.getRange(row, 2, 1, 1 + values.length).setValues([[stamp].concat(values)]);
      return true;
    }
    sh.appendRow([stamp, stamp].concat(values));
    return false;
  });
  return { ok: true, updated: updated, price: rec.price };
}

/* ---------- data-subject requests about OUR data (Ley 19.628 / 21.719, art. 11) ---------- */

function rights_(req) {
  if (req.website) return { ok: true };
  var type = String(req.type || '');
  if (APP.rightsTypes.indexOf(type) < 0) throw userError_('bad_request', 'type');
  var email = validEmail_(req.email);
  var message = clean_(req.message, 1000);
  if (!rateOk_('rights', 20)) throw userError_('rate_limited');
  return withLock_(function () {
    var matched = 0;
    var sh = tab_('Preventa', PREORDER_HEADER);
    var last = sh.getLastRow();
    var auto = type === 'supresion' || type === 'oposicion';
    if (last >= 2) {
      var rows = sh.getRange(2, 1, last - 1, PREORDER_HEADER.length).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][2]) !== email) continue;
        matched++;
        if (auto) {
          // Deletion or objection stops all use: personal fields are blanked at once.
          sh.getRange(i + 2, 2, 1, 5).setValues([[now_().toISOString(), '(suprimido) ' + sha256Hex_(email).slice(0, 16), '', '', '']]);
          sh.getRange(i + 2, 16).setValue(type === 'supresion' ? 'suprimida' : 'oposicion');
        }
      }
    }
    var status = auto ? 'resuelta_automaticamente' : 'responder_por_correo';
    var due = Utilities.formatDate(new Date(now_().getTime() + 30 * 86400000), APP.tz, 'yyyy-MM-dd');
    tab_('Solicitudes', REQUEST_HEADER).appendRow([now_().toISOString(), type, sha256Hex_(email), txt_(message), matched, status, due, isTestEmail_(email) ? 'yes' : '']);
    return { ok: true, type: type, matched: matched > 0, status: status, due: due };
  });
}

/* ---------- operator views (admin key) ---------- */

function summary_(req) {
  checkAdmin_(req);
  var out = { ok: true, sheetUrl: ss_().getUrl(), preorders: { real: 0, test: 0, active: 0, byOffer: {}, byVariant: {}, buzon: 0 }, requests: { real: 0, test: 0, open: 0 }, stats: {} };
  var po = tab_('Preventa', PREORDER_HEADER);
  if (po.getLastRow() >= 2) po.getRange(2, 1, po.getLastRow() - 1, PREORDER_HEADER.length).getValues().forEach(function (r) {
    var test = r[16] === 'yes';
    out.preorders[test ? 'test' : 'real']++;
    if (!test && r[15] === 'activa') {
      out.preorders.active++;
      out.preorders.byOffer[r[8]] = (out.preorders.byOffer[r[8]] || 0) + 1;
      out.preorders.byVariant[r[10] || '-'] = (out.preorders.byVariant[r[10] || '-'] || 0) + 1;
      if (r[11] === 'si') out.preorders.buzon++;
    }
  });
  var rq = tab_('Solicitudes', REQUEST_HEADER);
  if (rq.getLastRow() >= 2) rq.getRange(2, 1, rq.getLastRow() - 1, REQUEST_HEADER.length).getValues().forEach(function (r) {
    var test = r[7] === 'yes';
    out.requests[test ? 'test' : 'real']++;
    if (!test && r[5] === 'responder_por_correo') out.requests.open++;
  });
  var st = tab_('Stats', STATS_HEADER);
  if (st.getLastRow() >= 2) st.getRange(2, 1, st.getLastRow() - 1, STATS_HEADER.length).getValues().forEach(function (r) {
    var src = String(r[5]);
    var k = cell_(r[0]) + ' ' + r[3] + (r[4] ? ' ' + r[4] : '') + (src === 'e2e' ? ' [e2e]' : '');
    out.stats[k] = (out.stats[k] || 0) + Number(r[8] || 0);
  });
  // Hits that are not visits, by reason: 'fecha evento [variante] |motivo' -> count; and views counted vs raw per day.
  out.excluded = {};
  out.views = {};
  var view = function (d) { return out.views[d] || (out.views[d] = { counted: 0, excluded: 0, raw: 0 }); };
  if (st.getLastRow() >= 2) st.getRange(2, 1, st.getLastRow() - 1, STATS_HEADER.length).getValues().forEach(function (r) {
    if (r[3] === 'view') { var v = view(cell_(r[0])); v.counted += Number(r[8] || 0); v.raw += Number(r[8] || 0); }
  });
  var ex = tab_('Exclus', EXCL_HEADER);
  if (ex.getLastRow() >= 2) ex.getRange(2, 1, ex.getLastRow() - 1, EXCL_HEADER.length).getValues().forEach(function (r) {
    var k = cell_(r[0]) + ' ' + r[3] + (r[4] ? ' ' + r[4] : '') + ' |' + r[5];
    out.excluded[k] = (out.excluded[k] || 0) + Number(r[6] || 0);
    if (r[3] === 'view') { var v = view(cell_(r[0])); v.excluded += Number(r[6] || 0); v.raw += Number(r[6] || 0); }
  });
  if (req.email) out.hasEmail = po.getLastRow() >= 2 && po.getRange(2, 3, po.getLastRow() - 1, 1).getValues().some(function (r) { return String(r[0]) === String(req.email).toLowerCase(); });
  return out;
}

function purgeTests_(req) {
  checkAdmin_(req);
  return withLock_(function () {
    var n = 0;
    [['Preventa', PREORDER_HEADER, 16], ['Solicitudes', REQUEST_HEADER, 7]].forEach(function (t) {
      var sh = tab_(t[0], t[1]);
      for (var r = sh.getLastRow(); r >= 2; r--) if (sh.getRange(r, t[2] + 1).getValue() === 'yes') { sh.deleteRow(r); n++; }
    });
    return { ok: true, deleted: n };
  });
}

function resetStats_(req) {
  checkAdmin_(req);
  return withLock_(function () {
    var sh = tab_('Stats', STATS_HEADER);
    var n = Math.max(sh.getLastRow() - 1, 0);
    if (n) sh.deleteRows(2, n);
    return { ok: true, deleted: n };
  });
}
