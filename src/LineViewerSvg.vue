<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';
import { Box, Padding, Spacing } from './Point';
import type { MapConfig } from './config';
import { type LayoutStrategy, type StationPosition } from './layout-strategy';
import type { Line, Network } from './model';
import { getFontName } from './util/font';
import { hyphenations } from './util/hyphenation';
import { measureTextBBoxes } from './util/svg';

const { network, line, layoutStrategy } = defineProps<{
  network: Network;
  line: Line;
  layoutStrategy: LayoutStrategy;
  showSafeAreas?: boolean;
}>();

const mapConfig: MapConfig = {
  padding: new Padding(10),
  spacing: {
    marker: new Spacing({ x: 32, y: 22 }),
    label: new Spacing({ x: 15, y: 4 }),
  },
  gap: {
    markerLabel: new Spacing(2),
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

function labelStyles(props?: {
  textAnchor?: 'start' | 'middle' | 'end';
  fontWeight?: number;
  dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
}) {
  return {
    fontFamily: fontFamily.value,
    fontSize: `${mapConfig.label.fontSize}px`,
    fontWeight: props?.fontWeight ?? mapConfig.label.fontWeight,
    textAnchor: props?.textAnchor ?? 'middle',
    dominantBaseline: props?.dominantBaseline ?? 'middle',
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
      layoutStrategy.nextPosition({
        station,
        mapConfig,
        previous: positions.at(-1),
        allPrevious: positions.slice(),
        getLabelBoxes: (props) =>
          measureTextBBoxes(
            svgElement,
            hyphenations(station.name, network.hyphenation),
            mapConfig.label.lineHeight ?? mapConfig.label.fontSize,
            labelStyles({
              textAnchor: props?.textAnchor,
              fontWeight: station.terminus ? 700 : undefined,
              dominantBaseline: props?.dominantBaseline,
            }),
          ),
      }),
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
    <g id="safeAreas" v-if="showSafeAreas">
      <template v-for="pos in svgProps.positions" :key="pos.station.name">
        <rect
          v-for="(safeArea, i) in pos.safeAreas"
          :key="i"
          :x="safeArea.min.x"
          :y="safeArea.min.y"
          :width="safeArea.width"
          :height="safeArea.height"
          fill="red"
          fill-opacity="0.2"
        />
      </template>
    </g>
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
            dominantBaseline: pos.dominantBaseline,
            fontWeight: pos.station.terminus ? 700 : undefined,
          })
        "
      >
        <tspan
          v-for="(line, i) in pos.labelLines"
          :key="line"
          :x="pos.label.x"
          :dy="i === 0 ? 0 : (mapConfig.label.lineHeight ?? mapConfig.label.fontSize)"
        >
          {{ line }}
        </tspan>
      </text>
    </g>
  </svg>
</template>
