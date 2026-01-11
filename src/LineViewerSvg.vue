<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';
import { Box } from './Point';
import type { MapConfig } from './config';
import { type LayoutStrategy, type StationPosition } from './layout-strategy';
import type { Line, Network } from './model';
import { getFontName } from './util/font';
import { measureTextBBox } from './util/svg';

const { network, line, layoutStrategy } = defineProps<{
  network: Network;
  line: Line;
  layoutStrategy: LayoutStrategy;
}>();

const mapConfig: MapConfig = {
  padding: 10,
  spacing: {
    marker: 32,
    label: 15,
  },
  gap: {
    markerLabel: 2,
  },
  lineWidth: 10,
  marker: {
    radius: 6,
    strokeWidth: 3,
  },
  label: {
    fontSize: 30,
    fontWeight: 600,
  },
};

const fontFamily = computed(() => network.font && getFontName(network.font));

const fontsLoaded = computedAsync(() => document.fonts.ready.then(() => true), false);

const svg = useTemplateRef<SVGSVGElement>('svg');

function labelStyles(props?: { textAnchor?: 'start' | 'middle' | 'end'; fontWeight?: number }) {
  return {
    fontFamily: fontFamily.value,
    fontSize: `${mapConfig.label.fontSize}px`,
    fontWeight: props?.fontWeight ?? mapConfig.label.fontWeight,
    textAnchor: props?.textAnchor ?? 'middle',
    dominantBaseline: 'middle',
  } as const;
}

const svgProps = computed(() => {
  if (!svg.value || !fontsLoaded.value) {
    return { positions: [] };
  }
  const svgElement = svg.value;

  const positions: StationPosition[] = [];

  for (const station of line.stations) {
    positions.push(
      layoutStrategy.nextPosition(positions.at(-1), station, mapConfig, (props) =>
        measureTextBBox(
          svgElement,
          station.name,
          labelStyles({
            textAnchor: props?.textAnchor,
            fontWeight: station.terminus ? 700 : undefined,
          }),
        ),
      ),
    );
  }

  const bounds = Box.bounds(positions.flatMap((pos) => [pos.marker, pos.label]));

  return { positions, bounds };
});

const viewBox = computed(() => {
  const bounds = svgProps.value.bounds;
  if (!bounds) {
    return undefined;
  }

  const padded = bounds.withPadding(mapConfig.padding);

  return `${padded.min.x} ${padded.min.y} ${padded.width} ${padded.height}`;
});

const polylinePoints = computed(() =>
  svgProps.value.positions.map((pos) => `${pos.marker.x},${pos.marker.y}`).join(' '),
);
</script>
<template>
  <svg ref="svg" :viewBox>
    <g id="lines-background">
      <polyline
        :points="polylinePoints"
        stroke="white"
        :stroke-width="mapConfig.lineWidth + mapConfig.marker.strokeWidth * 2"
        stroke-linecap="butt"
        fill="none"
      />
    </g>
    <g id="station-markers-background">
      <circle
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="mapConfig.marker.radius + mapConfig.marker.strokeWidth * 2"
        fill="white"
      />
    </g>
    <g id="lines">
      <polyline
        :points="polylinePoints"
        :stroke="line.color"
        :stroke-width="mapConfig.lineWidth"
        stroke-linecap="round"
        fill="none"
      />
    </g>
    <g id="station-markers-line">
      <circle
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="mapConfig.marker.radius + mapConfig.marker.strokeWidth"
        fill="black"
      />
    </g>
    <g id="station-markers-fill">
      <circle
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="mapConfig.marker.radius"
        fill="white"
      />
    </g>
    <g id="station-labels">
      <text
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :x="pos.label.x"
        :y="pos.label.y"
        :style="
          labelStyles({
            textAnchor: pos.textAnchor,
            fontWeight: pos.station.terminus ? 700 : undefined,
          })
        "
      >
        {{ pos.station.name }}
      </text>
    </g>
  </svg>
</template>
