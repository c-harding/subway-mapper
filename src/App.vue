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

const gitHash = import.meta.env.VITE_GIT_HASH;
const gitDate = import.meta.env.VITE_GIT_DATE && new Date(import.meta.env.VITE_GIT_DATE);
</script>

<template>
  <!-- SVG element used for measuring text -->
  <svg ref="svg" height="0"></svg>

  <main>
    <SvgLineViewerWrapper v-if="network" :network :key="network.name" />
    <NetworkListView v-if="network" :network />
  </main>

  <footer :class="$style.appFooter">
    <div :class="$style.left">
      <span v-if="network?.name">{{ network.name }}</span>
    </div>
    <span :class="$style.center">Subway Mapper</span>
    <div :class="$style.right">
      <span v-if="gitDate || gitHash">Version:</span>
      <date v-if="gitDate" :datetime="gitDate.toISOString()">{{
        gitDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      }}</date>
      <span v-if="gitHash"
        >(<code>{{ gitHash }}</code
        >)</span
      >
    </div>
  </footer>
</template>

<style module>
:root {
  font-family: system-ui, sans-serif;
  height: 100%;
}

body {
  margin: 0;
  display: flex;
  flex-direction: column;

  > main {
    padding: 1em;
  }
}

.appFooter {
  display: flex;
  gap: 1em;
  align-items: center;
  font-size: 0.8em;
  color: #666;
  border-top: 1px solid #ccc;
  padding: 0.5em;

  position: sticky;
  bottom: 0;
  background: white;
  margin-top: auto;

  > * {
    flex: 1 0;
  }

  > span.center {
    text-align: center;
  }

  > div.right {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
  }
}
</style>
