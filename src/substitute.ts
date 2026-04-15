import { JSONPath } from 'jsonpath-plus';
import {
  cannotEmbedNonPrimitive,
  invalidSpaceInPath,
  malformedUnclosed,
  maxDepthExceeded,
  pathNotFound,
  unresolvedPlaceholderReference,
} from './errors';

export const MAX_DEPTH = 50;
export const MAX_VISIT_PASSES = 30;
export const MAX_PLACEHOLDER_STEPS = 2000;

export const NOT_FOUND = Symbol('NOT_FOUND');

export function findPlaceholderEnd(text: string, startIndex: number): number {
  let braceCount = 0;
  let endIndex = startIndex + 2;

  while (endIndex < text.length) {
    if (text[endIndex] === '{') {
      braceCount += 1;
    } else if (text[endIndex] === '}') {
      if (braceCount === 0) {
        return endIndex;
      }
      braceCount -= 1;
    }
    endIndex += 1;
  }

  return -1;
}

/**
 * Splits placeholder content at the first top-level `:-` (not inside nested `${...}`).
 * Left side is the path expression; right side is the default when the path is not found
 * (same idea as bash `${parameter:-word}`).
 */
export function splitPathAndDefaultAtTopLevel(s: string): {
  pathPart: string;
  defaultPart: string | null;
} {
  let i = 0;
  while (i < s.length) {
    if (s[i] === '$' && s[i + 1] === '{') {
      const end = findPlaceholderEnd(s, i);
      if (end === -1) {
        break;
      }
      i = end + 1;
      continue;
    }
    if (s[i] === ':' && s[i + 1] === '-') {
      return {
        pathPart: s.slice(0, i),
        defaultPart: s.slice(i + 2),
      };
    }
    i += 1;
  }
  return { pathPart: s, defaultPart: null };
}

export function isWholeStringSinglePlaceholder(text: string): boolean {
  if (!text.startsWith('${')) return false;
  const end = findPlaceholderEnd(text, 0);
  return end === text.length - 1;
}

function assertSegmentNoSpaces(segment: string): void {
  if (segment.includes(' ')) {
    throw invalidSpaceInPath();
  }
}

export function dottedPathToJsonPath(dottedPath: string): string {
  const segments = dottedPath.split('.').filter((s) => s.length > 0);
  if (segments.length === 0) {
    throw pathNotFound(dottedPath);
  }
  let path = '$';
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    assertSegmentNoSpaces(seg);
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      path += `.${seg}`;
    } else {
      const escaped = seg.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      path += `['${escaped}']`;
    }
  }
  return path;
}

export function lookupAtPath(
  context: Record<string, unknown>,
  dottedPath: string,
): unknown | typeof NOT_FOUND {
  const jp = dottedPathToJsonPath(dottedPath);
  const queryResult = JSONPath({ path: jp, json: context as object });
  if (queryResult.length === 0) {
    return NOT_FOUND;
  }
  return queryResult[0];
}

function throwLookupFailure(dottedPath: string): never {
  const isSimpleIdentifier =
    !dottedPath.includes('.') &&
    /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(dottedPath);
  if (isSimpleIdentifier) {
    throw unresolvedPlaceholderReference(dottedPath);
  }
  throw pathNotFound(dottedPath);
}

/**
 * Expands nested `${...}` in the path expression, then looks up the dotted path.
 * Also returns optional default text (after first top-level `:-`) when the path is missing.
 */
function resolvePathAndLookup(
  inner: string,
  context: Record<string, unknown>,
  depth: number,
): { pathResolved: string; val: unknown | typeof NOT_FOUND; defaultPart: string | null } {
  const { pathPart, defaultPart } = splitPathAndDefaultAtTopLevel(inner);
  const pathResolved = pathPart.includes('${')
    ? resolvePathPlaceholders(pathPart, context, depth + 1)
    : pathPart;

  if (pathResolved.includes('${')) {
    throw maxDepthExceeded();
  }

  const segments = pathResolved.split('.');
  for (const seg of segments) {
    if (seg.length > 0) {
      assertSegmentNoSpaces(seg);
    }
  }

  const val =
    pathResolved.trim() === ''
      ? NOT_FOUND
      : lookupAtPath(context, pathResolved);
  return { pathResolved, val, defaultPart };
}

