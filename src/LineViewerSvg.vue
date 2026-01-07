<script setup lang="ts">
import { useLineFont } from './useLineFont';
import type { Line } from './model';
import { computed, useTemplateRef } from 'vue';
import { computedAsync } from '@vueuse/core';
import { Box } from './Point';
import type { MapConfig } from './config';
import { type LayoutStrategy, type StationPosition } from './layout-strategy';

const { line, layoutStrategy } = defineProps<{
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

const fontFamily = useLineFont(line);

const fontsLoaded = computedAsync(() => document.fonts.ready.then(() => true), false);

const svg = useTemplateRef<SVGSVGElement>('svg');

function labelStyles(props?: { textAnchor?: 'start' | 'middle' | 'end' }) {
  return {
    fontFamily: fontFamily.value,
    fontSize: `${mapConfig.label.fontSize}px`,
    fontWeight: mapConfig.label.fontWeight,
    textAnchor: props?.textAnchor ?? 'middle',
    dominantBaseline: 'middle',
  } as const;
}

function bboxText(
  svg: SVGSVGElement,
  text: string,
  props?: { textAnchor?: 'start' | 'middle' | 'end' },
) {
  const svgns = 'http://www.w3.org/2000/svg';
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, labelStyles({ textAnchor: props?.textAnchor }));

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bbox = textElement.getBBox();

  svg.removeChild(textElement);

  return bbox;
}

const svgProps = computed(() => {
  if (!svg.value || !fontsLoaded.value) {
    return { positions: [] };
  }

  let positions: StationPosition[] = [];

  for (const station of line.stations) {
    const svgElement = svg.value;
    positions.push(
      layoutStrategy.nextPosition(positions.at(-1), station, mapConfig, (props) =>
        bboxText(svgElement, station.name, { textAnchor: props?.textAnchor }),
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
    <g id="lines">
      <polyline
        :points="polylinePoints"
        :stroke="line.color"
        :stroke-width="mapConfig.lineWidth"
        stroke-linecap="round"
        fill="none"
      />
    </g>
    <g id="station-markers">
      <circle
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="mapConfig.marker.radius + mapConfig.marker.strokeWidth"
        fill="black"
      />
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
        :name="pos.station.name"
        :style="labelStyles({ textAnchor: pos.textAnchor })"
      >
        {{ pos.station.name }}
      </text>
    </g>
  </svg>
</template>
