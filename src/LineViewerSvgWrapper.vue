<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { layoutStrategies } from './layout-strategy';
import LineNumberSvg from './LineNumberSvg.vue';
import LineViewerSvg from './LineViewerSvg.vue';
import type { Network } from './model';

const { network } = defineProps<{
  network: Network;
}>();

const chosenLine = shallowRef(network.lines[0]!);
watch([() => network], ([newNetwork]) => {
  if (!newNetwork.lines.includes(chosenLine.value)) {
    chosenLine.value = newNetwork.lines[0]!;
  }
});

const layoutStrategyKeys = Object.keys(layoutStrategies) as (keyof typeof layoutStrategies)[];
const layoutStrategyKey = defineModel<keyof typeof layoutStrategies>('layoutStrategy', {
  required: true,
});
const layoutStrategy = computed(() => layoutStrategies[layoutStrategyKey.value]);

const showSafeAreas = ref(false);
</script>
<template>
  <p>
    <label v-for="(key, i) of layoutStrategyKeys" :key>
      <input
        name="layout-strategy"
        type="radio"
        :checked="i == 0"
        @click="layoutStrategyKey = key"
      />
      {{ key }}
    </label>
  </p>

  <p :class="$style.lineSelection">
    <label v-for="line in network.lines" :key="line.name">
      <input
        name="chosen-line"
        type="radio"
        :checked="chosenLine === line"
        @change="chosenLine = line"
      />
      <LineNumberSvg style="height: 1em" :network :line />
    </label>
  </p>

  <p>
    <label><input type="checkbox" v-model="showSafeAreas" /> Show safe areas</label>
  </p>

  <LineViewerSvg
    :network
    :line="chosenLine"
    :layoutStrategy
    :key="layoutStrategyKey"
    :showSafeAreas
  />
</template>

<style module>
p.lineSelection {
  label {
    font-weight: bold;
  }
}
</style>
