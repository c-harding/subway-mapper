<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import LineViewerSvgWrapper from './LineViewerSvgWrapper.vue';
import { loadNetwork } from './loadNetwork';
import LineViewer from './NetworkListView.vue';
import { useNetworkFonts } from './useLineFont';

const networkUrl = '/networks/mvg.json';
const network = computedAsync(() => loadNetwork(networkUrl));

useNetworkFonts(network);
</script>

<template>
  <LineViewerSvgWrapper v-if="network" :network :key="network.name" />
  <LineViewer v-if="network" :network />
</template>

<style module></style>
