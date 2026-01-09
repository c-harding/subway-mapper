<script setup lang="ts">
import { computed } from 'vue';
import type { Line } from './model';
import { getFontName } from './useLineFont';

const { line } = defineProps<{
  line: Line;
}>();

const fontFamily = computed(() => line.font && getFontName(line.font));
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
