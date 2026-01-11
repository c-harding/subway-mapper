const svgns = 'http://www.w3.org/2000/svg';

export function measureTextBBox(svg: SVGSVGElement, text: string, styles: object) {
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, styles);

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bbox = textElement.getBBox();

  svg.removeChild(textElement);

  return bbox;
}

interface TextLengthInfo {
  height: number;
  lineBoxes: SVGRect[];
  maxWidth: number;
  minWidth: number;
  lines: string[];
}

export interface TextBox {
  lines: string[];
  width: number;
  height: number;
  x: number;
  y: number;
}

function findBestWrapping(textLengths: TextLengthInfo[]): TextLengthInfo {
  if (textLengths.length === 0) {
    throw new Error('findBestWrapping([]) called with empty array');
  }
  const best = textLengths.sort((a, b) => {
    // minimise max line length
    if (a.maxWidth !== b.maxWidth) {
      return a.maxWidth - b.maxWidth;
    }
    // maximise min line length
    if (a.minWidth !== b.minWidth) {
      return b.minWidth - a.minWidth;
    }
    // favour earlier lines being longer
    for (let i = 0; i < Math.min(a.lineBoxes.length, b.lineBoxes.length); i++) {
      if (a.lineBoxes[i] !== b.lineBoxes[i]) {
        return b.lineBoxes[i]!.width - a.lineBoxes[i]!.width;
      }
    }
    return 0;
  });
  return best[0]!;
}

export function measureTextBBoxes(
  svg: SVGSVGElement,
  texts: string[],
  lineHeight: number,
  styles: object,
): TextBox[] {
  const stringsByLineCount = new Map<number, string[][]>();

  for (const text of texts) {
    const lines = text.split('\n');
    stringsByLineCount.set(
      lines.length,
      (stringsByLineCount.get(lines.length) ?? []).concat([lines]),
    );
  }

  const lengths: Record<string, SVGRect> = {};

  return Array.from(stringsByLineCount.values(), (texts): TextBox => {
    const textLengths = texts.map((lines): TextLengthInfo => {
      const lineBoxes = lines.map((line) => (lengths[line] ??= measureTextBBox(svg, line, styles)));
      const lineWidths = lineBoxes.map((box) => box.width);
      const totalHeight =
        lineHeight * (lineBoxes.length - 1) -
        lineBoxes.at(0)!.y +
        (lineBoxes.at(-1)!.height + lineBoxes.at(-1)!.y);
      return {
        height: totalHeight,
        lineBoxes,
        maxWidth: Math.max(...lineWidths),
        minWidth: Math.min(...lineWidths),
        lines,
      };
    });
    const bestWrapping = findBestWrapping(textLengths);
    const xPos = Math.min(...bestWrapping.lineBoxes.map((box) => box.x));

    return {
      lines: bestWrapping.lines,
      width: bestWrapping.maxWidth,
      height: bestWrapping.height,
      x: xPos,
      y: bestWrapping.lineBoxes[0]!.y,
    };
  }).sort((a, b) => a.lines.length - b.lines.length);
}

export function measureTextHeight(svg: SVGSVGElement, text: string, styles: object) {
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, styles);
  textElement.style.dominantBaseline = 'alphabetic';

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bottomAlignedBBox = textElement.getBBox();

  textElement.style.dominantBaseline = 'hanging';

  const topAlignedBBox = textElement.getBBox();

  svg.removeChild(textElement);

  return topAlignedBBox.y - bottomAlignedBBox.y;
}
