import type { MapConfig } from './config';
import { BoundedBox, Box, Point, PointOffset, type RangedPoint } from './geometry';
import type { BoxInput } from './geometry/Point';

import type { Station } from './model';
import { range } from './util/range';
import type { TextBox } from './util/svg';

const totalStationWidth = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);
const totalStationHeight = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);

export type Side = 'left' | 'right';
export const allSides: readonly Side[] = ['left', 'right'];

export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const allDirections: readonly Direction[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

function directionOffset(direction: Direction, side?: 'left' | 'right'): PointOffset {
  const index = allDirections.indexOf(direction);
  if (index === -1) {
    throw new Error(`Invalid direction: ${direction}`);
  }
  if (side === 'left') {
    direction = allDirections[(index + 6) % 8]!;
  } else if (side === 'right') {
    direction = allDirections[(index + 2) % 8]!;
  }
  return new PointOffset({
    dx: direction.includes('e') ? 1 : direction.includes('w') ? -1 : 0,
    dy: direction.includes('n') ? -1 : direction.includes('s') ? 1 : 0,
  });
}

export interface StationPosition {
  station: Station;
  marker: RangedPoint;
  label: RangedPoint;

  trimLabelBefore: Partial<BoxInput>;
  trimLabelAfter: Partial<BoxInput>;

  labelLines: string[];
  side: Side;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
  safeAreas: readonly RangedPoint[];
  // The score is a mapping of previous side to a numeric score for this position. A lower score is better.
  score: { [key in Side]?: number } & { none?: number; default: number };
}

export interface StationPositionWithOffset extends StationPosition {
  offset: number;
}

function offsetStationPosition(position: StationPosition, offset: PointOffset): StationPosition {
  return {
    ...position,
    marker: position.marker.offset(offset),
    label: position.label.offset(offset),
    safeAreas: position.safeAreas.map((area) => area.offset(offset)),
  };
}

export interface GetPositionsProps {
  side?: Side;
  direction: Direction;
  station: Station;
  mapConfig: MapConfig;
  bounds?: BoundedBox;
  getLabelBoxes: (
    station: Station,
    props?: {
      textAnchor?: 'start' | 'middle' | 'end';
      dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
    },
  ) => TextBox[];
}

interface LayoutStrategyGetPositionsProps extends GetPositionsProps {
  side: Side;
}

export interface LayoutStrategy {
  direction: Direction[];
  getPositions(props: LayoutStrategyGetPositionsProps): StationPosition[];
}

const layoutStrategies: Record<string, LayoutStrategy> = {
  vertical: {
    direction: ['n', 's'],
    getPositions({ station, direction, side, mapConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);

      const textAnchor = labelDirection.dx < 0 ? 'end' : 'start';
      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(mapConfig),
        height: totalStationHeight(mapConfig),
      });

      const labelBoxes = getLabelBoxes(station, { textAnchor });
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x:
            labelDirection.dx < 0
              ? marker.min.x - mapConfig.gap.markerLabel.x
              : marker.max.x + mapConfig.gap.markerLabel.x,
          y: 0,
        })
          .withSizeFromBox(labelBox)
          .offset({
            dy:
              ((1 - labelBox.lines.length) / 2) *
              (mapConfig.label.lineHeight ?? mapConfig.label.fontSize),
          });

        return {
          station,
          labelLines: labelBox.lines,
          marker,
          label,
          trimLabelBefore: { [labelDirection.dy > 0 ? 'maxY' : 'minY']: marker.y },
          trimLabelAfter: { [labelDirection.dy > 0 ? 'minY' : 'maxY']: marker.y },
          side,
          textAnchor,
          // The score is calculated as the number of lines, plus a small penalty for not being on a consistent side.
          score: {
            [side]: labelBox.lines.length,
            none: labelBox.lines.length,
            default: labelBox.lines.length + 1,
          },
          safeAreas: [
            marker.withPadding({
              y: mapConfig.spacing.marker.y,
            }),
            label.withPadding({
              y: mapConfig.spacing.label.y,
            }),
          ],
        };
      });
    },
  },
  horizontal: {
    direction: ['e', 'w'],
    getPositions({ station, direction, side, mapConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);
      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(mapConfig),
        height: totalStationHeight(mapConfig),
      });

      const labelBoxes = getLabelBoxes(station);
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x: marker.x,
          y:
            labelDirection.dy < 0
              ? marker.min.y - mapConfig.gap.markerLabel.y
              : marker.max.y + mapConfig.gap.markerLabel.y,
        })
          .withSizeFromBox(labelBox)
          .offset({
            dy: labelDirection.dy < 0 ? -labelBox.height - labelBox.y : -labelBox.y,
          });

        return {
          station,
          labelLines: labelBox.lines,
          marker,
          label,
          trimLabelBefore: { [labelDirection.dx > 0 ? 'maxX' : 'minX']: marker.x },
          trimLabelAfter: { [labelDirection.dx > 0 ? 'minX' : 'maxX']: marker.x },
          side,
          // The score is calculated as the number of lines, plus a small penalty for not being on a consistent side.
          score: {
            [side]: labelBox.lines.length,
            none: labelBox.lines.length,
            default: labelBox.lines.length + 1,
          },
          safeAreas: [
            marker.withPadding({
              x: mapConfig.spacing.marker.x,
              y: mapConfig.gap.markerLabel.y * 2,
            }),
            label.withPadding({
              x: mapConfig.spacing.label.x,
              y: mapConfig.gap.markerLabel.y * 2,
            }),
          ],
        };
      });
    },
  },
  diagonal: {
    direction: ['ne', 'nw', 'se', 'sw'],
    getPositions({ station, direction, side, mapConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);

      const textAnchor = labelDirection.dx < 0 ? 'end' : 'start';
      const dominantBaseline = labelDirection.dy > 0 ? 'hanging' : 'alphabetic';

      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(mapConfig) / Math.SQRT2,
        height: totalStationHeight(mapConfig) / Math.SQRT2,
      });

      const labelBoxes = getLabelBoxes(station, { textAnchor, dominantBaseline });
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x:
            labelDirection.dx > 0
              ? (totalStationWidth(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2) / Math.SQRT2
              : -(totalStationWidth(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2) / Math.SQRT2,
          y:
            labelDirection.dy > 0
              ? (totalStationHeight(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2) / Math.SQRT2
              : -(totalStationHeight(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2) / Math.SQRT2,
        })
          .withSizeFromBox(labelBox)
          .offset({
            dy:
              labelDirection.dy > 0
                ? 0
                : -(mapConfig.label.lineHeight ?? mapConfig.label.fontSize) *
                  (labelBox.lines.length - 1),
          });

        return {
          station,
          labelLines: labelBox.lines,
          marker,
          label,

          trimLabelBefore: {}, // Not limiting diagonal labels for now
          trimLabelAfter: {}, // Not limiting diagonal labels for now

          side,
          // The score is calculated as the number of lines, plus a small penalty for not being on a consistent side.
          score: {
            [side]: labelBox.lines.length,
            none: labelBox.lines.length,
            default: labelBox.lines.length + 1,
          },
          textAnchor,
          dominantBaseline,
          safeAreas: [
            marker.withPadding(mapConfig.spacing.marker.scale(Math.SQRT1_2)),
            label.withPadding({
              x: mapConfig.spacing.label.x,
              y: mapConfig.gap.markerLabel.y * 2,
            }),
          ],
        };
      });
    },
  },
};

