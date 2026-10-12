/* Candado Pyme core: autodiagnóstico Ley 21.719 (scoring + brechas) y generador de política de privacidad.
   Script plano para el navegador (window.CP) y CommonJS para los tests unitarios. Sin dependencias.
   Fuente legal: Ley N° 21.719 (Diario Oficial N° 44.023, 13-12-2024), que modifica la Ley N° 19.628.
   Los artículos citados son los de la Ley N° 19.628 tal como queda desde el 1 de diciembre de 2026. */
(function (root) {
  'use strict';

  /* ---------- autodiagnóstico ---------- */
  // Respuestas: 'si' = 1, 'parcial' = 0,5, 'no' / 'nose' = 0, 'na' = fuera del puntaje.
  var VALUE = { si: 1, parcial: 0.5, no: 0, nose: 0 };

  // when: 'dic2026' = obligación legal desde el 1-12-2026; 'practica' = no se llama así en la ley, pero es la forma
  // práctica de cumplir los artículos citados; 'voluntario' = la ley lo deja a decisión de la empresa.
  var QUESTIONS = [
    { id: 'inventario', w: 3, when: 'practica', na: false,
      q: '¿Sabes qué datos personales trata tu empresa, de quién (clientes, trabajadores, postulantes, proveedores) y para qué?',
      help: 'Una lista simple basta: cada base de datos, qué contiene, para qué se usa y quién tiene acceso.',
      art: 'Arts. 14 ter d) y 5°',
      gap: 'Arma un inventario de tus tratamientos. La ley no exige un "registro de actividades" con ese nombre, pero sin esa lista no puedes publicar lo que pide el art. 14 ter d) ni contestar una solicitud de acceso (art. 5°).',
      risk: 'Sin inventario, el resto de las obligaciones se cumple a ciegas.',
      kit: 'Registro de tratamientos (XLSX)' },
    { id: 'licitud', w: 3, when: 'dic2026', na: false,
      q: 'Para cada uso de datos, ¿puedes decir en qué base legal se apoya (consentimiento, contrato, obligación legal, interés legítimo u otra)?',
      help: 'Ejemplo: la boleta se emite por obligación legal; el newsletter, por consentimiento.',
      art: 'Arts. 3° a), 12 y 13',
      gap: 'Asigna una base de licitud a cada tratamiento y guarda cómo la acreditas. El art. 13 dice que "el responsable deberá acreditar la licitud del tratamiento".',
      risk: 'Tratar datos sin base legal es infracción grave (art. 34 ter a): multa de hasta 10.000 UTM.',
      kit: 'Registro de tratamientos (XLSX)' },
    { id: 'politica', w: 3, when: 'dic2026', na: false,
      q: '¿Tu sitio web (u otro medio) muestra una política de tratamiento de datos con fecha, versión y toda la información del art. 14 ter?',
      help: 'El art. 14 ter pide, entre otros: quién es el responsable, cómo contactarlo, qué datos trata, para qué, con qué base, a quién los comunica, cuánto tiempo los guarda y qué medidas de seguridad usa.',
      art: 'Art. 14 ter',
      gap: 'Publica una política con los 12 puntos del art. 14 ter, con fecha y versión, accesible de forma permanente. Puedes partir con el generador gratuito de este sitio.',
      risk: 'Incumplir el deber de información es infracción leve (art. 34 bis a): amonestación o multa de hasta 5.000 UTM.',
      kit: 'Generador de política (gratis)' },
    { id: 'canal', w: 2, when: 'dic2026', na: false,
      q: '¿Hay un correo, formulario o dirección publicados y operativos para que las personas ejerzan sus derechos?',
      help: 'Debe ser un medio que alguien revise de verdad, no un correo genérico que nadie abre.',
      art: 'Arts. 11 y 14 ter c)',
      gap: 'Define un correo o formulario para solicitudes, publícalo en tu política y asigna quién lo revisa.',
      risk: 'Carecer de un medio de contacto actualizado y operativo es infracción leve (art. 34 bis b).',
      kit: 'Procedimiento de solicitudes (DOCX)' },
    { id: 'plazo', w: 3, when: 'dic2026', na: false,
      q: '¿Sabes acusar recibo y responder por escrito una solicitud en 30 días corridos, guardando respaldo de la respuesta? ¿Y contestar un pedido de bloqueo en 2 días hábiles?',
      help: 'Acceso, rectificación, supresión, oposición y portabilidad: 30 días corridos, prorrogables una vez por hasta 30 más. Bloqueo temporal: 2 días hábiles.',
      art: 'Arts. 8° ter y 11',
      gap: 'Ten un procedimiento escrito con plazos, modelos de respuesta y una planilla de seguimiento. Guarda la fecha, el destino y el texto íntegro de cada respuesta (art. 11).',
      risk: 'Responder tarde o incompleto es infracción leve (art. 34 bis c); impedir el ejercicio de derechos es grave (art. 34 ter e).',
      kit: 'Procedimiento de solicitudes (DOCX) + planilla de plazos (XLSX)' },
    { id: 'consentimiento', w: 2, when: 'dic2026', na: true,
      q: 'Cuando pides consentimiento (newsletter, promociones, fotos), ¿es previo, específico e informado, y la persona puede retirarlo tan fácil como lo dio? ¿Dejas de enviar publicidad apenas alguien se opone?',
      help: 'Si no pides consentimiento para nada, marca "No aplica".',
      art: 'Arts. 8° b) y 12',
      gap: 'Revisa tus formularios: casilla sin marcar por defecto, finalidad explicada, retiro simple y gratuito. Atiende la oposición al marketing directo en todos tus canales.',
      risk: 'El responsable debe probar que contó con el consentimiento (art. 12). Sin esa prueba, el tratamiento puede quedar sin base legal.',
      kit: 'Procedimiento de solicitudes (DOCX)' },
    { id: 'sensibles', w: 2, when: 'dic2026', na: true,
      q: 'Si tratas datos sensibles (salud, huella o rostro para control de asistencia, afiliación sindical, entre otros), ¿tienes consentimiento expreso o una excepción legal identificada?',
      help: 'Para biometría el art. 16 ter exige además informar el sistema usado, la finalidad, el período y cómo ejercer derechos. Si no tratas datos sensibles, marca "No aplica".',
      art: 'Arts. 16, 16 bis y 16 ter',
      gap: 'Identifica cada dato sensible, su base (consentimiento expreso o excepción del art. 16 / 16 bis) y entrega la información del art. 16 ter si usas biometría.',
      risk: 'Tratar datos sensibles a sabiendas en contra de la ley es infracción gravísima (art. 34 quáter e): multa de hasta 20.000 UTM.',
      kit: 'Plantillas para trabajadores (DOCX)' },
    { id: 'menores', w: 2, when: 'dic2026', na: true,
      q: 'Si tratas datos de menores de 18 años, ¿tienes la autorización de padres o representantes cuando la ley la exige (menores de 14, y datos sensibles de menores de 16)?',
      help: 'Colegios, jardines, academias, clínicas, apps. Si no tratas datos de menores, marca "No aplica".',
      art: 'Art. 16 quáter',
      gap: 'Pide la autorización de padres o representantes para menores de 14 años y para datos sensibles de menores de 16, y documenta que tu tratamiento atiende al interés superior del niño.',
      risk: 'Tratar datos de niños, niñas y adolescentes infringiendo la ley es infracción grave (art. 34 ter g).',
      kit: 'Registro de tratamientos (XLSX)' },
    { id: 'encargados', w: 2, when: 'dic2026', na: false,
      q: '¿Tienes contrato escrito con cada proveedor que trata datos por cuenta tuya (contador externo, software de remuneraciones, hosting, CRM, call center)?',
      help: 'El contrato debe fijar objeto, duración, finalidad, tipo de datos, categorías de titulares y derechos y obligaciones de las partes.',
      art: 'Art. 15 bis',
      gap: 'Firma o agrega a cada contrato una cláusula de encargo de tratamiento con las menciones del art. 15 bis (instrucciones, confidencialidad, seguridad, aviso de incidentes, subencargos con autorización escrita, devolución o supresión al terminar).',
      risk: 'Si el proveedor usa los datos para otro fin, la ley lo trata como responsable, pero tú sigues respondiendo frente a los titulares.',
      kit: 'Cláusula de encargado (DOCX)' },
    { id: 'transferencias', w: 1, when: 'dic2026', na: true,
      q: 'Si tus datos se guardan o procesan fuera de Chile (Google, Microsoft, AWS, Shopify u otros), ¿sabes en qué país y con qué garantía?',
      help: 'Si todo queda en servidores en Chile, marca "No aplica".',
      art: 'Arts. 27 y 28',
      gap: 'Lista tus proveedores en el extranjero, el país y la garantía usada (cláusulas contractuales u otra del art. 27). Cuando la Agencia publique países adecuados y cláusulas modelo (art. 28), ajusta.',
      risk: 'Transferir datos al extranjero contra la ley es infracción grave (art. 34 ter m).',
      kit: 'Registro de tratamientos (XLSX)' },
    { id: 'seguridad', w: 3, when: 'dic2026', na: false,
      q: '¿Tienes medidas de seguridad básicas y escritas: cuentas por persona, doble factor en el correo, respaldos que sabes restaurar, permisos según el cargo?',
      help: 'La ley no fija una lista cerrada; pide medidas adecuadas al riesgo y poder demostrarlas.',
      art: 'Arts. 14 quinquies y 14 septies',
      gap: 'Documenta tus medidas de seguridad y revísalas cada cierto tiempo. Si hay un incidente y se llega a una controversia judicial o administrativa, te toca acreditar que existían y funcionaban (art. 14 quinquies). La Agencia fijará estándares diferenciados por tamaño de empresa (art. 14 septies).',
      risk: 'Vulnerar las obligaciones de seguridad es infracción grave (art. 34 ter j).',
      kit: 'Procedimiento de brechas (DOCX)' },
    { id: 'brechas', w: 2, when: 'dic2026', na: false,
      q: 'Si mañana se filtran datos (notebook robado, correo hackeado, ransomware), ¿sabes quién decide, cómo avisar a la Agencia y cómo dejar registro?',
      help: 'La ley pide reportar a la Agencia "por los medios más expeditos posibles y sin dilaciones indebidas" cuando hay riesgo razonable para los titulares.',
      art: 'Art. 14 sexies',
      gap: 'Ten un protocolo de incidentes: quién evalúa, cuándo se reporta a la Agencia, cuándo hay que avisar a los afectados (datos sensibles, de menores de 14 o financieros) y un registro de cada incidente.',
      risk: 'Omitir comunicaciones o registros de incidentes es grave (art. 34 ter k); omitirlos deliberadamente es gravísimo (art. 34 quáter f).',
      kit: 'Procedimiento de brechas (DOCX)' },
    { id: 'conservacion', w: 2, when: 'dic2026', na: false,
      q: '¿Tienes plazos de conservación definidos y borras o anonimizas lo que ya no necesitas (por ejemplo, CV de postulantes no seleccionados)?',
      help: 'Guardar "por si acaso" no es una finalidad.',
      art: 'Arts. 3° c), 7° a) y 14 ter i)',
      gap: 'Define un plazo por tipo de dato, publícalo en tu política (art. 14 ter i) y agenda una limpieza periódica.',
      risk: 'Tratar datos innecesarios para la finalidad es infracción grave (art. 34 ter c).',
      kit: 'Registro de tratamientos (XLSX)' },
    { id: 'confidencialidad', w: 1, when: 'dic2026', na: false,
      q: '¿Tus trabajadores y prestadores que acceden a datos personales tienen una obligación escrita de confidencialidad?',
      help: 'Puede ir en el contrato de trabajo, en un anexo o en el reglamento interno.',
      art: 'Art. 14 bis',
      gap: 'Agrega una cláusula de confidencialidad y protección de datos en contratos o anexos, y explícala en la inducción.',
      risk: 'Vulnerar el deber de secreto es infracción grave (art. 34 ter i); si son datos sensibles, gravísima (art. 34 quáter d).',
      kit: 'Plantillas para trabajadores (DOCX)' },
    { id: 'delegado', w: 1, when: 'voluntario', na: false,
      q: '¿Hay una persona a cargo de la protección de datos en tu empresa, con tiempo y medios para hacerlo?',
      help: 'Designar un delegado es voluntario (arts. 49 y 50). En una micro, pequeña o mediana empresa puede asumirlo el dueño.',
      art: 'Arts. 48, 49 y 50',
      gap: 'Nombra a alguien responsable del tema (puede ser el dueño). Si además adoptas un modelo de prevención y la Agencia lo certifica, cuenta como atenuante (art. 36 N° 5).',
      risk: 'No es obligatorio, pero el art. 48 pide a todo responsable adoptar acciones para prevenir infracciones.',
      kit: 'Ficha delegado de protección de datos (DOCX)' },
  ];

  var WHEN_LABEL = {
    dic2026: 'Obligación desde el 1-12-2026',
    practica: 'Herramienta práctica para cumplir',
    voluntario: 'Voluntario',
  };

  function band(pct) { return pct >= 75 ? 'alto' : pct >= 40 ? 'medio' : 'bajo'; }

  /** answers: {id: 'si'|'parcial'|'no'|'nose'|'na'} -> {score, max, pct, band, answered, total, gaps:[...]} (brechas: mayor pérdida primero). */
  function score(answers) {
    var s = 0, max = 0, answered = 0, gaps = [];
    QUESTIONS.forEach(function (q, i) {
      var v = answers[q.id];
      if (!v) return;
      answered++;
      if (v === 'na') {
        if (!q.na) throw new Error('na no permitido en ' + q.id);
        return;
      }
      var val = VALUE[v];
      if (val === undefined) throw new Error('respuesta inválida ' + v);
      s += q.w * val; max += q.w;
      if (val < 1) gaps.push({ id: q.id, w: q.w, v: v, lost: q.w * (1 - val), i: i, q: q });
    });
    gaps.sort(function (a, b) { return b.lost - a.lost || a.i - b.i; });
    var pct = max ? Math.round((s / max) * 100) : 0;
    return { score: s, max: max, pct: pct, band: band(pct), answered: answered, total: QUESTIONS.length, gaps: gaps };
  }

  /** Tamaño según ventas anuales en UF (Ley 20.416, art. 2°). */
  function sizeFromUF(uf) {
    var n = Number(uf);
    if (!isFinite(n) || n < 0) return null;
    if (n <= 2400) return 'micro';
    if (n <= 25000) return 'pequena';
    if (n <= 100000) return 'mediana';
    return 'grande';
  }

  /* ---------- generador de política de tratamiento de datos (art. 14 ter) ---------- */

  var DATA = {
    identificacion: 'Datos de identificación: nombre, RUT o número de documento',
    contacto: 'Datos de contacto: correo electrónico, teléfono y dirección',
    compras: 'Historial de compras, pagos y despachos (no guardamos el número completo de tu tarjeta cuando pagas a través de una pasarela de pago)',
    navegacion: 'Datos de navegación en nuestro sitio: dirección IP, tipo de dispositivo y navegador, páginas visitadas y cookies',
    cv: 'Antecedentes de postulación: currículum, estudios, experiencia laboral y referencias',
    imagen: 'Imágenes captadas por cámaras de seguridad en nuestras instalaciones',
    salud: 'Datos relativos a la salud (dato personal sensible)',
    biometria: 'Datos biométricos, como huella digital o rasgos faciales (dato personal sensible)',
    menores: 'Datos de niños, niñas y adolescentes',
  };

  var PEOPLE = {
    clientes: 'clientes',
    prospectos: 'personas que nos piden información o cotizaciones',
    usuarios: 'visitantes y usuarios de nuestro sitio web',
    postulantes: 'personas que postulan a un trabajo con nosotros',
    proveedores: 'proveedores que son personas naturales y contactos de empresas proveedoras',
    trabajadores: 'trabajadores (que además reciben un aviso específico al ingresar)',
  };

  // Finalidad -> texto + base de licitud (artículo de la Ley 19.628 modificada).
  var PURPOSES = {
    venta: { t: 'Gestionar compras, despachos, garantías y atención al cliente', b: 'Ejecución de un contrato con el titular (art. 13 c)' },
    facturacion: { t: 'Emitir boletas y facturas y cumplir obligaciones tributarias y contables', b: 'Cumplimiento de una obligación legal (art. 13 b)' },
    marketing: { t: 'Enviar novedades, ofertas y promociones por correo, SMS o WhatsApp', b: 'Consentimiento del titular (art. 12), que puedes retirar en cualquier momento' },
    perfiles: { t: 'Personalizar ofertas según tu historial de compras', b: 'Consentimiento del titular (art. 12), que puedes retirar en cualquier momento' },
    analitica: { t: 'Medir el uso de nuestro sitio web para mejorarlo', b: 'Interés legítimo (art. 13 d): conocer qué páginas y funciones se usan para corregir errores y mejorar el sitio' },
    seguridad: { t: 'Resguardar la seguridad de personas y bienes en nuestras instalaciones', b: 'Interés legítimo (art. 13 d): proteger a clientes, trabajadores e instalaciones frente a robos y accidentes' },
    reclutamiento: { t: 'Evaluar postulaciones a nuestras ofertas de trabajo', b: 'Medidas precontractuales adoptadas a solicitud del titular (art. 13 c)' },
    proveedores: { t: 'Gestionar la relación comercial con proveedores', b: 'Ejecución de un contrato (art. 13 c)' },
    reclamos: { t: 'Atender reclamos y ejercer o defender derechos ante tribunales u organismos públicos', b: 'Formulación, ejercicio o defensa de un derecho (art. 13 e)' },
    salud: { t: 'Prestar atención de salud y llevar la ficha correspondiente', b: 'Consentimiento expreso del titular (art. 16) o, cuando corresponda, las excepciones del art. 16 bis, como la prestación de asistencia sanitaria' },
  };

  var RECIPIENTS = {
    hosting: 'proveedores de alojamiento web y servicios en la nube',
    pagos: 'pasarelas y procesadores de pago',
    despacho: 'empresas de transporte y despacho',
    contabilidad: 'nuestro servicio de contabilidad externo',
    mailing: 'plataformas de envío de correos y mensajes',
    software: 'proveedores de software de gestión (ERP, CRM, remuneraciones)',
  };

  var SECURITY = {
    accesos: 'acceso a los datos solo para quienes lo necesitan según su cargo, con cuentas personales',
    mfa: 'contraseñas robustas y verificación en dos pasos en correo y sistemas',
    respaldos: 'respaldos periódicos y pruebas de restauración',
    cifrado: 'cifrado de equipos portátiles y de las conexiones a nuestro sitio (HTTPS)',
    confidencialidad: 'obligación escrita de confidencialidad para trabajadores y proveedores',
    revision: 'revisión periódica de estas medidas',
  };

  var SOURCES = {
    titular: 'directamente de ti, cuando nos compras, escribes, postulas o usas nuestro sitio',
    terceros: 'de terceros que te refieren a nosotros o con quienes tienes una relación (por ejemplo, la empresa en que trabajas, si eres contacto de un cliente o proveedor)',
    publicas: 'de fuentes de acceso público, como registros públicos o el Diario Oficial',
  };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return Number(m[3]) + ' de ' + MONTHS[Number(m[2]) - 1] + ' de ' + m[1];
  }

  // Orden canónico (el del diccionario), sin importar el orden en que llegan las claves.
  function pick(keys, dict) { var set = keys || []; return Object.keys(dict).filter(function (k) { return set.indexOf(k) >= 0; }); }
  function list(keys, dict) { return pick(keys, dict).map(function (k) { return dict[k]; }); }

  function joinEs(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  /** Valida los campos mínimos. Devuelve una lista de {field, msg}; vacía si está todo. */
  function validatePolicy(o) {
    var errs = [];
    function req(f, msg) { if (!String(o[f] || '').trim()) errs.push({ field: f, msg: msg }); }
    req('razon', 'Falta la razón social.');
    req('rut', 'Falta el RUT de la empresa.');
    req('rep', 'Falta el nombre del representante legal.');
    req('domicilio', 'Falta el domicilio postal.');
    req('email', 'Falta el correo para solicitudes.');
    if (o.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(o.email)) errs.push({ field: 'email', msg: 'El correo no parece válido.' });
    if (!(o.data || []).length) errs.push({ field: 'data', msg: 'Elige al menos un tipo de dato.' });
    if (!(o.purposes || []).length) errs.push({ field: 'purposes', msg: 'Elige al menos una finalidad.' });
    if (o.intl && !String(o.intlDetail || '').trim()) errs.push({ field: 'intlDetail', msg: 'Indica a qué países o proveedores se transfieren los datos.' });
    if (o.auto && !String(o.autoDetail || '').trim()) errs.push({ field: 'autoDetail', msg: 'Describe la decisión automatizada.' });
    return errs;
  }

  /**
   * Construye la política. o = {razon, fantasia, rut, rep, domicilio, email, form, web, delegado, people[], data[],
   * purposes[], recipients[], intl, intlDetail, intlBasis, retention:{clientes, postulantes, camaras}, security[],
   * sources[], auto, autoDetail, date, version}. Devuelve {title, html, text, sections}.
   */
  function buildPolicy(o) {
    var name = o.fantasia ? o.razon + ' ("' + o.fantasia + '")' : o.razon;
    var sections = [];
    function sec(h, paras) { sections.push({ h: h, p: paras.filter(function (x) { return x !== null && x !== undefined && x !== ''; }) }); }
    var dataL = list(o.data, DATA);
    var peopleL = list(o.people, PEOPLE);
    var recL = list(o.recipients, RECIPIENTS);
    var secL = list(o.security, SECURITY);
    var srcL = list(o.sources && o.sources.length ? o.sources : ['titular'], SOURCES);
    var purposes = pick(o.purposes, PURPOSES);
    var hasSensitive = (o.data || []).indexOf('salud') >= 0 || (o.data || []).indexOf('biometria') >= 0;
    var hasConsent = purposes.some(function (k) { return /Consentimiento/.test(PURPOSES[k].b); }) || hasSensitive;
    var ret = o.retention || {};
    var title = 'Política de tratamiento de datos personales de ' + o.razon;

    sec('1. Quién es responsable de tus datos', [
      name + ', RUT ' + o.rut + ', con domicilio en ' + o.domicilio + ', es el responsable del tratamiento de tus datos personales: decide para qué y cómo se usan. Su representante legal es ' + o.rep + '.',
      o.delegado ? 'Encargado de prevención o delegado de protección de datos: ' + o.delegado + '.' : 'No hemos designado un delegado de protección de datos; las consultas las atiende directamente la administración de la empresa.',
    ]);
    sec('2. Cómo contactarnos', [
      'Para cualquier consulta o para ejercer tus derechos, escríbenos a ' + o.email + (o.form ? ', usa el formulario disponible en ' + o.form : '') + ' o envía una carta a ' + o.domicilio + '.',
    ]);
    sec('3. Qué datos tratamos y de quién', [
      peopleL.length ? 'Tratamos datos de ' + joinEs(peopleL) + '.' : null,
      'Los tipos de datos que tratamos son:',
      { ul: dataL },
    ]);
    sec('4. Para qué usamos tus datos y con qué base legal', [
      'Usamos tus datos solo para las finalidades siguientes. Al lado de cada una indicamos la base que la ley nos da para hacerlo:',
      { table: purposes.map(function (k) { return [PURPOSES[k].t, PURPOSES[k].b]; }) },
      purposes.some(function (k) { return /Interés legítimo/.test(PURPOSES[k].b); }) ? 'Cuando usamos tus datos por interés legítimo, puedes pedirnos más información sobre ese interés y oponerte al tratamiento (arts. 8° y 13 d).' : null,
      'No usaremos tus datos para fines distintos de los informados, salvo que sean compatibles con ellos, que tengas una relación contractual con nosotros que lo justifique, que nos des un nuevo consentimiento o que la ley lo permita (art. 3° b).',
    ]);
    sec('5. De dónde obtenemos tus datos', [
      'Obtenemos tus datos ' + joinEs(srcL) + '.',
    ]);
    sec('6. Con quién compartimos tus datos', [
      recL.length ? 'Algunos proveedores tratan datos por cuenta nuestra, bajo un contrato que les prohíbe usarlos para otros fines: ' + joinEs(recL) + '.' : 'No encargamos el tratamiento de tus datos a proveedores externos.',
      'También comunicamos datos a organismos públicos o tribunales cuando una ley nos obliga, por ejemplo al Servicio de Impuestos Internos. No vendemos tus datos.',
    ]);
    sec('7. Transferencias fuera de Chile', [
      o.intl
        ? 'Algunos de tus datos se almacenan o procesan fuera de Chile: ' + o.intlDetail + '. Si el país de destino no figura entre los que la Agencia de Protección de Datos Personales declare con nivel adecuado de protección, la transferencia se ampara en ' + (o.intlBasis || 'cláusulas contractuales con garantías adecuadas') + ' (arts. 27 y 28).'
        : 'No transferimos tus datos fuera de Chile.',
    ]);
    sec('8. Cuánto tiempo guardamos tus datos', [
      { ul: [
        'Datos de clientes: mientras dure la relación comercial y luego ' + (ret.clientes || 'el tiempo necesario para atender garantías y reclamos') + '.',
        (o.purposes || []).indexOf('facturacion') >= 0 ? 'Boletas, facturas y registros contables: por el plazo que exigen las normas tributarias.' : null,
        (o.data || []).indexOf('cv') >= 0 ? 'Postulaciones no seleccionadas: ' + (ret.postulantes || '6 meses') + ', salvo que nos autorices a guardarlas por más tiempo para futuros procesos.' : null,
        (o.data || []).indexOf('imagen') >= 0 ? 'Grabaciones de cámaras: ' + (ret.camaras || '30 días') + ', salvo que se requieran para investigar un incidente.' : null,
        (o.purposes || []).indexOf('marketing') >= 0 ? 'Datos para envío de publicidad: hasta que retires tu consentimiento o te opongas.' : null,
      ].filter(Boolean) },
      'Cumplido el plazo, suprimimos o anonimizamos los datos (art. 3° c).',
    ]);
    sec('9. Cómo protegemos tus datos', [
      secL.length ? 'Aplicamos estas medidas de seguridad: ' + joinEs(secL) + '.' : 'Aplicamos medidas de seguridad técnicas y organizativas adecuadas al tipo de datos que tratamos.',
      'Si ocurre un incidente de seguridad que genere un riesgo razonable para tus derechos, lo reportaremos a la Agencia de Protección de Datos Personales y, cuando la ley lo exige, te avisaremos directamente (art. 14 sexies).',
    ]);
    sec('10. Tus derechos', [
      'Puedes pedirnos en cualquier momento:',
      { ul: [
        'Acceso: saber si tratamos tus datos, cuáles, de dónde vienen, para qué, a quién los comunicamos y por cuánto tiempo (art. 5°).',
        'Rectificación: corregir datos inexactos, desactualizados o incompletos (art. 6°).',
        'Supresión: eliminar tus datos en los casos que señala la ley (art. 7°).',
        'Oposición: que no usemos tus datos para un tratamiento determinado, por ejemplo marketing directo (art. 8°).',
        'Portabilidad: recibir una copia de los datos que nos entregaste en un formato electrónico estructurado y de uso común, cuando el tratamiento es automatizado y se basa en tu consentimiento (art. 9°).',
        'Bloqueo temporal: suspender el uso de tus datos mientras resolvemos una solicitud de rectificación, supresión u oposición (arts. 8° ter y 11).',
      ] },
      'Escríbenos a ' + o.email + ' indicando tu nombre, un medio para responderte, los datos o el tratamiento a que se refiere tu solicitud y, si pides rectificación, supresión u oposición, el motivo y los antecedentes que la respalden (art. 11). Acusaremos recibo y te responderemos por escrito dentro de 30 días corridos, plazo que podemos prorrogar una sola vez por hasta 30 días corridos. Las solicitudes de bloqueo temporal las respondemos dentro de 2 días hábiles.',
      'Rectificar, suprimir u oponerte es siempre gratuito. El acceso es gratuito al menos una vez por trimestre (art. 10).',
    ]);
    if (hasConsent) sec('11. Retiro del consentimiento', [
      'Cuando tratamos tus datos con tu consentimiento, puedes retirarlo en cualquier momento, sin expresar causa, por un medio igual de simple que el que usaste para darlo, por ejemplo escribiendo a ' + o.email + ' o usando el enlace para darse de baja de nuestros correos. El retiro no afecta la licitud del tratamiento hecho antes (art. 12).',
    ]);
    sec((hasConsent ? '12' : '11') + '. Decisiones automatizadas', [
      o.auto
        ? 'Tomamos decisiones automatizadas que pueden afectarte: ' + o.autoDetail + '. Puedes pedir una explicación, la intervención de una persona, expresar tu punto de vista y solicitar la revisión de la decisión (art. 8° bis).'
        : 'No tomamos decisiones basadas únicamente en el tratamiento automatizado de tus datos, incluida la elaboración de perfiles, que produzcan efectos jurídicos en ti o te afecten de manera significativa.',
    ]);
    var n = hasConsent ? 13 : 12;
    if (hasSensitive || (o.data || []).indexOf('menores') >= 0) {
      sec(n + '. Datos sensibles y datos de menores', [
        hasSensitive ? 'Tratamos datos sensibles solo con tu consentimiento expreso o en los casos que la ley permite sin él (arts. 16 y 16 bis).' : null,
        (o.data || []).indexOf('biometria') >= 0 ? 'Si usamos datos biométricos, antes de recogerlos te informamos el sistema biométrico usado, la finalidad específica, el período durante el cual se usarán y la forma de ejercer tus derechos (art. 16 ter).' : null,
        (o.data || []).indexOf('menores') >= 0 ? 'Tratamos datos de niños, niñas y adolescentes atendiendo a su interés superior. Para menores de 14 años, y para datos sensibles de menores de 16, pedimos la autorización de sus padres, representantes legales o de quien tenga su cuidado personal, salvo que la ley lo autorice de otra forma (art. 16 quáter).' : null,
      ]);
      n++;
    }
    sec(n + '. Reclamos ante la Agencia', [
      'Si rechazamos tu solicitud o no te respondemos dentro de plazo, puedes reclamar ante la Agencia de Protección de Datos Personales dentro de 30 días hábiles contados desde nuestra respuesta o desde que venció el plazo para darla (arts. 11 y 41).',
    ]);
    n++;
    sec(n + '. Cambios a esta política', [
      'Publicaremos aquí cada nueva versión, con su fecha. Si un cambio afecta finalidades que se basan en tu consentimiento, te lo pediremos de nuevo.',
    ]);

    var meta = 'Versión ' + (o.version || '1.0') + ', vigente desde el ' + longDate(o.date) + '.';
    var lawNote = 'Esta política se dicta conforme al artículo 14 ter de la Ley N° 19.628, sobre protección de datos personales, modificada por la Ley N° 21.719.';

    // HTML
    var h = ['<article class="politica">', '<h1>' + esc(title) + '</h1>', '<p class="meta">' + esc(meta) + '</p>', '<p>' + esc(lawNote) + '</p>'];
    sections.forEach(function (s) {
      h.push('<h2>' + esc(s.h) + '</h2>');
      s.p.forEach(function (p) {
        if (p.ul) { if (p.ul.length) h.push('<ul>' + p.ul.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>'); }
        else if (p.table) h.push('<table><thead><tr><th>Finalidad</th><th>Base legal</th></tr></thead><tbody>' + p.table.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>');
        else h.push('<p>' + esc(p) + '</p>');
      });
    });
    h.push('</article>');

    // Texto plano
    var t = [title, meta, '', lawNote];
    sections.forEach(function (s) {
      t.push('', s.h);
      s.p.forEach(function (p) {
        if (p.ul) p.ul.forEach(function (li) { t.push('- ' + li); });
        else if (p.table) p.table.forEach(function (r) { t.push('- ' + r[0] + '. Base legal: ' + r[1] + '.'); });
        else t.push(p);
      });
    });

    return { title: title, html: h.join('\n'), text: t.join('\n'), sections: sections };
  }

  /** Variante del precio (A/B) sin cookies ni almacenamiento: alterna por día calendario de Santiago. */
  function priceVariant(date, override) {
    if (override === 'a' || override === 'b') return override;
    var d = date || new Date();
    var ymd;
    try {
      ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (e) { ymd = d.toISOString().slice(0, 10); }
    var p = ymd.split('-').map(Number);
    var days = Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
    return days % 2 === 0 ? 'a' : 'b';
  }
  var PRICES = { a: 39000, b: 79000 };
  function clp(n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /** RUT chileno: devuelve "12345678-5" si el dígito verificador (módulo 11) es correcto; si no, null. */
  function normRut(v) {
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

  var CP = {
    QUESTIONS: QUESTIONS, WHEN_LABEL: WHEN_LABEL, score: score, band: band, sizeFromUF: sizeFromUF,
    DATA: DATA, PEOPLE: PEOPLE, PURPOSES: PURPOSES, RECIPIENTS: RECIPIENTS, SECURITY: SECURITY, SOURCES: SOURCES,
    validatePolicy: validatePolicy, buildPolicy: buildPolicy, longDate: longDate, esc: esc,
    priceVariant: priceVariant, PRICES: PRICES, clp: clp, normRut: normRut,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CP;
  else root.CP = CP;
})(this);
