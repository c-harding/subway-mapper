<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import LineViewer from './LineViewer.vue';
import { loadLine } from './loadLine';
import LineViewerSvg from './LineViewerSvg.vue';

const lineUrl = '/lines/line.json';
const line = computedAsync(() => loadLine(lineUrl));
</script>

<template>
  <!-- <LineViewer v-if="line" :line /> -->
  <LineViewerSvg v-if="line" :line :key="line" />
</template>

<style module></style>
