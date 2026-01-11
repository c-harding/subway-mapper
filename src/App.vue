<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { ref } from 'vue';
import type { layoutStrategies } from './layout-strategy';
import LineViewerSvgWrapper from './LineViewerSvgWrapper.vue';
import { loadNetwork } from './loadNetwork';
import NetworkListView from './NetworkListView.vue';
import { useNetworkFonts } from './util/font';

const networkUrl = '/networks/mvg.json';
const network = computedAsync(() => loadNetwork(networkUrl));

useNetworkFonts(network);

const layoutStrategyKey = ref<keyof typeof layoutStrategies>('vertical');
</script>

<template>
  <LineViewerSvgWrapper
    v-if="network"
    :network
    :key="network.name"
    v-model:layoutStrategy="layoutStrategyKey"
  />
  <NetworkListView v-if="network" :network />
</template>

<style module></style>
