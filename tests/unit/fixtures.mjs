// Fixtures compartidos: un set mixto con puntaje calculado a mano y una entrada del generador.
// Pesos: inventario 3, licitud 3, politica 3, canal 2, plazo 3, consentimiento 2, sensibles 2 (na), menores 2 (na),
// encargados 2, transferencias 1, seguridad 3, brechas 2, conservacion 2, confidencialidad 1, delegado 1.
// Puntos: 3 + 1,5 + 0 + 2 + 0 + 1 + 2 + 0 + 1,5 + 2 + 0 + 1 + 0 = 14 de 28 (sensibles y menores fuera) = 50.
export const MIXED = {
  inventario: 'si', licitud: 'parcial', politica: 'no', canal: 'si', plazo: 'nose', consentimiento: 'parcial',
  sensibles: 'na', menores: 'na', encargados: 'si', transferencias: 'no', seguridad: 'parcial', brechas: 'si',
  conservacion: 'no', confidencialidad: 'si', delegado: 'no',
};
export const MIXED_PCT = 50;
export const MIXED_BAND = 'medio';
// Brechas por puntos perdidos (peso x (1 - valor)); empates en orden de pregunta.
export const MIXED_GAPS = ['politica', 'plazo', 'conservacion', 'licitud', 'seguridad', 'consentimiento', 'transferencias', 'delegado'];

export const GEN = {
  razon: 'Comercial Los Aromos SpA', fantasia: 'Café Los Aromos', rut: '76.086.428-5', rep: 'María Soto Pérez',
  domicilio: 'Av. Providencia 1234, oficina 56, Providencia, Santiago', email: 'datos@losaromos.example.cl',
  form: 'https://losaromos.example.cl/privacidad', delegado: '', people: ['clientes', 'postulantes', 'usuarios'],
  data: ['identificacion', 'contacto', 'compras', 'cv', 'imagen'], purposes: ['venta', 'facturacion', 'marketing', 'seguridad', 'reclutamiento'],
  recipients: ['hosting', 'pagos', 'contabilidad'], intl: true, intlDetail: 'servicios de correo y nube de Google LLC en Estados Unidos',
  intlBasis: 'cláusulas contractuales con garantías adecuadas', retention: { clientes: '2 años', postulantes: '6 meses', camaras: '30 días' },
  security: ['accesos', 'mfa', 'respaldos'], sources: ['titular'], auto: false, date: '2026-11-02', version: '1.0',
};
export const GEN_MUST = [
  'Política de tratamiento de datos personales de Comercial Los Aromos SpA', 'Versión 1.0, vigente desde el 2 de noviembre de 2026.',
  'artículo 14 ter de la Ley N° 19.628', 'modificada por la Ley N° 21.719', 'Comercial Los Aromos SpA ("Café Los Aromos"), RUT 76.086.428-5',
  'Su representante legal es María Soto Pérez', 'No hemos designado un delegado de protección de datos', 'datos@losaromos.example.cl',
  'https://losaromos.example.cl/privacidad', 'clientes, visitantes y usuarios de nuestro sitio web y personas que postulan a un trabajo con nosotros',
  'Imágenes captadas por cámaras de seguridad', 'Ejecución de un contrato con el titular (art. 13 c)', 'Cumplimiento de una obligación legal (art. 13 b)',
  'Consentimiento del titular (art. 12)', 'Interés legítimo (art. 13 d)', 'Medidas precontractuales adoptadas a solicitud del titular (art. 13 c)',
  'servicios de correo y nube de Google LLC en Estados Unidos', 'arts. 27 y 28', 'Postulaciones no seleccionadas: 6 meses', 'Grabaciones de cámaras: 30 días',
  'luego 2 años', 'por el plazo que exigen las normas tributarias', 'dentro de 30 días corridos', 'una sola vez por hasta 30 días corridos',
  'dentro de 2 días hábiles', 'Retiro del consentimiento', 'dentro de 30 días hábiles', 'Agencia de Protección de Datos Personales',
  'Portabilidad', 'Bloqueo temporal', 'art. 14 sexies', 'No tomamos decisiones basadas únicamente en el tratamiento automatizado',
];
export const GEN_MUST_NOT = ['Datos relativos a la salud', 'biométricos', 'niños, niñas y adolescentes', 'Datos sensibles y datos de menores',
  'No transferimos tus datos fuera de Chile', 'undefined', 'null', 'Encargado de prevención o delegado'];
