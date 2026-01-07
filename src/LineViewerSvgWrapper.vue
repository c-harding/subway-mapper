<script setup lang="ts">
import type { Line } from './model';
import { computed, ref } from 'vue';
import { layoutStrategies } from './layout-strategy';
import LineViewerSvg from './LineViewerSvg.vue';

const { line } = defineProps<{
  line: Line;
}>();

const layoutStrategyKeys = Object.keys(layoutStrategies) as (keyof typeof layoutStrategies)[];
const layoutStrategyKey = ref<keyof typeof layoutStrategies>('vertical');
const layoutStrategy = computed(() => layoutStrategies[layoutStrategyKey.value]);
</script>
<template>
  <button v-for="key of layoutStrategyKeys" :key @click="layoutStrategyKey = key">
    Set layout to {{ key }}
  </button>
  <LineViewerSvg :line :layoutStrategy :key="layoutStrategyKey" />
</template>
