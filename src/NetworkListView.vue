<script setup lang="ts">
import { computed } from 'vue';
import type { Network } from './model';
import { getFontName } from './useLineFont';

const { network } = defineProps<{
  network: Network;
}>();

const fontFamily = computed(() => network.font && getFontName(network.font));
</script>
<template>
  <div
    v-for="(line, i) in network.lines"
    :style="{ fontFamily, '--line-color': line.color }"
    :class="$style.lineViewer"
    :key="i"
  >
    <h2 :style="{ color: line.color }">{{ line.name }}</h2>
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
    color: var(--line-color);
  }
}
</style>
