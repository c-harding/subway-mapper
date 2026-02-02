<script setup lang="ts">
import { computed } from 'vue';
import type { MapConfig } from './config';
import { BoundedBox, Box, Padding, Point, Spacing } from './geometry';
import {
  directionOffset,
  layoutLine,
  offsetStationPosition,
  type StationPosition,
} from './layout-strategy';
import type { Line, Network } from './model';
import { allDirections, type Direction, type Side } from './model/direction';
import type { DirectionSegment } from './model/line';
import { getFontName } from './util/font';
import { hyphenations } from './util/hyphenation';
import { useSvgMeasurement } from './util/svg';

const { network, line, direction, initialSide, forceSide, compact, maxWidth, maxHeight } =
  defineProps<{
    network: Network;
    line: Line;
    showSafeAreas?: boolean;
    direction: Direction;
    initialSide: Side;
    forceSide?: boolean;
    compact?: boolean;
    maxWidth?: number;
    maxHeight?: number;
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
  curve: { radius: 50 },
  marker: {
    radius: 6,
    strokeWidth: 3,
  },
  label: {
    fontSize: 30,
    fontWeight: 600,
  },
};

function makeCurve(prevDirection: Direction, prevPoint: Point, to: LineSegmentDetails) {
  const nextDirection = to.direction;

  const relativeDirectionIndex =
    (allDirections.indexOf(nextDirection) - allDirections.indexOf(prevDirection) + 8) % 8;

  if (relativeDirectionIndex === 0) {
    return {
      center: prevPoint,
      radius: 0,
      offset: to.entrance.offsetTo(prevPoint),
      bounds: prevPoint.withSize({ width: 0, height: 0 }),
      path: '',
    };
  }

  const clockwise = relativeDirectionIndex < 4;

  const directionOffsetPrev = directionOffset(prevDirection);
  const directionOffsetNext = directionOffset(nextDirection);
  if (relativeDirectionIndex === 4) {
    throw new Error('U-turns are not supported: ' + prevDirection + ' to ' + nextDirection);
  }

  let radius: number;
  if ('radius' in mapConfig.curve) {
    radius = mapConfig.curve.radius;
  } else {
    radius = Math.abs(
      mapConfig.curve.curvature * Math.tan(Math.PI / 2 - relativeDirectionIndex * (Math.PI / 8)),
    );
  }
  const center = prevPoint.offset(
    directionOffsetPrev.perpendicular(clockwise).unit().scale(radius),
  );
  const curveExit = center.offset(
    directionOffsetNext.perpendicular(!clockwise).unit().scale(radius),
  );

  const sweepFlag = clockwise ? 1 : 0;

  return {
    center,
    radius,
    offset: to.entrance.offsetTo(curveExit),
    bounds: center.withSize({
      width: radius * 2,
      height: radius * 2,
    }),
    path: `L ${prevPoint.x} ${prevPoint.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${curveExit.x} ${curveExit.y}`,
  };
}

const fontFamily = computed(() => network.font && getFontName(network.font));

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

const svgMeasurement = useSvgMeasurement();

function joiningPoint(terminus: Point, bounds: Box, direction: Direction, factorSign = -1): Point {
  const newBox = terminus.withSize({ width: 0, height: 0 });
  const offset = directionOffset(direction).scale(factorSign);
  const factor = Box.separationFactor([bounds], [newBox], offset);
  return terminus.offset(offset.scale(factor));
}

interface LineSegmentDetails {
  positions: readonly StationPosition[];
  bounds: Box;
  entrance: Point;
  exit: Point;
  direction: Direction;
}

