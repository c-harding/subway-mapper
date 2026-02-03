<script setup lang="ts">
import type { Network } from './model';
import NetworkListView from './NetworkListView.vue';
import SvgLineViewerWrapper from './SvgLineViewerWrapper.vue';
import { useNetworkFonts } from './util/font';

const { network } = defineProps<{
  network: Network;
}>();

useNetworkFonts(() => network);
</script>

<template>
  <main :class="$style.networkRoot">
    <SvgLineViewerWrapper v-if="network" :network :key="network.name" />
    <NetworkListView v-if="network" :network />
  </main>
</template>

<style module>
.networkRoot {
  padding: 1em;
}
</style>
