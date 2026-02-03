/**
 * Joins multiple path segments into a single path string, ensuring proper slashes.
 *
 * A leading slash is added if the first segment is empty, and a trailing slash is added if the last segment is empty.
 *
 * @param segments The path segments to join.
 * @returns The joined path string.
 *
 * @example
 * joinPathSegments('a/b', 'c/d') === 'a/b/c/d'
 * joinPathSegments('/a/b/', '/c/d/') === '/a/b/c/d/'
 * joinPathSegments('a/b/', '/c/d') === 'a/b/c/d'
 * joinPathSegments('', 'a/b', 'c') === '/a/b/c'
 * joinPathSegments('a/b', '', 'c') === 'a/b/c'
 * joinPathSegments('a/b', 'c/d', '') === 'a/b/c/d/'
 * joinPathSegments('') === ''
 * joinPathSegments('', '') === '/'
 * joinPathSegments('a', '..', 'b') === 'b'
 * joinPathSegments('a', '.', 'b') === 'a/b'
 * joinPathSegments('a', 'b', '..', 'c') === 'a/c'
 * joinPathSegments('', 'a', '.', 'b', '..', 'c', '') === '/a/c/'
 * joinPathSegments('', '..', 'a') === '/a'
 * joinPathSegments('a', '..', '..', 'b') === '../b'
 * joinPathSegments('https://example.com/', 'a/b') === 'https://example.com/a/b'
 * joinPathSegments('https://example.com', 'a/b') === 'https://example.com/a/b'
 * joinPathSegments('file:///', '/a/b') === 'file:///a/b'
 */
export function joinPathSegments(...segments: string[]): string {
  const builtSegments: string[] = [];
  segments
    // split segments by '/', but keep segments with double slashes together
    .flatMap((s) => s.split(/^\/|\/$|(?<!\/)\/(?!\/)/g))
    .forEach((segment, index, arr) => {
      const isFirst = index === 0;
      const isLast = index === arr.length - 1;
      if (segment === '' && !isFirst && !isLast) return;
      if (segment === '.') {
        if (isLast) builtSegments.push('');
        return;
      }
      if (segment === '..' && builtSegments.length > 0) {
        if (!['', '..'].includes(builtSegments.at(-1)!)) builtSegments.pop();
        return;
      }
      builtSegments.push(segment);
    });
  return builtSegments.join('/');
}
