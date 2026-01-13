<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { allDirections, allSides, type Direction } from './layout-strategy';
import type { Network } from './model';
import SvgLineNumber from './SvgLineNumber.vue';
import SvgLineViewer from './SvgLineViewer.vue';
import {
  useBooleanSearchParam,
  useEnumSearchParam,
  useNumberSearchParam,
  useStringSearchParam,
} from './util/searchParam';

const { network } = defineProps<{
  network: Network;
}>();

const lineId = useStringSearchParam('line', () => network.lines[0]!.name);

watchEffect(() => {
  if (!network.lines.find((line) => line.name === lineId.value)) {
    lineId.value = network.lines[0]!.name;
  }
});

const chosenLine = computed(() => network.lines.find((line) => line.name === lineId.value)!);

const initialSide = useEnumSearchParam('initialSide', allSides, 'left');
const forceSide = useBooleanSearchParam('forceSide', false);
const direction = useEnumSearchParam('direction', allDirections, 's');
const compact = useBooleanSearchParam('compact', false);
const maxWidth = useNumberSearchParam('maxWidth');
const maxHeight = useNumberSearchParam('maxHeight');
const showSafeAreas = useBooleanSearchParam('showSafeAreas', false);

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
      <label>
        <input type="checkbox" v-model="forceSide" />
        Force label side
      </label>
      <label v-for="side in ['left', 'right'] as const" :key="side">
        <input
          type="radio"
          name="initial-side"
          :value="side"
          :checked="initialSide === side"
          @change="initialSide = side"
        />
        {{ side }}
      </label>
    </div>
    <div :class="$style.controlColumn">
      <label> <input type="checkbox" v-model="compact" /> Compact display </label>

      <label>
        Max width
        <input type="number" v-model.number.lazy="maxWidth" size="6" min="0" />
      </label>
      <label>
        Max height
        <input type="number" v-model.number.lazy="maxHeight" size="6" min="0" />
      </label>
    </div>
  </div>

  <p :class="$style.lineSelection">
    <label v-for="line in network.lines" :key="line.name">
      <input
        name="chosen-line"
        type="radio"
        :checked="lineId === line.name"
        @change="lineId = line.name"
      />
      <SvgLineNumber style="height: 1em" :network :line />
    </label>
    <label><input type="checkbox" v-model="showSafeAreas" /> Show safe areas</label>
  </p>

  <SvgLineViewer
    :network
    :line="chosenLine"
    :showSafeAreas
    :direction
    :initialSide
    :forceSide
    :compact
    :maxWidth="maxWidth || undefined"
    :maxHeight="maxHeight || undefined"
  />
</template>

<style module>
p.lineSelection {
  display: flex;
  column-gap: 1ch;
  flex-wrap: wrap;
  align-items: center;
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