function layoutLineSegment(segment: DirectionSegment): LineSegmentDetails {
  const resolvedDirection = segment.direction ?? direction;

  if (segment.stations.length === 0) {
    const point = new Point(0, 0);
    return {
      positions: [],
      bounds: Box.bounds(point),
      entrance: point,
      exit: point,
      direction: resolvedDirection,
    };
  }

  const positions = layoutLine({
    stations: segment.stations,
    initialSide,
    side: forceSide ? initialSide : undefined,
    direction: resolvedDirection,
    mapConfig,
    debugDescription: line.name,
    compact,
    bounds: new BoundedBox({ maxWidth, maxHeight }),
    getLabelBoxes: (station, props) =>
      svgMeasurement.textBBoxes(
        hyphenations(station.name, network.hyphenation),
        mapConfig.label.lineHeight ?? mapConfig.label.fontSize,
        labelStyles({
          textAnchor: props?.textAnchor,
          fontWeight: station.terminus ? 700 : undefined,
          dominantBaseline: props?.dominantBaseline,
        }),
      ),
  });

  const bounds = Box.bounds(...positions.flatMap((pos) => [pos.marker, pos.label]));
  const safeAreaBounds = Box.bounds(...positions.flatMap((pos) => pos.safeAreas));

  const entrance = joiningPoint(positions[0]!.marker, safeAreaBounds, resolvedDirection, -1);
  const exit = joiningPoint(
    positions[positions.length - 1]!.marker,
    safeAreaBounds,
    resolvedDirection,
    1,
  );

  return { positions, bounds, entrance, exit, direction: resolvedDirection };
}

interface StationPositionWithCurve extends StationPosition {
  curveBefore?: string;
}

const svgProps = computed(
  ():
    | { status: 'loading' }
    | { status: 'success'; positions: readonly StationPositionWithCurve[]; bounds: Box }
    | { status: 'empty' }
    | { status: 'error'; error: unknown } => {
    if (!svgMeasurement.ready.value) {
      return { status: 'loading' };
    }

    if (line.stations.length === 0) {
      return { status: 'empty' };
    }

    try {
      const laidOutSegments = line.directionSegments
        .map((segment) => layoutLineSegment(segment))
        .reduce<
          | {
              positions: readonly StationPositionWithCurve[];
              prevDirection: Direction;
              prevPoint: Point;
              carriedCurve: string | undefined;
              bounds: Box;
            }
          | undefined
        >((acc, segment) => {
          if (!acc) {
            if (segment.positions.length === 0) {
              throw new Error('First segment has no stations');
            }
            return {
              positions: segment.positions,
              prevDirection: segment.direction,
              prevPoint: segment.exit,
              carriedCurve: undefined,
              bounds: segment.bounds,
            };
          }
          const curve = makeCurve(acc.prevDirection, acc.prevPoint, segment);
          const adjustedPositions = segment.positions.map<StationPositionWithCurve>((pos) =>
            offsetStationPosition(pos, curve.offset),
          );
          let carriedCurve: string | undefined;
          if (adjustedPositions.length > 0) {
            adjustedPositions[0]!.curveBefore = (acc.carriedCurve ?? '') + curve.path;
          } else {
            // No stations in this segment; carry the curve forward to the next segment.
            carriedCurve = (acc.carriedCurve ?? '') + curve.path;
          }
          return {
            positions: [...acc.positions, ...adjustedPositions],
            prevDirection: segment.direction,
            prevPoint: segment.exit.offset(curve.offset),
            carriedCurve,
            bounds: Box.bounds(acc.bounds, segment.bounds.offset(curve.offset), curve.bounds),
          };
        }, undefined)!;

      return {
        status: 'success',
        positions: laidOutSegments.positions,
        bounds: laidOutSegments.bounds,
      };
    } catch (error) {
      console.error(`Error laying out line ${line.name}:`, error);
      return { status: 'error', error };
    }
  },
);

const viewBox = computed(() => {
  if (svgProps.value.status !== 'success') {
    return undefined;
  }

  const padded = svgProps.value.bounds.withPadding(mapConfig.padding);

  return `${padded.min.x} ${padded.min.y} ${padded.width} ${padded.height}`;
});

const path = computed(() =>
  svgProps.value.status === 'success'
    ? svgProps.value.positions
        .map((pos, i) => `${pos.curveBefore ?? ''}${i ? 'L' : 'M'}${pos.marker.x},${pos.marker.y}`)
        .join('')
    : undefined,
);
</script>
<template>
  <svg :viewBox>
    <template v-if="svgProps.status === 'success'">
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
        <path
          :d="path"
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
        <path
          :d="path"
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
    </template>
  </svg>
  <pre v-if="svgProps.status === 'error'">Error: {{ svgProps.error }}</pre>
  <p v-if="svgProps.status === 'loading'">Loading...</p>
  <p v-if="svgProps.status === 'empty'">No stations on this line.</p>
</template>
