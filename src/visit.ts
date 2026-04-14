import YAML from 'yaml';
import type { Document } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import { isScalar } from 'yaml';
import { assertNoPlaceholderLiterals, MAX_VISIT_PASSES, resolveStringNodeValue } from './substitute';

/**
 * Applies `${...}` substitution for a single visitor node. Used by
 * {@link visitSubstitutePlaceholders} and by the parent repo when composing
 * placeholder + Secrets Manager handling in one pass (document order matters).
 */
export async function applyPlaceholderOnNode(
  doc: Document,
  key: unknown,
  node: unknown
): Promise<{ replace?: YamlNode; changed: boolean }> {
  if (key !== 'value' || !isScalar(node) || typeof node.value !== 'string') {
    return { changed: false };
  }

  const str = node.value;
  if (!str.includes('${')) {
    return { changed: false };
  }

  const context = doc.toJS() as Record<string, unknown>;
  const before = str;
  const outcome = resolveStringNodeValue(str, context);
  if (outcome.kind === 'replaceNode') {
    return { replace: doc.createNode(outcome.value), changed: true };
  }
  if (outcome.kind === 'primitive' && outcome.value !== before) {
    node.value = outcome.value as string;
    return { changed: true };
  }
  return { changed: false };
}

/**
 * Walks the YAML document and substitutes `${...}` placeholders. Does not handle
 * application-specific values (e.g. AWS Secrets Manager ARNs).
 */
export async function visitSubstitutePlaceholders(doc: Document): Promise<Document> {
  for (let pass = 0; pass < MAX_VISIT_PASSES; pass += 1) {
    let changed = false;

    await YAML.visitAsync(doc, {
      Node: async (key, node) => {
        const { replace, changed: phChanged } = await applyPlaceholderOnNode(doc, key, node);
        if (replace) {
          changed = true;
          return replace;
        }
        if (phChanged) {
          changed = true;
        }
        return undefined;
      },
    });

    if (!changed) {
      break;
    }
  }

  assertNoPlaceholderLiterals(doc.toJS());

  return doc;
}
