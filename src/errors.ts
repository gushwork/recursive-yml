export const pathNotFound = (dottedPath: string): Error =>
  new Error(`Placeholder path not found: ${dottedPath}`);

export const unresolvedPlaceholderReference = (name: string): Error =>
  new Error(`Unresolved placeholder reference: ${name}`);

export const cannotEmbedNonPrimitive = (path: string): Error =>
  new Error(`Cannot embed non-primitive value in mixed placeholder string: ${path}`);

export const malformedUnclosed = (): Error =>
  new Error('Malformed placeholder: unclosed delimiter (missing closing })');

export const invalidSpaceInPath = (): Error =>
  new Error('Invalid placeholder path: segment cannot contain spaces');

export const maxDepthExceeded = (): Error =>
  new Error('Placeholder resolution exceeded maximum depth (50)');

export const placeholderErrors = {
  pathNotFound,
  unresolvedPlaceholderReference,
  cannotEmbedNonPrimitive,
  malformedUnclosed,
  invalidSpaceInPath,
  maxDepthExceeded,
};
