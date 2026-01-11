export function hyphenationAlternatives(
  text: string,
  hyphenationMap: Map<string, string> | undefined,
): string[] {
  return hyphenations(text, hyphenationMap).slice(1);
}

export function hyphenations(
  text: string,
  hyphenationMap: Map<string, string> | undefined,
): string[] {
  const hyphenatedWord = applyHyphenations(text, hyphenationMap);
  return wordToShallowHyphenation(hyphenatedWord);
}

function applyHyphenations(text: string, hyphenationMap: Map<string, string> | undefined): string {
  if (!hyphenationMap) {
    return text;
  }

  return text
    .split(' ')
    .map(
      (word) =>
        hyphenationMap.get(word) ??
        word
          .split('-')
          .map((part) => hyphenationMap.get(part) ?? part)
          .join('-'),
    )
    .join(' ');
}

function wordToShallowHyphenation(word: string): string[] {
  return partsToShallowHyphenation(word.split(/(?<=~|-| +)/));
}

function partsToShallowHyphenation(parts: string[]): string[] {
  return Array.from({ length: 1 << (parts.length - 1) }, (_, i) =>
    parts
      .map((part, j) =>
        (i >> j) & 1 ? part.replace(/~$/, '-').replace(/ +$/, '') + '\n' : part.replace(/~$/, ''),
      )
      .join(''),
  );
}
