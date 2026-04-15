# yaml-dot-resolve

[![CI](https://github.com/gushwork/recursive-yml/actions/workflows/test-pr.yml/badge.svg?branch=main)](https://github.com/gushwork/recursive-yml/actions/workflows/test-pr.yml)
[![npm version](https://img.shields.io/npm/v/yaml-dot-resolve.svg)](https://www.npmjs.com/package/yaml-dot-resolve)

**Resolve `${...}` placeholders inside YAML against the document itself**—including nested placeholders like `${custom.${custom.stage}.cpu}`—using dotted paths backed by [JSONPath](https://www.npmjs.com/package/jsonpath-plus). Intended for **stage- or environment-specific config** (Serverless-style `custom` blocks, CI templates, and similar) without a separate templating engine.

## Why this exists

Plain find-and-replace or env-only substitution cannot express “pick the branch of the tree named by another field.” This library parses YAML, injects `custom.stage` from your chosen stage name, walks the document, and resolves placeholders **recursively** until stable or until limits/errors apply. When a placeholder is the **entire** scalar value, non-string results (objects, arrays, numbers, booleans, null) can replace the node.

## Requirements

- Node.js 18+

## Install

```bash
npm install yaml-dot-resolve
```

## Usage

```ts
import { processYml } from 'yaml-dot-resolve';

const yml = [
  'custom:',
  '  dev:',
  '    cpu: 256',
  'cpu: ${custom.${custom.stage}.cpu}',
].join('\n');

const doc = await processYml(yml, 'dev');
console.log(doc.toJS().cpu); // 256
```

`processYml` returns a [`yaml`](https://www.npmjs.com/package/yaml) `Document`.

### Defaults (optional)

Placeholders support a bash-style default when the path is missing: `${path:-default}`. Defaults can include nested placeholders. See tests in `src/process.test.ts` for edge cases.

## API (public exports)

| Export | Role |
| ------ | ---- |
| `processYml(ymlContent, stage)` | Parse YAML, set `custom.stage`, run full-document substitution. |
| `visitSubstitutePlaceholders(doc)` | Walk an existing `yaml` `Document` and substitute placeholders. |
| `applyPlaceholderOnNode(doc, key, node)` | Single-node hook for composing with other visitors (order-sensitive). |
| `resolveStringNodeValue`, `resolvePathPlaceholders`, `substituteMixedString` | Lower-level string and path resolution. |
| `dottedPathToJsonPath`, `lookupAtPath`, `splitPathAndDefaultAtTopLevel`, `findPlaceholderEnd`, … | Path and placeholder parsing helpers. |
| `assertNoPlaceholderLiterals` | Assert no literal `${` remains where disallowed. |
| `placeholderErrors` | Factory functions for typed error messages. |
| `MAX_DEPTH`, `MAX_VISIT_PASSES`, `MAX_PLACEHOLDER_STEPS`, `NOT_FOUND` | Limits and sentinel values. |

Full signatures are in [`src/index.ts`](src/index.ts) and the implementation modules under `src/`.

## Examples in this repo

- [`examples/stage-config`](examples/stage-config) — minimal runnable example (local `file:` dependency; build the package first).
- Longer-form write-up (suitable for dev.to or a blog): [`docs/recursive-yaml-placeholders.md`](docs/recursive-yaml-placeholders.md).

## Scripts

| Command         | Description        |
| --------------- | ------------------ |
| `npm run build` | Compile TypeScript |
| `npm test`      | Run Vitest         |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Maintainer note: GitHub topics

Adding topics on the repository helps discovery. Suggested topics: `yaml`, `nodejs`, `typescript`, `config`, `placeholder`, `interpolation`, `jsonpath`, `serverless`, `npm-package`.

## License

[MIT](LICENSE)
