// Acceso al web app de Apps Script para verificar lo que los tests envían (clave admin fuera del repo).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
export const API = 'https://script.google.com/macros/s/AKfycbzO-UZhV1aVTEDgAj95jk2fktbBxOZNr1eQ9kvv1_nOu6q2LMCnBhsgSt-pBGpJNyKx/exec';
const KEY = process.env.CP_ADMIN_KEY || readFileSync(homedir() + '/.config/candadopyme/admin.key', 'utf8').trim();
export async function call(action, body = {}) {
  const r = await fetch(API + '?action=' + action, { method: 'POST', body: JSON.stringify({ ...body, key: KEY }) });
  return r.json();
}
/** Suma de contadores de prueba (utm_source=e2e) para un evento. */
export async function e2eCount(event) {
  const s = await call('summary');
  let n = 0;
  for (const [k, v] of Object.entries(s.stats || {})) if (k.endsWith('[e2e]') && k.split(' ')[1] === event) n += v;
  return n;
}
