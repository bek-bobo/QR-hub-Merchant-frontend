# QRHub Merchant Frontend

React SPA scaffold for the QRHub merchant interface. Day 01 contains an
explicit development-only synthetic preview; live integration is fail-closed
until external contracts are confirmed.

## Manual verification

Run from `D:\QR projects\qrhub-merchant-frontend`:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

After a successful production build, stop the development server and verify
the production boundary:

```powershell
npm run preview
```

Production preview must show the integration-unavailable page even when the
local environment requests demo mode.

Optional production bundle fixture check:

```powershell
Get-ChildItem -Path 'dist\assets' -Filter '*.js' -Recurse | Select-String -SimpleMatch 'DEMO-QR-'
```

Expected result: no match.

## Scaffold notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
