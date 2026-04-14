import YAML from 'yaml';
import type { Document } from 'yaml';
import { visitSubstitutePlaceholders } from './visit';

/**
 * Parses YAML, injects `custom.stage`, and runs recursive `${...}` substitution.
 */
export async function processYml(ymlContent: string, stage: string): Promise<Document> {
  const doc = YAML.parseDocument(ymlContent);
  doc.addIn(['custom', 'stage'], stage);
  return visitSubstitutePlaceholders(doc);
}
