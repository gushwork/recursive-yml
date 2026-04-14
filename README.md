# recursive-yml

Recursive `${...}` placeholder substitution for YAML documents. Parses YAML, injects `custom.stage` from your chosen stage name, and resolves placeholders against the document using dotted paths (via [JSONPath](https://www.npmjs.com/package/jsonpath-plus)).

## Requirements

- Node.js 18+

## Install

```bash
npm install recursive-yml
```

## Usage

```ts
import { processYml } from 'recursive-yml';

const yml = [
  'custom:',
  '  dev:',
  '    cpu: 256',
  'cpu: ${custom.${custom.stage}.cpu}',
].join('\n');

const doc = await processYml(yml, 'dev');
console.log(doc.toJS().cpu); // 256
```

`processYml` returns a [`yaml`](https://www.npmjs.com/package/yaml) `Document`. Placeholders in string values are resolved recursively; when a placeholder is the entire scalar value, non-string results (e.g. objects) can replace the node.

Lower-level helpers (path resolution, visiting nodes, error types) are exported from the package entry for advanced use cases.

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run build` | Compile TypeScript |
| `npm test`      | Run Vitest         |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
