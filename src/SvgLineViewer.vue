<script setup lang="ts">
import { computed } from 'vue';
import ErrorBox from './ErrorBox.vue';
import { BoundedBox, Box, Point, PointOffset } from './geometry';
import {
  directionIndexChange,
  directionOffset,
  layoutLine,
  offsetStationPosition,
  type StationPosition,
} from './layout-strategy';
import LoadingSpinner from './LoadingSpinner.vue';
import type { Line, Network } from './model';
import { completeLayoutConfig } from './model/config';
import { allDirections, type Direction, type Side } from './model/direction';
import type { DirectionSegment } from './model/line';
import { getFontName } from './util/font';
import { hyphenations } from './util/hyphenation';
import { asyncMap } from './util/promise';
import { modularRangeInclusive } from './util/range';
import { useSvgMeasurement } from './util/svg';
import { useResource } from './util/useResource';

const props = defineProps<{
  network: Network;
  line: Line;
  showSafeAreas?: boolean;
  direction: Direction;
  initialSide: Side;
  forceSide?: boolean;
  forceDirection?: boolean;
  compact?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}>();

const layoutConfig = computed(() => completeLayoutConfig(props.network.layoutConfig ?? {}));

interface PreviousSegment {
  direction: Direction;
  point: Point;
  safeAreas: Box[];
}

interface CurveOffsetParams {
  fromSafeAreas: Box[];
  curveStart: Point;
  fromDirection: PointOffset;
  center: Point;
  toSafeAreas: Box[];
  curveEnd: Point;
  toDirection: PointOffset;
  continuePoint: Point;
  curveBounds: Box;
  totalOffset: number;
}

function curveOffsetBefore(params: CurveOffsetParams): CurveOffsetParams {
  const safetyOffsetBefore = Box.separationFactor(
    params.fromSafeAreas,
    params.toSafeAreas.concat(params.curveBounds),
    params.fromDirection,
  );
  return {
    fromSafeAreas: params.fromSafeAreas,
    curveStart: params.curveStart.offset(params.fromDirection.scale(safetyOffsetBefore)),
    fromDirection: params.fromDirection,
    center: params.center.offset(params.fromDirection.scale(safetyOffsetBefore)),
    toSafeAreas: params.toSafeAreas.map((box) =>
      box.offset(params.fromDirection.scale(safetyOffsetBefore)),
    ),
    curveEnd: params.curveEnd.offset(params.fromDirection.scale(safetyOffsetBefore)),
    toDirection: params.toDirection,
    continuePoint: params.continuePoint.offset(params.fromDirection.scale(safetyOffsetBefore)),
    curveBounds: params.curveBounds.offset(params.fromDirection.scale(safetyOffsetBefore)),
    totalOffset: params.totalOffset + safetyOffsetBefore,
  };
}

function curveOffsetAfter(params: CurveOffsetParams): CurveOffsetParams {
  const safetyOffsetAfter = Box.separationFactor(
    params.fromSafeAreas.concat([params.curveBounds]),
    params.toSafeAreas,
    params.toDirection,
  );

  return {
    fromSafeAreas: params.fromSafeAreas,
    curveStart: params.curveStart,
    fromDirection: params.fromDirection,
    center: params.center,
    toSafeAreas: params.toSafeAreas.map((box) =>
      box.offset(params.toDirection.scale(safetyOffsetAfter)),
    ),
    curveEnd: params.curveEnd,
    toDirection: params.toDirection,
    continuePoint: params.continuePoint.offset(params.toDirection.scale(safetyOffsetAfter)),
    curveBounds: params.curveBounds,
    totalOffset: params.totalOffset + safetyOffsetAfter,
  };
}

