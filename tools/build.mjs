// Construye docs/ a partir de src/pages/*.html (cabecera JSON en la primera línea) con un layout común.
// Uso: node tools/build.mjs   (BASE_URL=https://candadopyme.github.io para otra ubicación)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = (process.env.BASE_URL || 'https://outils.vread.fr/candadopyme').replace(/\/$/, '');
const BASE_PATH = new URL(BASE_URL + '/').pathname; // "/candadopyme/"
const UPDATED = '2026-10-13';
const ASSET_V = '20261013c';

const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 14V10a6 6 0 0 1 12 0v4"/><rect x="6" y="14" width="20" height="14" rx="2.5" fill="currentColor" fill-opacity=".12"/><path d="M12 21.5l3 3 5.5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NAV = [
  ['diag', 'autodiagnostico/', 'Autodiagnóstico'],
  ['gen', 'politica-de-privacidad/', 'Política de privacidad'],
  ['kit', 'kit/', 'Kit'],
  ['ley', 'ley-21719/', 'Ley 21.719 en simple'],
];

function layout(meta, body, root) {
  const canonical = BASE_URL + meta.path;
  const nav = NAV.map(([k, href, label]) => `<a href="${root}${href}"${meta.nav === k ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ');
  const ld = meta.ld ? `\n<script type="application/ld+json">${JSON.stringify(meta.ld)}</script>` : '';
  return `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${canonical}">
${meta.noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="${meta.ogType || 'website'}">
<meta property="og:title" content="${meta.ogTitle || meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="Candado Pyme">
<meta property="og:image" content="${BASE_URL}/assets/img/og.png">
<meta name="theme-color" content="#0e5e55">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600;7..72,700&family=Public+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${root}assets/style.css?v=${ASSET_V}">${ld}
</head>
<body data-page="${meta.nav || ''}">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="${root}">${LOGO}<span>Candado Pyme</span></a>
    <nav class="nav" aria-label="Principal">
        ${nav}
    </nav>
  </div>
</header>
<main id="main">
${body.replaceAll('{{root}}', root)}
</main>
<footer class="foot">
  <div class="wrap cols">
    <div>
      <p><b>Candado Pyme</b> es un servicio de READ FRANCE SAS (SIREN 988 741 773), 11 rue Rouvet, 75019 París, Francia. Contacto: <a href="mailto:octave@vread.fr">octave@vread.fr</a>. Vendemos solo a empresas.</p>
      <p class="disclaimer"><b>Aviso:</b> Candado Pyme entrega plantillas de autoayuda. No es asesoría legal ni reemplaza la revisión de un abogado. No tenemos relación con la Agencia de Protección de Datos Personales ni con otro organismo del Estado de Chile. Los textos los preparó Octave, un agente de inteligencia artificial de READ FRANCE, a partir de la Ley N° 21.719 publicada en el Diario Oficial el 13 de diciembre de 2024. Última revisión: 13 de octubre de 2026.</p>
    </div>
    <div>
      <p><a href="${root}privacidad/">Política de privacidad</a> (Ley 19.628 y Ley 21.719)<br>
      <a href="${root}terminos/">Términos y condiciones</a><br>
      <a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" rel="noopener">Texto oficial de la Ley 21.719 (BCN)</a></p>
      <p>Medición de audiencia anónima, sin cookies ni identificadores. Respetamos la señal «Do Not Track».</p>
    </div>
  </div>
</footer>
<script src="${root}assets/core.js?v=${ASSET_V}" defer></script>
<script src="${root}assets/app.js?v=${ASSET_V}" defer></script>
<script src="${root}assets/mesure.js?v=${ASSET_V}" defer></script>
</body>
</html>
`;
}

const pagesDir = join(ROOT, 'src', 'pages');
const urls = [];
for (const f of readdirSync(pagesDir).filter(n => n.endsWith('.html')).sort()) {
  const raw = readFileSync(join(pagesDir, f), 'utf8');
  const nl = raw.indexOf('\n');
  const meta = JSON.parse(raw.slice(0, nl).replace(/^<!--/, '').replace(/-->$/, ''));
  const body = raw.slice(nl + 1);
  let outFile, root;
  if (meta.file) { // 404.html: rutas absolutas porque se sirve en cualquier URL
    outFile = join(ROOT, 'docs', meta.file);
    root = BASE_PATH;
  } else {
    const depth = meta.path.split('/').filter(Boolean).length;
    root = depth ? '../'.repeat(depth) : './';
    outFile = join(ROOT, 'docs', meta.path, 'index.html');
    if (!meta.noindex) urls.push([meta.path, meta.priority || '0.7']);
  }
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, layout(meta, body, root));
  console.log('built', outFile.replace(ROOT + '/', ''));
}
writeFileSync(join(ROOT, 'docs', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, pr]) => `  <url><loc>${BASE_URL}${p}</loc><lastmod>${UPDATED}</lastmod><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(ROOT, 'docs', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
console.log('sitemap:', urls.length, 'urls');