function getPositions(props: GetPositionsProps) {
  return Object.entries(layoutStrategies)
    .filter(([, strategy]) => strategy.direction.includes(props.direction))
    .flatMap(([, strategy]) =>
      (props.side ? [props.side] : (['left', 'right'] as const)).flatMap((side) =>
        strategy.getPositions({
          ...props,
          side,
        }),
      ),
    );
}

interface LayoutLineProps extends Omit<GetPositionsProps, 'station'> {
  stations: Station[];
  compact?: boolean;
  initialSide: Side;
  debugDescription: string;
  conflicts?: { [end in 'start' | 'end']?: readonly Side[] };
}

export function layoutLine(props: LayoutLineProps): readonly StationPosition[] {
  const lineDirection = directionOffset(props.direction);

  const stationPositionOptions = props.stations.map((station) =>
    getPositions({
      ...props,
      station,
    }),
  );

  const maxLineCount = Math.max(
    ...stationPositionOptions.map((options) =>
      Math.max(...options.map((option) => option.labelLines.length)),
    ),
  );

  const minLineCount = Math.min(
    ...stationPositionOptions.map((options) =>
      Math.min(...options.map((option) => option.labelLines.length)),
    ),
  );

  let positions: ReduceStep | null = null;
  for (const lineLimit of range(minLineCount, maxLineCount + 1)) {
    positions = stationPositionOptions.reduce<ReduceStep | null>(
      (acc, positionOptions, i, arr) =>
        acc &&
        reduceStep(
          props,
          lineDirection,
          lineLimit,
          acc,
          positionOptions,
          i === 0,
          i === arr.length - 1,
        ),
      {
        totalOffset: 0,
        box: props.bounds ?? new BoundedBox({}),
        previousSide: props.initialSide,
        positions: [],
      },
    );
    if (positions !== null) {
      break;
    }
  }

  if (!positions) {
    throw new Error('Could not layout line within bounds');
  }

  if (positions.positions.length <= 1) {
    return positions.positions;
  }

  const chosenOffset = getOffset(props, positions, lineDirection);

  let cumulativeOffset = 0;
  return positions.positions.map((position, i) => {
    if (i > 0) {
      cumulativeOffset += Math.max(position.offset, chosenOffset);
    }
    return offsetStationPosition(position, lineDirection.scale(cumulativeOffset));
  });
}

