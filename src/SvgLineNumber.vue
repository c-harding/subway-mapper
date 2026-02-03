<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { computed } from 'vue';
import type { Line, Network } from './model';
import { getFontName } from './util/font';
import { useSvgMeasurement } from './util/svg';

const { network, line } = defineProps<{
  network: Network;
  line: Line;
}>();

const lineType = computed(() => {
  return line.lineType ? (network.lineSymbols?.[line.lineType] ?? {}) : {};
});

const font = computed(() => {
  return lineType.value.font ?? network.font;
});

const fontFamily = computed(() => font.value && getFontName(font.value));

const labelStyles = computed(
  () =>
    ({
      fontFamily: fontFamily.value,
      fontWeight: lineType.value.fontWeight,
      fontSize: `${lineType.value.fontSize ?? 30}px`,
      textAnchor: 'middle',
      dominantBaseline: 'alphabetic',
    }) as const,
);

const svgMeasurement = useSvgMeasurement();

const textBBox = computedAsync(() => svgMeasurement.textBBox(line.name, labelStyles.value));

const textHeight = computedAsync(() => svgMeasurement.textHeight(line.name, labelStyles.value), 0);

const height = computed(() => {
  if (!textBBox.value) {
    return 0;
  }
  return (
    lineType.value.height ??
    textHeight.value + (lineType.value.padding?.top ?? 0) + (lineType.value.padding?.bottom ?? 0)
  );
});

const width = computed(() => {
  if (!textBBox.value) {
    return 0;
  }
  return (
    lineType.value.width ??
    textBBox.value.width +
      (lineType.value.padding?.left ?? 0) +
      (lineType.value.padding?.right ?? 0)
  );
});

const r = computed(() => {
  if (lineType.value?.shape === 'oval') {
    return { x: width.value / 2, y: height.value / 2 };
  } else if (lineType.value?.shape === 'pill') {
    const r = Math.min(height.value, width.value) / 2;
    return { x: r, y: r };
  } else {
    return { x: 0, y: 0 };
  }
});
</script>
<template>
  <svg :viewBox="`0 0 ${width} ${height}`" v-bind="$attrs">
    <rect :rx="r.x" :ry="r.y" :height :width :fill="line.color" />
    <text
      :x="width / 2"
      :y="height / 2 + textHeight / 2 + (lineType.baseLineShift ?? 0)"
      :style="labelStyles"
      :fill="line.overlayColor"
    >
      {{ line.name }}
    </text>
  </svg>
</template>
