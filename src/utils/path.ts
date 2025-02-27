import {
  normalizeSafe,
  relative as normalizedRelative,
  sep as seperator,
} from 'upath';

/**
 * Behaves exactly like `path.relative(from, to)`, but keeps the first meaningful "./"
 */
export const relativeSafe = (from: string, to: string) => {
  const normalizedRelativePath = normalizedRelative(from, to);
  /**
   * Prepend "./" to every path and then use normalizeSafe method to normalize it
   * normalizeSafe doesn't remove meaningful leading "./"
   */
  const relativePath = normalizeSafe(`.${seperator}${normalizedRelativePath}`);
  return relativePath;
};