interface ReduceStep {
  box: BoundedBox;
  totalOffset: number;
  previousSide: Side | null;
  positions: readonly StationPositionWithOffset[];
}

function reduceStep(
  props: LayoutLineProps,
  lineDirection: PointOffset,
  maxLabelLines: number,
  acc: ReduceStep,
  positionOptions: StationPosition[],
  first: boolean,
  last: boolean,
): ReduceStep | null {
  const previousPosition = acc.positions.at(-1);

  const optionsWithScores = positionOptions
    .filter((position) => position.labelLines.length <= maxLabelLines)
    .map((position) => {
      const bounds = Box.bounds(
        position.marker,
        // If the label is at the start or end of the line, and there are no conflicts on that side,
        // we can ignore the part of the label that extends beyond the marker.
        position.label
          .with(
            first && !props.conflicts?.start?.includes(position.side)
              ? position.trimLabelBefore
              : {},
          )
          .with(
            last && !props.conflicts?.end?.includes(position.side) ? position.trimLabelAfter : {},
          ),
      );
      // Explicitly only check the bounds before performing the offset,
      // so that wrapping is only triggered based on the max dimensions perpendicular to the line direction.
      // This prevents inconsistent wrapping towards the end of the line.
      if (!acc.box.canFit(bounds)) {
        return null;
      }
      const offset = previousPosition
        ? Box.separationFactor(
            previousPosition.safeAreas,
            [position.marker, position.label],
            lineDirection,
          )
        : 0;
      const box = acc.box.add(bounds.offset(lineDirection.scale(acc.totalOffset + offset)));
      return {
        position,
        offset,
        box: box,
        score: position.score[acc.previousSide ?? 'default'] ?? position.score.default,
      };
    })
    .filter((option) => !!option);

  if (optionsWithScores.length === 0) {
    return null;
  }

  const bestScore = Math.min(...optionsWithScores.map((o) => o.score));
  const bestOptions = optionsWithScores.filter((o) => o.score === bestScore);

  if (bestOptions.length === 0) {
    throw new Error('Logic error: no best options found');
  }
  const option = bestOptions[0]!;
  if (bestOptions.length > 1) {
    console.warn(
      `Multiple best options found for station ${bestOptions[0]!.position.station.name} with score ${bestScore} on line ${props.debugDescription}. Choosing the first one.`,
      bestOptions,
    );
  }
  return {
    totalOffset: acc.totalOffset + option.offset,
    box: option.box,
    previousSide: option.position.side,
    positions: acc.positions.concat([{ ...option.position, offset: option.offset }]),
  };
}

function getOffset(
  props: LayoutLineProps,
  positions: ReduceStep,
  lineDirection: PointOffset,
): number {
  const maxGrowth = Math.min(
    props.bounds?.maxWidth && lineDirection.dx
      ? props.bounds.maxWidth - positions.box.minBox.width
      : Infinity,
    props.bounds?.maxHeight && lineDirection.dy
      ? props.bounds.maxHeight - positions.box.minBox.height
      : Infinity,
  );

  // sort the offsets in increasing order
  const offsets = positions.positions
    .map((p) => p.offset)
    .slice(1)
    .sort((a, b) => a - b);
  const maxOffset = offsets.at(-1)!;

  if (!Number.isFinite(maxGrowth)) {
    return props.compact ? 0 : maxOffset;
  } else if (positions.totalOffset + maxGrowth > maxOffset * offsets.length) {
    // Expand out to fill the available space
    return maxGrowth / offsets.length + maxOffset;
  }

  // Start with the minimum offset and increase until we run out of space
  let chosenOffset = offsets[0]!;
  let widthUsed = positions.totalOffset;
  for (let i = 1; i < offsets.length; i++) {
    const offset = offsets[i]!;
    const increase = offset - chosenOffset;
    if (widthUsed + increase * i > positions.totalOffset + maxGrowth) {
      chosenOffset += (positions.totalOffset + maxGrowth - widthUsed) / i;
      break;
    }
    widthUsed += increase * i;
    chosenOffset = offset;
  }
  return chosenOffset;
}
