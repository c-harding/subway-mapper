import * as uuid from 'uuid';
import { readonly, ref, type MaybeRefOrGetter, type WatchEffect } from 'vue';
import { FontReference, Network } from '../model';
import { watchMaybeRefOrGetter } from './composable';

const fontsLoadedRef = ref(0);
export const fontsLoaded = readonly(fontsLoadedRef);

export function useNetworkFonts(network: MaybeRefOrGetter<Network | undefined>) {
  watchMaybeRefOrGetter(
    network,
    (newNetwork, _, onCleanup) => {
      if (newNetwork) getNetworkFonts(newNetwork, onCleanup);
    },
    { immediate: true },
  );
}

type OnCleanup = Parameters<WatchEffect>[0];

function getFont(font: FontReference, onCleanup: OnCleanup) {
  if (font.url.startsWith('google-fonts:')) {
    const fontSpec = font.url.replace('google-fonts:', '');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?display=swap&family=${encodeURIComponent(
      fontSpec.replaceAll(' ', '+'),
    )}`;
    document.head.appendChild(link);
    onCleanup(() => document.head.removeChild(link));
    return fontSpec.split(':', 1)[0]!.replaceAll('+', ' ');
  } else if (font.url.startsWith('browser:')) {
    // Nothing to load
  } else if (font.url.startsWith('./')) {
    const fontFamily = CSS.escape(font.family ?? uuid.v4());

    const stylesheetEl = document.head.appendChild(document.createElement('style'));
    const stylesheet = stylesheetEl.sheet!;

    stylesheet.insertRule(`
      @font-face {
        font-family: '${fontFamily}';
        src: url(${CSS.escape(font.url)});
      }
    `);
    onCleanup(() => document.head.removeChild(stylesheetEl));
    return fontFamily;
  } else {
    throw new Error('Invalid font URL');
  }
}

export function getFontName(font: FontReference) {
  if (font.url.startsWith('google-fonts:')) {
    const fontSpec = font.url.replace('google-fonts:', '');
    return fontSpec.split(':', 1)[0]!.replaceAll('+', ' ');
  } else if (font.url.startsWith('browser:')) {
    return font.url.replace('browser:', '');
  } else if (font.url.startsWith('./')) {
    return CSS.escape(font.family ?? uuid.v4());
  } else {
    throw new Error('Invalid font URL');
  }
}

function getNetworkFonts(network: Network, onCleanup: OnCleanup) {
  for (const lineSymbol of Object.values(network.lineSymbols ?? {})) {
    if (lineSymbol.font) {
      getFont(lineSymbol.font, onCleanup);
    }
  }
  if (network.font) {
    getFont(network.font, onCleanup);
  }

  document.fonts.addEventListener('loadingdone', () => fontsLoadedRef.value++, { once: true });
}