function makeCurve(from: PreviousSegment, to: LineSegmentDetails) {
  const fromIndex = allDirections.indexOf(from.direction);
  const toIndex = allDirections.indexOf(to.direction);
  const relativeDirectionIndex = directionIndexChange(from.direction, to.direction);

  const directionOffsetPrev = directionOffset(from.direction).unit();
  const directionOffsetNext = directionOffset(to.direction).unit();

  if (relativeDirectionIndex === 0) {
    const factor = Box.separationFactor(
      from.safeAreas,
      to.positions
        .flatMap((p) => p.safeAreas)
        .map((box) => box.offset(to.entrance.offsetTo(from.point))),
      directionOffsetPrev,
    );
    const continuePoint = from.point.offset(directionOffsetPrev.scale(factor));
    return {
      center: from.point,
      radius: 0,
      offset: to.entrance.offsetTo(continuePoint),
      bounds: from.point.withSize({ width: 0, height: 0 }),
      path: '',
    };
  }

  if (relativeDirectionIndex === 4) {
    throw new Error('U-turns are not supported: ' + from.direction + ' to ' + to.direction);
  }

  const clockwise = relativeDirectionIndex > 0;

  let radius: number;
  if ('radius' in layoutConfig.value.curve) {
    radius = layoutConfig.value.curve.radius;
  } else {
    radius = Math.abs(
      layoutConfig.value.curve.curvature *
        Math.tan(Math.PI / 2 - relativeDirectionIndex * (Math.PI / 8)),
    );
  }
  const center = from.point.offset(directionOffsetPrev.perpendicular(clockwise).scale(radius));
  const curveEnd = center.offset(directionOffsetNext.perpendicular(!clockwise).scale(radius));

  const fromRadiusDirection = (clockwise ? fromIndex + 6 : fromIndex + 2) % 8;
  const toRadiusDirection = (clockwise ? toIndex + 6 : toIndex + 2) % 8;

  const directions = Array.from(
    modularRangeInclusive(fromRadiusDirection, toRadiusDirection, 8, clockwise ? 1 : -1),
  ).map((i) => center.offset(directionOffset(allDirections[i]!).unit().scale(radius)));

  const bounds = Box.bounds(...directions);

  const curveParams: CurveOffsetParams = {
    fromSafeAreas: from.safeAreas.filter((bounds) => bounds.label !== 'marker'),
    curveStart: from.point,
    fromDirection: directionOffsetPrev,
    center,
    toSafeAreas: to.positions
      .flatMap((p) => p.safeAreas)
      .filter((bounds) => bounds.label !== 'marker')
      .map((box) => box.offset(to.entrance.offsetTo(curveEnd))),
    curveEnd,
    toDirection: directionOffsetNext,
    continuePoint: curveEnd,
    curveBounds: bounds,
    totalOffset: 0,
  };
  const offsetOptions = [
    curveOffsetAfter(curveOffsetBefore(curveParams)),
    curveOffsetBefore(curveOffsetAfter(curveParams)),
  ] as const;
  const chosenOffsetOption =
    offsetOptions[0].totalOffset <= offsetOptions[1].totalOffset
      ? offsetOptions[0]
      : offsetOptions[1];

  const sweepFlag = clockwise ? 1 : 0;

  return {
    center: chosenOffsetOption.center,
    radius,
    offset: to.entrance.offsetTo(chosenOffsetOption.continuePoint),
    bounds: chosenOffsetOption.curveBounds,
    path:
      `L ${chosenOffsetOption.curveStart.x} ${chosenOffsetOption.curveStart.y}` +
      `A ${radius} ${radius} 0 0 ${sweepFlag} ${chosenOffsetOption.curveEnd.x} ${chosenOffsetOption.curveEnd.y}`,
  };
}

const fontFamily = computed(() => props.network.font && getFontName(props.network.font));

