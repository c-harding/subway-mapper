<script setup lang="ts">
import axios from 'axios';
import * as uuid from 'uuid';
import { Line } from './model';
import { onUnmounted } from 'vue';

const lineSource = '/lines/line.json';
const line = await axios.get(lineSource).then((res) => Line.parse(res.data));

let fontFamily: string;
if (line.font?.url.startsWith('google-fonts:')) {
  const fontSpec = line.font.url.replace('google-fonts:', '');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?display=swap&family=${encodeURIComponent(fontSpec)}`;
  fontFamily = fontSpec.split(':')[0]!;
  document.head.appendChild(link);
  onUnmounted(() => document.head.removeChild(link));
} else if (line.font?.url.startsWith('./')) {
  const stylesheetEl = document.head.appendChild(document.createElement('style'));
  const stylesheet = stylesheetEl.sheet!;

  fontFamily = CSS.escape(line.font?.family ?? uuid.v4());

  stylesheet.insertRule(`
    @font-face {
      font-family: '${fontFamily}';
      src: url(${CSS.escape(line.font.url)});
    }
  `);

  onUnmounted(() => document.head.removeChild(stylesheetEl));
}
</script>
<template>
  <div :style="{ fontFamily }" :class="$style.lineViewer">
    <ul>
      <li v-for="station in line.stations" :key="station.name">
        {{ station.name }}
      </li>
    </ul>
  </div>
</template>

<style module>
.lineViewer {
  ul > li::marker {
    color: v-bind('line.color');
  }
}
</style>
