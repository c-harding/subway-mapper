<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { type Direction, type Side } from './layout-strategy';
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

const initialSide = ref<Side>('left');
const direction = ref<Direction>('s');
const compact = ref(false);
const maxWidth = ref<number | undefined>(undefined);
const maxHeight = ref<number | undefined>(undefined);

const directionArrow = computed(() => {
  return {
    n: '↑',
    ne: '↗',
    e: '→',
    se: '↘',
    s: '↓',
    sw: '↙',
    w: '←',
    nw: '↖',
  }[direction.value];
});

const directionGrid: (Direction | '.')[][] = [
  ['nw', 'n', 'ne'],
  ['w', '.', 'e'],
  ['sw', 's', 'se'],
];

const showSafeAreas = ref(false);
</script>
<template>
  <div :class="$style.controlRow">
    <table>
      <tr v-for="(row, rowIndex) of directionGrid" :key="rowIndex">
        <td v-for="(cell, cellIndex) of row" :key="cellIndex" :style="{ textAlign: 'center' }">
          <input
            v-if="cell !== '.'"
            type="radio"
            name="direction"
            :checked="cell === direction"
            :value="cell"
            @change="direction = cell"
          />
          <span v-else>{{ directionArrow }}</span>
        </td>
      </tr>
    </table>
    <div :class="$style.controlColumn">
      <label v-for="side in ['left', 'right'] as const" :key="side">
        <input
          type="radio"
          name="initial-side"
          :value="side"
          :checked="initialSide === side"
          @change="initialSide = side"
        />
        Labels on {{ side }}
      </label>
    </div>
    <div :class="$style.controlColumn">
      <label> <input type="checkbox" v-model="compact" /> Compact display </label>
    </div>
    <div :class="$style.controlColumn">
      <label>Max width <input type="number" v-model.number.lazy="maxWidth" /></label>
      <label>Max height <input type="number" v-model.number.lazy="maxHeight" /></label>
    </div>
  </div>

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
    :showSafeAreas
    :direction
    :initialSide
    :compact
    :maxWidth="maxWidth || undefined"
    :maxHeight="maxHeight || undefined"
  />
</template>

<style module>
p.lineSelection {
  label {
    font-weight: bold;
  }
}

.controlRow {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;

  .controlColumn {
    display: flex;
    flex-direction: column;
  }
}
</style>
