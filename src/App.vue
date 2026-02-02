<script setup lang="ts">
import { provide, useTemplateRef } from 'vue';
import AppFooter from './AppFooter.vue';
import ErrorBox from './ErrorBox.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import { loadNetwork } from './loadNetwork';
import NetworkRoot from './NetworkRoot.vue';
import { delayRef } from './util/delayRef';
import { svgElementInjectionKey } from './util/svg';
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

const networkUrl = networks[0] ? new URL('/networks/' + networks[0], document.baseURI) : undefined;
const mapUrl = maps[0] ? new URL('/maps/' + maps[0], document.baseURI) : undefined;

const {
  isLoading: loadingNetwork,
  state: network,
  error: networkLoadingError,
  execute: reloadNetwork,
} = useResource({
  request: () => (networkUrl ? { networkUrl, mapUrl } : undefined),
  loader: ({ request }) => loadNetwork(request.networkUrl.toString(), request.mapUrl?.toString()),
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
  <ErrorBox v-else-if="networkLoadingError">
    The network <code>{{ networkUrl.pathname }}</code> could not be loaded, with error:
    <template #pre>
      <pre>{{
        networkLoadingError instanceof Error
          ? (networkLoadingError.message + '\n' + networkLoadingError.stack).trim()
          : networkLoadingError
      }}</pre>
    </template>
    <template #actions>
      <button @click="() => reloadNetwork()">Try again</button>
    </template>
  </ErrorBox>

  <ErrorBox v-else-if="showLoading" color="#000">
    Loading network <code>{{ networkUrl.pathname }}</code
    >...
    <template #icon><LoadingSpinner /></template>
  </ErrorBox>

  <NetworkRoot v-else-if="network" :network="network" :networkUrl :mapUrl />

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
