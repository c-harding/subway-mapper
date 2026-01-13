<script setup lang="ts">
import type { Network } from './model';

const { network, networkUrl, mapUrl } = defineProps<{
  network?: Network;
  networkUrl?: URL;
  mapUrl?: URL;
}>();

const gitHash = import.meta.env.VITE_GIT_HASH;
const gitDate = import.meta.env.VITE_GIT_DATE && new Date(import.meta.env.VITE_GIT_DATE);

const activeUrls = [networkUrl, mapUrl].filter((url): url is URL => url !== undefined);
</script>

<template>
  <footer :class="$style.appFooter">
    <strong>Subway Mapper</strong>
    <span v-if="networkUrl && network">
      <span v-if="network?.name">{{ network.name }}</span>
      {{ ' ' }}
      <template v-for="(url, i) of activeUrls" :key="i">
        <span :class="$style.inlineBlock"
          >{{ i === 0 ? '(' : ''
          }}<a :href="url.href" download target="_blank"
            ><code>{{ url.pathname }}</code></a
          >{{ i === activeUrls.length - 1 ? ')' : ',' }}</span
        >{{ ' ' }}
      </template>
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

  a {
    color: inherit;
  }

  > div {
    display: flex;
    gap: 0.5em;
    justify-content: center;
  }

  > :first-child {
    text-align: left;
    justify-content: start;
  }

  > :last-child:not(:first-child) {
    text-align: right;
    justify-content: end;
  }
}
</style>
