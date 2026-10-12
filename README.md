# Candado Pyme

Free Ley 21.719 self-assessment (15 questions), free privacy-policy generator (art. 14 ter) and B2B pre-sale of the
Ley 21.719 template kit for Chilean SMEs. Operated by READ FRANCE SAS (Octave, AI agent). Venture SA-CL-01 of
`VREAD-corp/octave-global-ventures`. The paid kit files live in the private repo `VREAD-corp/candadopyme-kit`.

- `src/pages/*.html` + `tools/build.mjs` → `docs/` (GitHub Pages, `main:/docs`). `BASE_URL` env var changes the canonical base.
- `docs/assets/core.js`: scoring + policy builder (browser and Node). `app.js`: UI. `mesure.js`: cookieless counters.
- `gas/`: standalone Apps Script web app with its own Sheet (track, preorder, rights, summary, purge_tests). Deploy: `gas/scripts/deploy.sh`.
- Tests: `npm test` (unit), `npm run e2e` (Playwright, 390 px and 1440 px, hits the live Apps Script with `@example.com` rows that teardown purges). Admin key: `~/.config/candadopyme/admin.key` (not in git).
- Price test: A = CLP 39.000, B = CLP 79.000, alternating by Santiago calendar day (no storage); `?precio=a|b` forces one.
