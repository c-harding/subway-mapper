<script setup lang="ts">
import { computed } from 'vue';
import LineNumberSvg from './LineNumberSvg.vue';
import type { Network } from './model';
import { getFontName } from './util/font';

const { network } = defineProps<{
  network: Network;
}>();

const fontFamily = computed(() => network.font && getFontName(network.font));
</script>
<template>
  <div
    v-for="(line, i) in network.lines"
    :style="{ fontFamily, '--line-color': line.color }"
    :class="$style.networkListView"
    :key="i"
  >
    <h2 :style="{ color: line.color }">{{ line.name }}</h2>
    <ul>
      <li v-for="station in line.stations" :key="station.name">
        {{ station.name }}
        <template v-for="otherLine of station.lines" :key="otherLine">
          {{ ' ' }}
          <LineNumberSvg :network :line="network.lines.find((line) => line.name === otherLine)!" />
        </template>
      </li>
    </ul>
  </div>
</template>

<style module>
.networkListView {
  ul > li::marker {
    color: var(--line-color);
  }

  svg {
    height: 1em;
    vertical-align: bottom;
  }
}
</style>
