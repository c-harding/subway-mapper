<script setup lang="ts">
import { provide, useTemplateRef } from 'vue';
import * as z from 'zod';
import AppFooter from './AppFooter.vue';
import ErrorBox from './ErrorBox.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import { loadNetwork } from './loadNetwork';
import NetworkRoot from './NetworkRoot.vue';
import { delayRef } from './util/delayRef';
import { joinPathSegments } from './util/path';
import { MemorySvgSizeCache, svgElementInjectionKey, svgSizeCacheInjectionKey } from './util/svg';
import { definedFilter } from './util/undefined';
import { useResource } from './util/useResource';

provide(svgElementInjectionKey, useTemplateRef<SVGSVGElement>('svg'));

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

const baseUrl = import.meta.env.BASE_URL;
const networkUrl = networks[0] ? joinPathSegments(baseUrl, 'networks', networks[0]) : undefined;
const mapUrl = maps[0] ? joinPathSegments(baseUrl, 'maps', maps[0]) : undefined;

provide(svgSizeCacheInjectionKey, new MemorySvgSizeCache());

const {
  isLoading: loadingNetwork,
  state: network,
  error: networkLoadingError,
  execute: reloadNetwork,
} = useResource({
  request: () => (networkUrl ? { networkUrl, mapUrl } : undefined),
  hotUrls: ({ request }) => [request.networkUrl, request.mapUrl].filter(definedFilter),
  loader: ({ request }) => loadNetwork(request.networkUrl, request.mapUrl),
});

const showLoading = delayRef(loadingNetwork, (isLoading) => (isLoading ? 300 : 500));
</script>

<template>
  <!-- SVG element used for measuring text -->
  <svg ref="svg" height="0"></svg>

  <ErrorBox v-if="!networkUrl">
    No networks were found on the server (in <code>./networks/</code>). Please add at least one
    network JSON file to use Subway Mapper.
  </ErrorBox>
  <ErrorBox
    v-else-if="networkLoadingError"
    :stackTrace="networkLoadingError instanceof Error ? networkLoadingError.stack : undefined"
  >
    The network <code>{{ networkUrl }}</code> could not be loaded, with error:
    <template #pre>
      <pre v-if="networkLoadingError instanceof z.ZodError">{{
        z.prettifyError(networkLoadingError)
      }}</pre>
      <pre v-else>{{ networkLoadingError }}</pre>
    </template>
    <template #actions>
      <button @click="() => reloadNetwork()">Try again</button>
    </template>
  </ErrorBox>

  <ErrorBox v-else-if="showLoading" color="#000">
    Loading network <code>{{ networkUrl }}</code
    >...
    <template #icon><LoadingSpinner /></template>
  </ErrorBox>

  <NetworkRoot v-else-if="network" :network="network" />

  <AppFooter :network :networkUrl :mapUrl />
</template>

<style module>
:root {
  font-family: system-ui, sans-serif;
  min-height: 100vh;
}

body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