function labelStyles(props?: {
  textAnchor?: 'start' | 'middle' | 'end';
  fontWeight?: number;
  dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
}) {
  return {
    fontFamily: fontFamily.value,
    fontSize: `${layoutConfig.value.label.fontSize}px`,
    fontWeight: props?.fontWeight ?? layoutConfig.value.label.fontWeight,
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

async function layoutLineSegment(
  segment: DirectionSegment,
  mapProps: MapProps,
): Promise<LineSegmentDetails> {
  const resolvedDirection =
    (mapProps.forceDirection ? undefined : segment.direction) ?? mapProps.direction;

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

  const positions = await layoutLine({
    stations: segment.stations,
    line: mapProps.line,
    initialSide: mapProps.initialSide,
    side: mapProps.forceSide ? mapProps.initialSide : undefined,
    direction: resolvedDirection,
    layoutConfig: mapProps.layoutConfig,
    debugDescription: mapProps.line.name,
    compact: mapProps.compact,
    bounds: new BoundedBox({ maxWidth: mapProps.maxWidth, maxHeight: mapProps.maxHeight }),
    getLabelBoxes: (station, props) =>
      svgMeasurement.textBBoxes(
        hyphenations(station.name, mapProps.network.hyphenation),
        mapProps.layoutConfig.label.lineHeight ?? mapProps.layoutConfig.label.fontSize,
        labelStyles({
          textAnchor: props?.textAnchor,
          fontWeight: station.terminus ? 700 : undefined,
          dominantBaseline: props?.dominantBaseline,
        }),
      ),
  });

  const bounds = Box.bounds(...positions.flatMap((pos) => [pos.marker, pos.label]));

  const entrance = joiningPoint(
    positions[0]!.marker.toPoint(),
    positions[0]!.marker,
    resolvedDirection,
    -1,
  );
  const exit = joiningPoint(
    positions[positions.length - 1]!.marker.toPoint(),
    positions[positions.length - 1]!.marker,
    resolvedDirection,
    1,
  );

  return { positions, bounds, entrance, exit, direction: resolvedDirection };
}

interface StationPositionWithCurve extends StationPosition {
  curveBefore?: string;
}

interface CarriedCurve {
  path: string;
  bounds: Box[];
}

interface MapProps {
  layoutConfig: ReturnType<typeof completeLayoutConfig>;
  fontFamily: string | undefined;
  network: Network;
  line: Line;
  direction: Direction;
  initialSide: Side;
  forceSide: boolean;
  forceDirection: boolean;
  compact: boolean;
  maxWidth: number | undefined;
  maxHeight: number | undefined;
}

const {
  state: map,
  error: mapError,
  isLoading: mapIsLoading,
} = useResource({
  request: (): MapProps | undefined =>
    svgMeasurement.ready.value && props.line.stations.length > 0
      ? {
          layoutConfig: layoutConfig.value,
          fontFamily: fontFamily.value,
          network: props.network,
          line: props.line,
          direction: props.direction,
          initialSide: props.initialSide,
          forceSide: props.forceSide,
          forceDirection: props.forceDirection,
          compact: props.compact,
          maxWidth: props.maxWidth,
          maxHeight: props.maxHeight,
        }
      : undefined,
  async loader({ request }) {
    try {
      interface ReduceStep {
        positions: readonly StationPositionWithCurve[];
        prevSegment: { direction: Direction; point: Point; safeAreas: Box[] };
        carriedCurve: CarriedCurve | undefined;
        bounds: Box;
      }

      const laidOutSegments = (
        await asyncMap(request.line.directionSegments, (segment) =>
          layoutLineSegment(segment, request),
        )
      ).reduce((acc, segment): ReduceStep => {
        if (!acc) {
          if (segment.positions.length === 0) {
            throw new Error('First segment has no stations');
          }
          return {
            positions: segment.positions,
            prevSegment: {
              direction: segment.direction,
              point: segment.exit,
              safeAreas: segment.positions.flatMap((pos) => pos.safeAreas),
            },
            carriedCurve: undefined,
            bounds: segment.bounds,
          };
        }
        const curve = makeCurve(acc.prevSegment, segment);
        const adjustedPositions = segment.positions.map<StationPositionWithCurve>((pos) =>
          offsetStationPosition(pos, curve.offset),
        );
        let carriedCurve: CarriedCurve | undefined;
        if (adjustedPositions.length > 0) {
          adjustedPositions[0]!.curveBefore = (acc.carriedCurve?.path ?? '') + curve.path;
          adjustedPositions[0]!.safeAreas = adjustedPositions[0]!.safeAreas.concat(
            acc.carriedCurve?.bounds ?? [],
            curve.bounds,
          );
        } else {
          // No stations in this segment; carry the curve forward to the next segment.
          carriedCurve = {
            path: (acc.carriedCurve?.path ?? '') + curve.path,
            bounds: [...(acc.carriedCurve?.bounds ?? []), curve.bounds],
          };
        }
        return {
          positions: [...acc.positions, ...adjustedPositions],
          prevSegment: {
            direction: segment.direction,
            point: segment.exit.offset(curve.offset),
            safeAreas: segment.positions
              .flatMap((pos) => pos.safeAreas)
              .map((box) => box.offset(curve.offset)),
          },
          carriedCurve,
          bounds: Box.bounds(acc.bounds, segment.bounds.offset(curve.offset), curve.bounds),
        };
      }, undefined)!;

      return {
        positions: laidOutSegments.positions,
        bounds: laidOutSegments.bounds,
      };
    } catch (error) {
      throw new Error(`Error laying out line ${request.line.name}`, { cause: error });
    }
  },
});

const viewBox = computed(() => {
  if (!map.value) {
    return undefined;
  }

  const padded = map.value.bounds.withPadding(layoutConfig.value.padding);
  return `${padded.min.x} ${padded.min.y} ${padded.width} ${padded.height}`;
});

const path = computed(() =>
  map.value?.positions
    .map((pos, i) => `${pos.curveBefore ?? ''}${i ? 'L' : 'M'}${pos.marker.x},${pos.marker.y}`)
    .join(''),
);
</script>
<template>
  <p v-if="line.stations.length === 0">No stations on this line.</p>
  <ErrorBox v-else-if="mapError" :error="mapError" />
  <ErrorBox v-else-if="mapIsLoading" color="#000">
    Rendering network...
    <template #icon><LoadingSpinner /></template>
  </ErrorBox>
  <svg :viewBox v-else-if="map">
    <g id="safeAreas" v-if="showSafeAreas">
      <template v-for="pos in map.positions" :key="pos.station.name">
        <rect
          v-for="(safeArea, i) in pos.safeAreas"
          :key="i"
          :x="safeArea.min.x"
          :y="safeArea.min.y"
          :width="safeArea.width"
          :height="safeArea.height"
          fill="red"
          stroke="red"
          stroke-width="1"
          fill-opacity="0.2"
        />
      </template>
    </g>
    <g id="lines-background">
      <path
        :d="path"
        stroke="white"
        :stroke-width="layoutConfig.lineWidth + layoutConfig.marker.strokeWidth * 2"
        stroke-linecap="butt"
        fill="none"
      />
    </g>
    <g id="station-markers-background">
      <circle
        v-for="pos in map.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="layoutConfig.marker.radius + layoutConfig.marker.strokeWidth * 2"
        fill="white"
      />
    </g>
    <g id="lines">
      <path
        :d="path"
        :stroke="line.color"
        :stroke-width="layoutConfig.lineWidth"
        stroke-linecap="round"
        fill="none"
      />
    </g>
    <g id="station-markers-line">
      <circle
        v-for="pos in map.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="layoutConfig.marker.radius + layoutConfig.marker.strokeWidth"
        fill="black"
      />
    </g>
    <g id="station-markers-fill">
      <circle
        v-for="pos in map.positions"
        :key="pos.station.name"
        :cx="pos.marker.x"
        :cy="pos.marker.y"
        :r="layoutConfig.marker.radius"
        fill="white"
      />
    </g>
    <g id="station-labels">
      <text
        v-for="pos in map.positions"
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
          :dy="i === 0 ? 0 : (layoutConfig.label.lineHeight ?? layoutConfig.label.fontSize)"
        >
          {{ line }}
        </tspan>
      </text>
    </g>
  </svg>
</template>
