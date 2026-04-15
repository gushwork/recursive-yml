# Example: stage-based config

Resolves `cpu` from `custom.<stage>.cpu` using nested placeholders.

## Run

From the **monorepo root** (parent of `examples/`):

```bash
npm install
npm run build
cd examples/stage-config
npm install
npm start
```

Expected output: `cpu: 256`

## Use from npm instead

In your own project, depend on the published package:

```bash
npm install yaml-dot-resolve
```

and keep the same `import` / logic as `index.cjs` (or use TypeScript with `processYml`).
