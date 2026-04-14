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
    const innerResolved = inner.includes('${')
      ? resolvePathPlaceholders(inner, context, depth + 1)
      : inner;

    if (innerResolved.includes('${')) {
      throw maxDepthExceeded();
    }

    const segments = innerResolved.split('.');
    for (const seg of segments) {
      if (seg.length > 0) {
        assertSegmentNoSpaces(seg);
      }
    }

    const val = lookupAtPath(context, innerResolved);
    if (val === NOT_FOUND) {
      throwLookupFailure(innerResolved);
    }
    if ((typeof val === 'object' && val !== null) || Array.isArray(val)) {
      throw cannotEmbedNonPrimitive(innerResolved);
    }
    const replacement = String(val);
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
    const pathResolved = resolvePathPlaceholders(inner, context, depth + 1);
    const segments = pathResolved.split('.').filter(Boolean);
    for (const seg of segments) {
      assertSegmentNoSpaces(seg);
    }
    const val = lookupAtPath(context, pathResolved);
    if (val === NOT_FOUND) {
      throwLookupFailure(pathResolved);
    }
    if ((typeof val === 'object' && val !== null) || Array.isArray(val)) {
      throw cannotEmbedNonPrimitive(pathResolved);
    }
    const replacement = val === null ? 'null' : String(val);
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
    const pathResolved = resolvePathPlaceholders(inner, context, 0);
    if (pathResolved.includes('${')) {
      throw maxDepthExceeded();
    }
    const val = lookupAtPath(context, pathResolved);
    if (val === NOT_FOUND) {
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
