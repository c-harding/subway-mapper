<script setup lang="ts">
import { useLineFont } from './useLineFont';
import type { Line } from './model';

const { line } = defineProps<{
  line: Line;
}>();

const fontFamily = useLineFont(line);
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
