import { call } from './api.mjs';
export default async function () {
  const r = await call('purge_tests');
  console.log('purge_tests:', JSON.stringify(r));
}
