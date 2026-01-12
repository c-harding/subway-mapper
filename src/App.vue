<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { provide, useTemplateRef } from 'vue';
import { loadNetwork } from './loadNetwork';
import NetworkListView from './NetworkListView.vue';
import SvgLineViewerWrapper from './SvgLineViewerWrapper.vue';
import { useNetworkFonts } from './util/font';
import { svgElementInjectionKey } from './util/svg';

const networkUrl = '/networks/mvg.json';
const mapUrl = '/maps/mvg.json';
const network = computedAsync(() => loadNetwork(networkUrl, mapUrl));

useNetworkFonts(network);

provide(svgElementInjectionKey, useTemplateRef<SVGSVGElement>('svg'));
</script>

<template>
  <!-- SVG element used for measuring text -->
  <svg ref="svg" height="0"></svg>

  <SvgLineViewerWrapper v-if="network" :network :key="network.name" />
  <NetworkListView v-if="network" :network />
</template>

<style module></style>
