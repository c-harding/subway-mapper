import type { DomBox } from '@/geometry/Point';
import stableStringify from 'json-stable-stringify';
import { computed, inject, type InjectionKey, type ShallowRef } from 'vue';
import { fontsLoaded } from './font';

const svgns = 'http://www.w3.org/2000/svg';

export abstract class SvgSizeCache {
  abstract get(styles: object, text: string): DomBox | undefined;
  protected abstract set(styles: object, text: string, box: DomBox): void;
  getOrCalculate(styles: object, text: string, calculate: () => DomBox): DomBox {
    const cached = this.get(styles, text);
    if (cached) {
      return cached;
    }
    const box = calculate();
    this.set(styles, text, box);
    return box;
  }

  static getOrCalculate(
    sizeCache: SvgSizeCache | undefined,
    styles: object,
    text: string,
    calculate: () => DomBox,
  ): DomBox {
    if (sizeCache) {
      return sizeCache.getOrCalculate(styles, text, calculate);
    } else {
      return calculate();
    }
  }
}

export class MemorySvgSizeCache extends SvgSizeCache {
  private readonly cache = new Map<string, Map<string, DomBox>>();

  override get(styles: object, text: string) {
    const key = stableStringify(styles);
    if (!key) {
      throw new Error('Failed to stringify styles for text measurement cache key');
    }
    const styleCache = this.cache.get(key);
    return styleCache?.get(text);
  }

  protected override set(styles: object, text: string, box: DomBox): void {
    const key = stableStringify(styles);
    if (!key) {
      throw new Error('Failed to stringify styles for text measurement cache key');
    }
    let styleCache = this.cache.get(key);
    if (!styleCache) {
      styleCache = new Map();
      this.cache.set(key, styleCache);
    }
    styleCache.set(text, box);
  }
}

function measureTextBBox(
  svg: SVGSVGElement,
  text: string,
  styles: object,
  sizeCache: SvgSizeCache | undefined,
): DomBox {
  return SvgSizeCache.getOrCalculate(sizeCache, styles, text, () => {
    const data = document.createTextNode(text);

    const textElement = document.createElementNS(svgns, 'text');
    Object.assign(textElement.style, styles);

    textElement.appendChild(data);

    svg.appendChild(textElement);

    const bbox = textElement.getBBox();
    const box = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };

    svg.removeChild(textElement);

    return box;
  });
}

interface TextLengthInfo {
  height: number;
  lineBoxes: DomBox[];
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

function measureTextBBoxes(
  svg: SVGSVGElement,
  texts: string[],
  lineHeight: number,
  styles: object,
  sizeCache: SvgSizeCache | undefined,
): TextBox[] {
  const stringsByLineCount = new Map<number, string[][]>();

  for (const text of texts) {
    const lines = text.split('\n');
    stringsByLineCount.set(
      lines.length,
      (stringsByLineCount.get(lines.length) ?? []).concat([lines]),
    );
  }

  sizeCache ??= new MemorySvgSizeCache();

  return Array.from(stringsByLineCount.values(), (texts): TextBox => {
    const textLengths = texts.map((lines): TextLengthInfo => {
      const lineBoxes = lines.map((line) => measureTextBBox(svg, line, styles, sizeCache));
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

function measureTextHeight(
  svg: SVGSVGElement,
  text: string,
  styles: object,
  sizeCache: SvgSizeCache | undefined,
) {
  const bottomAlignedBbox = measureTextBBox(
    svg,
    text,
    { ...styles, dominantBaseline: 'alphabetic' },
    sizeCache,
  );
  const topAlignedBbox = measureTextBBox(
    svg,
    text,
    { ...styles, dominantBaseline: 'hanging' },
    sizeCache,
  );
  return topAlignedBbox.y - bottomAlignedBbox.y;
}

export const svgElementInjectionKey = Symbol('svgElementInjectionKey') as InjectionKey<
  Readonly<ShallowRef<SVGSVGElement | null>>
>;

export const svgSizeCacheInjectionKey = Symbol(
  'svgSizeCacheInjectionKey',
) as InjectionKey<SvgSizeCache>;

export function useSvgMeasurement({ suppressCacheWarning = false } = {}) {
  const svg = inject(svgElementInjectionKey, undefined);
  if (!svg) {
    throw new Error(
      'No SVG element provided for measurement. Make sure to provide svgElementInjectionKey.',
    );
  }
  const sizeCache = inject(svgSizeCacheInjectionKey, undefined);
  if (!sizeCache && !suppressCacheWarning) {
    console.warn(
      'No size cache provided for measurement. Text measurements may be slower than expected. ' +
        'Consider providing sizeCacheInjectionKey, or suppress this warning by passing { suppressCacheWarning: true } to useSvgMeasurement().',
    );
  }
  const ready = computed(() => svg.value !== null && fontsLoaded.value);
  return {
    ready,
    textBBox: (text: string, styles: object) =>
      ready.value ? measureTextBBox(svg.value!, text, styles, sizeCache) : null,
    textBBoxes: (texts: string[], lineHeight: number, styles: object) =>
      ready.value ? measureTextBBoxes(svg.value!, texts, lineHeight, styles, sizeCache) : [],
    textHeight: (text: string, styles: object) =>
      ready.value ? measureTextHeight(svg.value!, text, styles, sizeCache) : 0,
  };
}
