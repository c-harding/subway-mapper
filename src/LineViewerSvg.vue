<script setup lang="tsx">
import { useLineFont } from './useLineFont';
import type { Line, Station } from './model';
import { computed, useTemplateRef } from 'vue';
import { computedAsync } from '@vueuse/core';
import { Box, Point, type RangedPoint } from './Point';

const { line } = defineProps<{
  line: Line;
}>();

const fontFamily = useLineFont(line);

const fontsLoaded = computedAsync(() => document.fonts.ready.then(() => true), false);

const svg = useTemplateRef<SVGSVGElement>('svg');

const minStationSpace = 32;
const minStationLabelSpace = 15;
const lineWidth = 10;
const stationCircleRadius = 6;
const stationCircleStroke = 3;
const stationLabelOffset = 11;
const stationLabelFontSize = 30;
const stationLabelFontWeight = 600;
const padding = 50;

const totalStationWidth = Math.max(lineWidth, stationCircleRadius * 2 + stationCircleStroke * 2);
const totalStationHeight = Math.max(lineWidth, stationCircleRadius * 2 + stationCircleStroke * 2);

function StationCircleFill(props: { cx: number; cy: number; color: string }) {
  const r = stationCircleRadius;
  return <circle cx={props.cx} cy={props.cy} r={r} fill="white" />;
}

function StationCircleLine(props: { cx: number; cy: number; color: string }) {
  const r = stationCircleRadius + stationCircleStroke;
  return <circle cx={props.cx} cy={props.cy} r={r} fill="black" />;
}

function labelStyles(
  props: {
    textAnchor?: 'start' | 'middle' | 'end';
    dominantBaseline?: 'middle' | 'text-top';
  } = {},
) {
  return {
    fontFamily: fontFamily.value,
    fontSize: `${stationLabelFontSize}px`,
    fontWeight: stationLabelFontWeight,
    textAnchor: props.textAnchor ?? 'start',
    dominantBaseline: props.dominantBaseline ?? 'middle',
  };
}

function StationLabel(props: {
  x: number;
  y: number;
  name: string;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'middle' | 'text-top';
}) {
  return (
    <text x={props.x} y={props.y} style={labelStyles(props)}>
      {props.name}
    </text>
  );
}

function bboxText(svg: SVGSVGElement, text: string) {
  const svgns = 'http://www.w3.org/2000/svg';
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, labelStyles());

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

  let positions: {
    station: Station;
    marker: RangedPoint;
    label: RangedPoint;
  }[] = [];

  for (const station of line.stations) {
    const bbox = bboxText(svg.value, station.name);

    let nextStationY: number;
    const lastStation = positions.at(-1);
    if (!lastStation) {
      nextStationY = 0;
    } else {
      nextStationY = Math.max(
        lastStation.marker.max.y + minStationSpace + totalStationHeight / 2,
        lastStation.label.max.y + minStationLabelSpace - bbox.y,
      );
    }

    const marker = new Point({ x: 0, y: nextStationY }).withSize({
      width: totalStationWidth,
      height: totalStationHeight,
    });

    const label = new Point({ x: marker.x + stationLabelOffset, y: nextStationY }).withSizeFromBox(
      bbox,
    );

    positions.push({
      station,
      marker,
      label,
    });
  }

  const bounds = Box.bounds(positions.flatMap((pos) => [pos.marker, pos.label]));

  return { positions, bounds };
});

const viewBox = computed(() => {
  const bounds = svgProps.value.bounds;
  if (!bounds) {
    return undefined;
  }

  const padded = bounds.withPadding(padding);

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
        :stroke-width="lineWidth"
        stroke-linecap="round"
        fill="none"
      />
    </g>
    <g id="station-markers">
      <StationCircleLine
        v-for="pos in svgProps.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :color="line.color"
      />
      <StationCircleFill
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
