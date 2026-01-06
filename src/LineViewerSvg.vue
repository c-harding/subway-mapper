<script setup lang="tsx">
import { useLineFont } from './useLineFont';
import type { Line, Station } from './model';
import { computed, useTemplateRef } from 'vue';
import { computedAsync } from '@vueuse/core';

const { line } = defineProps<{
  line: Line;
}>();

const fontFamily = useLineFont(line);

const fontsLoaded = computedAsync(() => document.fonts.ready.then(() => true), false);

const svg = useTemplateRef<SVGSVGElement>('svg');

const minStationSpace = 10;
const minStationLabelSpace = 10;
const lineWidth = 4;
const stationCircleRadius = 3;
const stationCircleStroke = 1;
const stationLabelOffset = 10;
const stationLabelFontSize = 6;
const padding = 10;

const totalStationWidth = Math.max(lineWidth, stationCircleRadius * 2 + stationCircleStroke * 2);
const totalStationHeight = Math.max(lineWidth, stationCircleRadius * 2 + stationCircleStroke * 2);

function StationCircle(props: { cx: number; cy: number; color: string }) {
  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={stationCircleRadius}
      fill="white"
      stroke="black"
      stroke-width={stationCircleStroke}
    />
  );
}

function StationLabel(props: { x: number; y: number; name: string; align: 'left' | 'right' }) {
  return (
    <text
      x={props.x}
      y={props.y}
      font-family={fontFamily.value}
      font-size={stationLabelFontSize}
      text-anchor={props.align === 'left' ? 'end' : 'start'}
      dominant-baseline="central"
    >
      {props.name}
    </text>
  );
}

function bboxText(svg: SVGSVGElement, text: string) {
  const svgns = 'http://www.w3.org/2000/svg';
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  textElement.setAttribute('text-anchor', 'start');
  textElement.setAttribute('dominant-baseline', 'central');
  if (fontFamily.value) textElement.setAttribute('font-family', fontFamily.value);
  textElement.setAttribute('width', '10px');

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bbox = textElement.getBBox();

  svg.removeChild(textElement);

  return bbox;
}

type XY = { x: number; y: number };
type RangedXY = XY & { minX: number; maxX: number; minY: number; maxY: number };

const svgProps = computed(() => {
  if (!svg.value || !fontsLoaded.value) {
    return { positions: [] };
  }

  let positions: {
    station: Station;
    marker: RangedXY;
    label: RangedXY;
  }[] = [];

  for (const station of line.stations) {
    const bbox = bboxText(svg.value, station.name);
    const end: XY = { x: bbox.x + bbox.width, y: bbox.y + bbox.height };

    let nextStationY: number;
    const lastStation = positions.at(-1);
    if (!lastStation) {
      nextStationY = 0;
    } else {
      nextStationY = Math.max(
        lastStation.marker.y + minStationSpace,
        lastStation.label.maxY + minStationLabelSpace + bbox.y,
      );
    }

    const marker: RangedXY = {
      x: 0,
      y: nextStationY,
      minX: -totalStationWidth / 2,
      maxX: totalStationWidth / 2,
      minY: nextStationY - totalStationHeight / 2,
      maxY: nextStationY + totalStationHeight / 2,
    };

    const labelPositionX = marker.x + stationLabelOffset;

    positions.push({
      station,
      marker,
      label: {
        x: labelPositionX,
        y: nextStationY,
        minX: labelPositionX + bbox.x,
        maxX: labelPositionX + end.x,
        minY: nextStationY + bbox.y,
        maxY: nextStationY + end.y,
      },
    });
  }

  const bounds = positions.reduce(
    (acc, pos) => {
      acc.min.x = Math.min(acc.min.x, pos.marker.minX, pos.label.minX);
      acc.max.x = Math.max(acc.max.x, pos.marker.maxX, pos.label.maxX);
      acc.min.y = Math.min(acc.min.y, pos.marker.minY, pos.label.minY);
      acc.max.y = Math.max(acc.max.y, pos.marker.maxY, pos.label.maxY);
      return acc;
    },
    {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity },
    },
  );

  return { positions, bounds };
});

const viewBox = computed(() => {
  const bounds = svgProps.value.bounds;
  if (!bounds) {
    return undefined;
  }

  return [
    bounds.min.x - padding,
    bounds.min.y - padding,
    bounds.max.x - bounds.min.x + padding * 2,
    bounds.max.y - bounds.min.y + padding * 2,
  ].join(' ');
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
        :stroke-width="lineWidth"
        stroke-linecap="round"
        fill="none"
      />
    </g>
    <g id="station-markers">
      <StationCircle
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :color="line.color"
      />
    </g>
    <g id="station-labels">
      <StationLabel
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :x="pos.label.x"
        :y="pos.label.y"
        :name="pos.station.name"
      />
    </g>
  </svg>
</template>

<style module>
.lineViewer {
  ul > li::marker {
    color: v-bind('line.color');
  }
}
</style>
