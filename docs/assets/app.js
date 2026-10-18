/* Candado Pyme: interfaz del autodiagnóstico, del generador y de la preventa. Depende de core.js (window.CP). */
(function () {
  'use strict';
  var CP = window.CP;
  window.CP_API = 'https://script.google.com/macros/s/AKfycbzO-UZhV1aVTEDgAj95jk2fktbBxOZNr1eQ9kvv1_nOu6q2LMCnBhsgSt-pBGpJNyKx/exec';
  var params = new URLSearchParams(location.search);
  // Variante de precio: la resuelve cro.js (OCTAVE_XP 'price', alterna por día de Santiago, ?precio=a|b la fuerza).
  // Si cro.js no cargó, la misma regla de core.js da la misma letra.
  var variant = (window.octaveCro && window.octaveCro.v('price')) || CP.priceVariant(new Date(), params.get('precio'));
  window.cpVariant = variant;
  function goal(g) { if (window.octaveCro) window.octaveCro.goal(g); }
  var price = CP.PRICES[variant];
  function tr(e) { if (window.cpTrack) window.cpTrack(e); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var esc = CP.esc;

  // Precio de la variante del día en toda la página.
  $$('[data-price]').forEach(function (el) { el.textContent = CP.clp(price); });
  var offer = $('#p-offer');
  if (offer) offer.value = 'kit-' + price;

  /* ---------------- autodiagnóstico ---------------- */
  var diag = $('#diag');
  if (diag) {
    var LABELS = [['si', 'Sí'], ['parcial', 'En parte'], ['no', 'No'], ['nose', 'No sé'], ['na', 'No aplica']];
    $('#questions').innerHTML = CP.QUESTIONS.map(function (q, i) {
      var opts = LABELS.filter(function (l) { return l[0] !== 'na' || q.na; }).map(function (l) {
        return '<label><input type="radio" name="' + q.id + '" value="' + l[0] + '"><span>' + l[1] + '</span></label>';
      }).join('');
      return '<div class="q" id="q-' + q.id + '" role="group" aria-labelledby="h-' + q.id + '">' +
        '<h3 id="h-' + q.id + '"><span class="n">' + (i + 1) + '.</span>' + esc(q.q) + '</h3>' +
        '<p class="help">' + esc(q.help) + ' <span class="tag">' + esc(q.art) + ' · ' + esc(CP.WHEN_LABEL[q.when]) + '</span></p>' +
        '<div class="answers">' + opts + '</div></div>';
    }).join('');
    var started = false;
    function answers() {
      var a = {};
      CP.QUESTIONS.forEach(function (q) { var c = $('input[name="' + q.id + '"]:checked', diag); if (c) a[q.id] = c.value; });
      return a;
    }
    function progress() {
      var n = Object.keys(answers()).length;
      $('#progress-text').textContent = n + ' de ' + CP.QUESTIONS.length + ' respondidas';
      $('#progress-bar').style.width = Math.round(100 * n / CP.QUESTIONS.length) + '%';
    }
    diag.addEventListener('change', function (e) {
      if (e.target.type === 'radio') {
        if (!started) { started = true; tr('diag_start'); }
        progress();
      }
    });
    diag.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = answers();
      var missing = CP.QUESTIONS.filter(function (q) { return !a[q.id]; });
      var err = $('#diag-error');
      if (missing.length) {
        err.hidden = false;
        err.textContent = 'Te ' + (missing.length === 1 ? 'falta 1 pregunta' : 'faltan ' + missing.length + ' preguntas') + ' (la ' + (CP.QUESTIONS.indexOf(missing[0]) + 1) + ' es la primera).';
        $('#q-' + missing[0].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      err.hidden = true;
      renderResult(CP.score(a), $('#size').value);
      tr('diag_complete');
    });
    progress();
  }

  function renderResult(r, size) {
    var bandTxt = { alto: 'Bien encaminada', medio: 'A medio camino', bajo: 'Hay bastante por hacer' }[r.band];
    var legal = r.gaps.filter(function (g) { return g.q.when !== 'voluntario'; }).length;
    var sme = size === 'micro' || size === 'pequena' || size === 'mediana';
    var sizeNote = sme
      ? '<p class="note"><b>Tu empresa es de menor tamaño (Ley 20.416).</b> Durante los primeros 12 meses desde el 1 de diciembre de 2026, la Agencia <em>puede</em> sancionarla solo con amonestación escrita (art. 6° transitorio). Es una facultad, no una garantía, y la amonestación queda en el registro público (art. 39). Las obligaciones rigen igual desde el primer día.</p>'
      : size === 'grande'
        ? '<p class="note"><b>Empresa grande:</b> no le aplica la regla transitoria del art. 6°. Las multas llegan a 5.000, 10.000 o 20.000 UTM según la gravedad y, si reincide en infracciones graves o gravísimas, hasta el 2% o 4% de sus ingresos anuales (art. 35).</p>'
        : '<p class="note">Si tu empresa vendió hasta 100.000 UF el último año, es de menor tamaño y durante los primeros 12 meses la Agencia <em>puede</em> limitarse a una amonestación escrita (art. 6° transitorio). Las obligaciones rigen igual desde el 1 de diciembre de 2026.</p>';
    var gaps = r.gaps.map(function (g) {
      var q = g.q;
      return '<li><span class="pill' + (q.when === 'voluntario' ? ' v' : '') + '">' + esc(CP.WHEN_LABEL[q.when]) + '</span><span class="meta">' + esc(q.art) + (g.v === 'parcial' ? ' · respondiste «En parte»' : g.v === 'nose' ? ' · respondiste «No sé»' : '') + '</span>' +
        '<p style="margin:6px 0 4px"><b>' + esc(q.gap) + '</b></p>' +
        '<p class="meta" style="margin:0">' + esc(q.risk) + ' En el kit: ' + esc(q.kit) + '.</p></li>';
    }).join('');
    var out = $('#diag-result');
    out.innerHTML = '<div class="result" id="resultado" tabindex="-1">' +
      '<p class="fine" style="margin:0">Tu resultado</p>' +
      '<p class="score band-' + r.band + '" data-pct="' + r.pct + '">' + r.pct + '%</p>' +
      '<p style="font-size:1.15rem;margin:6px 0 2px"><b>' + bandTxt + '</b></p>' +
      '<p>' + (r.gaps.length ? r.gaps.length + (r.gaps.length === 1 ? ' brecha' : ' brechas') + ', ' + legal + ' de ellas sobre obligaciones legales. Ordenadas de mayor a menor importancia:' : 'No detectamos brechas en tus respuestas. Revisa cada punto una vez al año y cuando la Agencia publique instrucciones.') + '</p>' +
      sizeNote +
      (r.gaps.length ? '<ol class="gaps" id="gap-list">' + gaps + '</ol>' : '') +
      '<div class="ctas"><a class="btn" href="../kit/?diag=' + r.pct + '" data-mesure="cta_click">Ver el kit con las plantillas</a>' +
      '<a class="btn ghost" href="../politica-de-privacidad/" data-mesure="cta_click">Generar mi política (gratis)</a>' +
      '<button class="btn ghost" type="button" onclick="window.print()">Imprimir o guardar en PDF</button></div>' +
      '<p class="fine">Puntaje: ' + String(r.score).replace('.', ',') + ' de ' + r.max + ' puntos (las preguntas «No aplica» no cuentan). Resultado orientativo, no es asesoría legal.</p></div>';
    out.hidden = false;
    $('#resultado').focus();
    $('#resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- generador de política ---------------- */
  var gen = $('#gen');
  if (gen) {
    var DEFAULTS = {
      people: ['clientes', 'usuarios'], data: ['identificacion', 'contacto', 'compras', 'navegacion'],
      purposes: ['venta', 'facturacion', 'reclamos'], recipients: ['hosting', 'pagos', 'contabilidad'],
      security: ['accesos', 'mfa', 'respaldos', 'confidencialidad'], sources: ['titular'],
    };
    var DICTS = { people: CP.PEOPLE, data: CP.DATA, purposes: CP.PURPOSES, recipients: CP.RECIPIENTS, security: CP.SECURITY, sources: CP.SOURCES };
    $$('[data-checks]', gen).forEach(function (box) {
      var key = box.getAttribute('data-checks');
      var dict = DICTS[key];
      box.innerHTML = Object.keys(dict).map(function (k) {
        var v = dict[k];
        var label = typeof v === 'string' ? esc(v.charAt(0).toUpperCase() + v.slice(1)) : esc(v.t) + '<br><small class="muted">' + esc(v.b) + '</small>';
        return '<label class="check"><input type="checkbox" name="' + key + '" value="' + k + '"' + (DEFAULTS[key].indexOf(k) >= 0 ? ' checked' : '') + '> <span>' + label + '</span></label>';
      }).join('');
    });
    $('#g-intl').addEventListener('change', function () { $('#intl-detail').hidden = !this.checked; });
    $('#g-auto').addEventListener('change', function () { $('#auto-detail').hidden = !this.checked; });
    var last = null;
    function collect() {
      function v(id) { return ($('#g-' + id).value || '').trim(); }
      function checks(name) { return $$('input[name="' + name + '"]:checked', gen).map(function (i) { return i.value; }); }
      var today = new Date();
      var iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      return {
        razon: v('razon'), fantasia: v('fantasia'), rut: v('rut'), rep: v('rep'), domicilio: v('domicilio'), email: v('email'), form: v('form'),
        delegado: v('delegado'), people: checks('people'), data: checks('data'), purposes: checks('purposes'), recipients: checks('recipients'),
        intl: $('#g-intl').checked, intlDetail: v('intlDetail'), intlBasis: $('#g-intlBasis').value,
        retention: { clientes: v('ret-clientes'), postulantes: v('ret-postulantes'), camaras: v('ret-camaras') },
        security: checks('security'), sources: checks('sources'), auto: $('#g-auto').checked, autoDetail: v('autoDetail'),
        date: iso, version: v('version') || '1.0',
      };
    }
    gen.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.invalid', gen).forEach(function (el) { el.classList.remove('invalid'); });
      var o = collect();
      var errs = CP.validatePolicy(o);
      if (o.rut && !CP.normRut(o.rut)) errs.push({ field: 'rut', msg: 'El RUT no es válido (revisa el dígito verificador).' });
      var box = $('#gen-errors');
      if (errs.length) {
        box.hidden = false;
        box.innerHTML = errs.map(function (x) { return esc(x.msg); }).join('<br>');
        errs.forEach(function (x) { var el = $('#g-' + x.field); if (el) el.classList.add('invalid'); });
        var first = $('#g-' + errs[0].field) || $('[data-checks="' + errs[0].field + '"]');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      box.hidden = true;
      last = CP.buildPolicy(o);
      $('#gen-preview').innerHTML = last.html;
      $('#gen-tools').hidden = false;
      tr('policy_generated');
      if (window.innerWidth < 980) $('#gen-tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    function download(name, type, content) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: type + ';charset=utf-8' }));
      a.download = name;
      goal('download');
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function slug() { return (last.title.replace(/^Política de tratamiento de datos personales de /, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'empresa').toLowerCase(); }
    $('#gen-copy').addEventListener('click', function () {
      if (!last) return;
      var btn = this;
      function done() { btn.textContent = 'Copiado'; setTimeout(function () { btn.textContent = 'Copiar texto'; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(last.text).then(done, fallback); else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = last.text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (x) {} t.remove(); }
    });
    $('#gen-dl-html').addEventListener('click', function () {
      if (!last) return;
      download('politica-privacidad-' + slug() + '.html', 'text/html', '<!doctype html>\n<html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(last.title) + '</title>' +
        '<style>body{font:16px/1.6 Arial,sans-serif;max-width:760px;margin:2rem auto;padding:0 16px;color:#1f2933}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}.meta{color:#5b6670}</style></head><body>\n' + last.html + '\n</body></html>\n');
    });
    $('#gen-dl-txt').addEventListener('click', function () { if (last) download('politica-privacidad-' + slug() + '.txt', 'text/plain', last.text + '\n'); });
  }

  /* ---------------- preventa ---------------- */
  var po = $('#preorder');
  if (po) {
    var rutIn = $('#p-rut');
    // El mensaje de error ocupa siempre su espacio (visibility), para que mostrarlo u ocultarlo no mueva el formulario.
    function rutCheck(showErrors) {
      var ok = !rutIn.value.trim() || !!CP.normRut(rutIn.value);
      if (ok || showErrors) {
        $('#p-rut-err').style.visibility = ok ? 'hidden' : 'visible';
        rutIn.classList.toggle('invalid', !ok);
      }
    }
    rutIn.addEventListener('input', function () { rutCheck(false); });
    rutIn.addEventListener('blur', function () { rutCheck(true); });
    po.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#p-error');
      var msgs = [];
      $$('.invalid', po).forEach(function (el) { el.classList.remove('invalid'); });
      function bad(id, m) { msgs.push(m); $(id).classList.add('invalid'); }
      if (($('#p-razon').value || '').trim().length < 2) bad('#p-razon', 'Escribe la razón social.');
      if (!CP.normRut(rutIn.value)) bad('#p-rut', 'El RUT no es válido.');
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(($('#p-email').value || '').trim())) bad('#p-email', 'Revisa el correo.');
      if (!$('#p-b2b').checked) msgs.push('La reserva es solo para empresas: marca la casilla correspondiente.');
      if (!$('#p-consent').checked) msgs.push('Necesitamos tu autorización para guardar la reserva.');
      if (msgs.length) { err.hidden = false; err.innerHTML = msgs.map(esc).join('<br>'); return; }
      err.hidden = true;
      var btn = $('#p-submit');
      btn.disabled = true;
      var body = {
        action: 'preorder', email: $('#p-email').value.trim(), rut: rutIn.value.trim(), razon: $('#p-razon').value.trim(), nombre: $('#p-nombre').value.trim(),
        size: $('#p-size').value, sector: $('#p-sector').value, offer: 'kit-' + price, variant: variant, buzon: $('#p-buzon').checked,
        b2b: true, consent: true, consent_version: 'pv-2026-10-13', diag_pct: params.get('diag') || '', page: location.pathname, website: $('#p-website').value,
      };
      fetch(window.CP_API + '?action=preorder', { method: 'POST', credentials: 'omit', body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.field ? 'campo ' + res.field : res.error);
          tr('preorder_submit');
          goal('preorder');
          if (body.buzon) goal('waitlist');
          po.hidden = true;
          var ok = $('#p-ok');
          ok.hidden = false;
          ok.innerHTML = '<p><b>Reserva registrada' + (res.updated ? ' (actualizamos tu reserva anterior)' : '') + '.</b></p><p>Precio reservado: ' + CP.clp(price) + ' CLP para ' + esc(body.razon) + '. No hemos cobrado nada. El equipo de Jalonel te escribirá a ' + esc(body.email) + ' cuando el pago con tarjeta esté habilitado.</p><p class="fine">Para anular o corregir la reserva, responde ese correo o escribe a contact@jalonel.com.</p>';
          ok.setAttribute('tabindex', '-1');
          ok.focus();
        })
        .catch(function (x) {
          btn.disabled = false;
          err.hidden = false;
          err.textContent = 'No pudimos registrar la reserva (' + (x && x.message ? x.message : 'error de red') + '). Inténtalo de nuevo o escríbenos a contact@jalonel.com.';
        });
    });
  }
})();
