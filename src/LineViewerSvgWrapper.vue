<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { layoutStrategies } from './layout-strategy';
import LineViewerSvg from './LineViewerSvg.vue';
import type { Network } from './model';
import { getFontName } from './useLineFont';

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
const layoutStrategyKey = ref<keyof typeof layoutStrategies>('vertical');
const layoutStrategy = computed(() => layoutStrategies[layoutStrategyKey.value]);

const fontFamily = computed(() => network.font && getFontName(network.font));
</script>
<template>
  <p>
    <button v-for="key of layoutStrategyKeys" :key @click="layoutStrategyKey = key">
      Set layout to {{ key }}
    </button>
  </p>

  <p :style="{ fontFamily }" :class="$style.lineSelection">
    <label v-for="line in network.lines" :key="line.name" :style="{ color: line.color }">
      <input
        name="chosen-line"
        type="radio"
        :checked="chosenLine === line"
        @change="
          chosenLine = line;
          console.log('Line selected:', line.name);
        "
      />
      {{ line.name }}
    </label>
  </p>
  <LineViewerSvg :network :line="chosenLine" :layoutStrategy :key="layoutStrategyKey" />
</template>

<style module>
p.lineSelection {
  label {
    font-weight: bold;
  }
}
</style>
