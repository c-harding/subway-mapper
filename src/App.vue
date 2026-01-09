<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import LineViewer from './LineViewer.vue';
import LineViewerSvgWrapper from './LineViewerSvgWrapper.vue';
import { loadLine } from './loadLine';
import { useLineFont } from './useLineFont';

const lineUrl = '/lines/line.json';
const line = computedAsync(() => loadLine(lineUrl));

useLineFont(line);
</script>

<template>
  <LineViewerSvgWrapper v-if="line" :line :key="line.name" />
  <LineViewer v-if="line" :line />
</template>

<style module></style>
