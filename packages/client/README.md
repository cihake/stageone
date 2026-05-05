# @stageone/client

The StageOne web client. React 18 + Vite 5 + TypeScript, styled with plain
CSS + design tokens (no Tailwind for v1).

## Layout

```
src/
├── main.tsx                  React root + RouterProvider
├── router.tsx                Route table (mirrors spec §4 site map)
├── vite-env.d.ts             VITE_* env-var typings
├── components/
│   └── Layout.tsx            App shell — header / main / footer
├── pages/
│   ├── HomePage.tsx          v0.1 placeholder, becomes spec wireframe B.1
│   ├── HealthPage.tsx        v0.1 smoke test against the API
│   └── NotFoundPage.tsx      Custom 404 (pre-launch checklist #33)
├── context/
│   └── AuthContext.tsx       Stub for v0.1; real impl ships in v0.2
├── lib/
│   └── api.ts                Typed fetch wrapper (ApiError + apiFetch)
└── styles/
    ├── tokens.css            Design tokens — spec Appendix C
    └── global.css            Reset + base styles
```

## Scripts

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `npm run dev`    | Vite dev server on http://localhost:5173         |
| `npm run build`  | Type-check, then `vite build` to ./dist          |
| `npm run preview`| Serve the built bundle locally                   |
| `npm run typecheck` | `tsc --noEmit`                                |

## Notes

- The dev server proxies `/api/*` to `http://localhost:4000` (the Express
  server in `packages/server`), so you don't need to deal with CORS in dev.
- All colors and typography are defined as CSS custom properties in
  `tokens.css`. Components consume them via `var(--token-name)` — no
  hard-coded hex literals.
- Fonts (Space Grotesk, Inter, JetBrains Mono) are loaded from Google Fonts
  in `index.html`. We can self-host them in Phase 4 when bundle size matters.
