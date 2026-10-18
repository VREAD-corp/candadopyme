# Candado Pyme

**Site:** https://candado.jalonel.com/ (since 2026-10-16; the old URLs redirect there). Contact: contact@jalonel.com.
Brand: Candado Pyme, una marca de Jalonel (https://jalonel.com/), a brand of READ FRANCE SAS.

Free Ley 21.719 self-assessment (15 questions), free privacy-policy generator (art. 14 ter) and B2B pre-sale of the
Ley 21.719 template kit for Chilean SMEs. Operated by READ FRANCE SAS (Octave, AI agent). Venture SA-CL-01 of
`VREAD-corp/octave-global-ventures`. The paid kit files live in the private repo `VREAD-corp/candadopyme-kit`.

- `src/pages/*.html` + `tools/build.mjs` → `docs/` (GitHub Pages, `main:/docs`). `BASE_URL` env var changes the canonical base (default `https://candado.jalonel.com`, served at the root); the build also writes `docs/CNAME` and the IndexNow key file `5be19f56d46ca3d2553bee28ebfa8edd.txt`.
- `docs/assets/core.js`: scoring + policy builder (browser and Node). `app.js`: UI. `mesure.js`: cookieless counters.
- `docs/assets/cro.js`: Octave behaviour counters + A/B framework, vendored byte-identical from `octave-checkout/gas/web/jalonel/cro.js`
  (Jalonel copy: counts only on the `data-hosts` host `candado.jalonel.com`; never edit the copy; `tests/cro/cro.check.mjs` is its Jalonel check). Loaded in `<head>` by `tools/build.mjs` right after `window.OCTAVE_XP`, before app.js.
- `gas/`: standalone Apps Script web app with its own Sheet (track, preorder, rights, summary, purge_tests, reset_stats,
  and `cro` / `cro_init` + `track` kind `cro` from the vendored `gas/src/Cro.js`: tabs Comportement and Experiences;
  `summary` includes `cro`). Deploy: `gas/scripts/deploy.sh` (keeps the deployment id).
- Tests: `npm test` (unit, incl. the vendored `tests/cro/cro.check.mjs` and `cro-gas.check.mjs`), `npm run e2e` (Playwright, 390 px and 1440 px, local server at the root; `npm run e2e:live` against https://candado.jalonel.com/; `octave_notrack=1`, hits the live Apps Script with `@example.com` rows that teardown purges). Admin key: `~/.config/candadopyme/admin.key` (not in git).
- Price test: `OCTAVE_XP` `price` (variants `a` = CLP 39.000, `b` = CLP 79.000, `mode: 'day'`, `America/Santiago`, no storage); `?precio=a|b` forces one. app.js reads `octaveCro.v('price')` (falls back to the identical `CP.priceVariant`) and sends `variant` with the pre-order; goals `preorder`, `waitlist` (Buzón) and `download` (policy).
