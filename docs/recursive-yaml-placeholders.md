# Recursive YAML variable substitution with dotted paths

This article matches the behavior of [**yaml-dot-resolve**](https://www.npmjs.com/package/yaml-dot-resolve): a small Node.js library that resolves `${...}` placeholders **inside YAML string values** using paths into the **same document**, including **nested** placeholders such as `${custom.${custom.stage}.cpu}`.

## The problem

Many configs are YAML (CI workflows, Serverless Framework `serverless.yml`, Helm values, app settings). Teams often need:

- A **stage** or **environment** name (`dev`, `staging`, `prod`).
- Values that depend on **which branch of the tree** is active, not only on environment variables.
- **Optional defaults** when a path is missing.

Simple string templating from a flat env map cannot express “look up the key whose name comes from another field.” This library treats the parsed YAML as the resolution context and walks placeholders until they stabilize (within safety limits).

## How it works (high level)

1. Parse the file with the [`yaml`](https://www.npmjs.com/package/yaml) package.
2. Set `custom.stage` to the stage name you pass in (convention borrowed from common Serverless layouts).
3. Visit every string scalar that contains `${`, resolve paths with **dotted segments** mapped through [JSONPath](https://www.npmjs.com/package/jsonpath-plus), and support **nested** `${...}` inside path expressions.
4. If the **entire** value is one placeholder, the result may be a non-string (object, array, number, boolean, or null) and **replaces** the node.

## Minimal example

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

## Defaults

Missing paths can use a bash-style default: `${some.path:-fallback}`. The default part can itself contain placeholders; see the project tests for detailed behavior.

## When to use something else

- **Secrets**: Do not put secrets in YAML committed to git; combine this style of config with your platform’s secret store and inject values **before** or **after** placeholder resolution as appropriate.
- **Arbitrary logic**: This is path-based resolution, not a full programming language. If you need complex conditionals, you may still want a dedicated config tool or codegen step.

## Links

- Repository: [github.com/gushwork/recursive-yml](https://github.com/gushwork/recursive-yml)
- npm: [yaml-dot-resolve](https://www.npmjs.com/package/yaml-dot-resolve)

You can adapt this post for [dev.to](https://dev.to), your blog, or internal docs; the canonical technical detail lives in the repo README and tests.
