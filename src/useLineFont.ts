import * as uuid from 'uuid';
import { Line } from './model';
import {
  isReactive,
  isRef,
  onUnmounted,
  readonly,
  ref,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type WatchOptions,
} from 'vue';
import { type OnCleanup, type WatchCallback } from '@vue/reactivity';

export function useLineFont(line: MaybeRefOrGetter<Line>): Ref<string | undefined> {
  const result = ref<string | undefined>(undefined);
  watchMaybeRefOrGetter(
    line,
    (newLine, _, onCleanup) => {
      result.value = getLineFont(newLine, onCleanup);
    },
    { immediate: true },
  );
  return readonly(result);
}

function watchMaybeRefOrGetter<T, Immediate extends Readonly<boolean> = false>(
  source: MaybeRefOrGetter<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>,
) {
  if (isRef(source)) {
    return watch(source, cb, options);
  } else if (isReactive(source)) {
    return watch(source as T & object, cb, options);
  } else if (typeof source === 'function') {
    return watch(source as () => T, cb, options);
  } else if (options?.immediate) {
    cb(source as T, undefined as never, onUnmounted);
  }
}

function getLineFont(line: Line, onCleanup: OnCleanup): string | undefined {
  if (!line.font) {
    return;
  } else if (line.font?.url.startsWith('google-fonts:')) {
    const fontSpec = line.font.url.replace('google-fonts:', '');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?display=swap&family=${encodeURIComponent(fontSpec.replaceAll(' ', '+'))}`;
    document.head.appendChild(link);
    onCleanup(() => document.head.removeChild(link));
    return fontSpec.split(':', 1)[0]?.replaceAll('+', ' ');
  } else if (line.font?.url.startsWith('browser:')) {
    return line.font.url.replace('browser:', '');
  } else if (line.font?.url.startsWith('./')) {
    const fontFamily = CSS.escape(line.font?.family ?? uuid.v4());

    const stylesheetEl = document.head.appendChild(document.createElement('style'));
    const stylesheet = stylesheetEl.sheet!;

    stylesheet.insertRule(`
      @font-face {
        font-family: '${fontFamily}';
        src: url(${CSS.escape(line.font.url)});
      }
    `);
    onCleanup(() => document.head.removeChild(stylesheetEl));
    return fontFamily;
  } else {
    throw new Error('Invalid font URL');
  }
}
