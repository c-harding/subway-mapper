<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { provide, useTemplateRef } from 'vue';
import { loadNetwork } from './loadNetwork';
import NetworkListView from './NetworkListView.vue';
import SvgLineViewerWrapper from './SvgLineViewerWrapper.vue';
import { useNetworkFonts } from './util/font';
import { svgElementInjectionKey } from './util/svg';

const maps = Object.keys(
  import.meta.glob('./*.json', {
    base: '../public/maps/',
  }),
);
const networks = Object.keys(
  import.meta.glob('./*.json', {
    base: '../public/networks/',
  }),
);

if (networks.length === 0) {
  throw new Error('No networks found in ./networks/');
}
if (maps.length === 0) {
  throw new Error('No maps found in ./maps/');
}

const networkUrl = new URL('/networks/' + networks[0]!, document.baseURI);
const mapUrl = new URL('/maps/' + maps[0]!, document.baseURI);
const network = computedAsync(() => loadNetwork(networkUrl.toString(), mapUrl.toString()));

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
    <strong>Subway Mapper</strong>
    <span :class="$style.left">
      <span v-if="network?.name">{{ network.name }}</span>
      {{ ' ' }}
      <span :class="$style.inlineBlock"
        >(<code>{{ networkUrl.pathname }}</code
        >)</span
      >
      (Map:
      <span :class="$style.inlineBlock"
        ><code>{{ mapUrl.pathname }}</code
        >)</span
      >
    </span>
    <div :class="$style.right" v-if="gitDate || gitHash">
      <span>Version:</span>
      <time v-if="gitDate" :datetime="gitDate.toISOString()">{{
        gitDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      }}</time>
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
    text-align: center;
  }

  .inlineBlock {
    display: inline-block;
  }

  > div {
    display: flex;
    gap: 0.5em;
    justify-content: center;
  }

  > :first-child:not(:last-child) {
    text-align: left;
    justify-content: start;
  }

  > :last-child:not(:first-child) {
    text-align: right;
    justify-content: end;
  }
}
</style>