function evaluatePlaceholderReplacement(
  inner: string,
  context: Record<string, unknown>,
  depth: number,
): string {
  const { pathResolved, val, defaultPart } = resolvePathAndLookup(inner, context, depth);
  if (val === NOT_FOUND) {
    if (defaultPart !== null) {
      return substituteMixedString(defaultPart, context, depth + 1);
    }
    throwLookupFailure(pathResolved);
  }
  if ((typeof val === 'object' && val !== null) || Array.isArray(val)) {
    throw cannotEmbedNonPrimitive(pathResolved);
  }
  return val === null ? 'null' : String(val);
}

export function resolvePathPlaceholders(
  pathStr: string,
  context: Record<string, unknown>,
  depth: number,
): string {
  if (depth > MAX_DEPTH) {
    throw maxDepthExceeded();
  }
  let result = pathStr;
  let steps = 0;
  while (result.includes('${')) {
    steps += 1;
    if (steps > MAX_PLACEHOLDER_STEPS) {
      throw maxDepthExceeded();
    }
    const start = result.indexOf('${');
    const end = findPlaceholderEnd(result, start);
    if (end === -1) {
      throw malformedUnclosed();
    }
    const inner = result.substring(start + 2, end);
    const replacement = evaluatePlaceholderReplacement(inner, context, depth);
    result = result.substring(0, start) + replacement + result.substring(end + 1);
  }
  return result;
}

export function substituteMixedString(
  text: string,
  context: Record<string, unknown>,
  depth: number,
): string {
  if (depth > MAX_DEPTH) {
    throw maxDepthExceeded();
  }
  let result = text;
  let steps = 0;
  while (result.includes('${')) {
    steps += 1;
    if (steps > MAX_PLACEHOLDER_STEPS) {
      throw maxDepthExceeded();
    }
    const start = result.indexOf('${');
    const end = findPlaceholderEnd(result, start);
    if (end === -1) {
      throw malformedUnclosed();
    }
    const inner = result.substring(start + 2, end);
    const replacement = evaluatePlaceholderReplacement(inner, context, depth + 1);
    result = result.substring(0, start) + replacement + result.substring(end + 1);
  }
  return result;
}

export type ResolveOutcome =
  | { kind: 'noop' }
  | { kind: 'replaceNode'; value: unknown }
  | { kind: 'primitive'; value: unknown };

export function resolveStringNodeValue(
  value: string,
  context: Record<string, unknown>,
): ResolveOutcome {
  if (!value.includes('${')) {
    return { kind: 'noop' };
  }

  if (isWholeStringSinglePlaceholder(value)) {
    const inner = value.substring(2, value.length - 1);
    const { pathResolved, val, defaultPart } = resolvePathAndLookup(inner, context, 0);
    if (val === NOT_FOUND) {
      if (defaultPart !== null) {
        return { kind: 'primitive', value: substituteMixedString(defaultPart, context, 0) };
      }
      throwLookupFailure(pathResolved);
    }
    if (val !== null && typeof val === 'object') {
      return { kind: 'replaceNode', value: val };
    }
    return { kind: 'primitive', value: val };
  }

  const substituted = substituteMixedString(value, context, 0);
  return { kind: 'primitive', value: substituted };
}

export function assertNoPlaceholderLiterals(value: unknown): void {
  if (typeof value === 'string' && value.includes('${')) {
    throw maxDepthExceeded();
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const item of value) {
        assertNoPlaceholderLiterals(item);
      }
      return;
    }
    for (const v of Object.values(value)) {
      assertNoPlaceholderLiterals(v);
    }
  }
}
