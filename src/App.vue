<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import LineViewerSvgWrapper from './LineViewerSvgWrapper.vue';
import { loadNetwork } from './loadNetwork';
import NetworkListView from './NetworkListView.vue';
import { useNetworkFonts } from './util/font';

const networkUrl = '/networks/mvg.json';
const mapUrl = '/maps/mvg.json';
const network = computedAsync(() => loadNetwork(networkUrl, mapUrl));

useNetworkFonts(network);
</script>

<template>
  <LineViewerSvgWrapper v-if="network" :network :key="network.name" />
  <NetworkListView v-if="network" :network />
</template>

<style module></style>
