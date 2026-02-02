import { BoundedBox, Box, Point, PointOffset, type RangedPoint } from './geometry';
import type { BoxInput } from './geometry/Point';

import type { Station } from './model';
import type { LayoutConfig } from './model/config';
import { allDirections, type Direction, type Side } from './model/direction';
import { range } from './util/range';
import type { TextBox } from './util/svg';

const totalStationWidth = (layoutConfig: LayoutConfig) =>
  Math.max(
    layoutConfig.lineWidth,
    layoutConfig.marker.radius * 2 + layoutConfig.marker.strokeWidth * 2,
  );
const totalStationHeight = (layoutConfig: LayoutConfig) =>
  Math.max(
    layoutConfig.lineWidth,
    layoutConfig.marker.radius * 2 + layoutConfig.marker.strokeWidth * 2,
  );

export function directionOffset(direction: Direction, side?: 'left' | 'right'): PointOffset {
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
  safeAreas: readonly Box[];
  // The score is a mapping of previous side to a numeric score for this position. A lower score is better.
  score: { [key in Side]?: number } & { none?: number; default: number };
}

export interface StationPositionWithOffset extends StationPosition {
  offset: number;
}

export function offsetStationPosition(
  position: StationPosition,
  offset: PointOffset,
): StationPosition {
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
  layoutConfig: LayoutConfig;
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
    getPositions({ station, direction, side, layoutConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);

      const textAnchor = labelDirection.dx < 0 ? 'end' : 'start';
      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(layoutConfig),
        height: totalStationHeight(layoutConfig),
      });

      const labelBoxes = getLabelBoxes(station, { textAnchor });
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x:
            labelDirection.dx < 0
              ? marker.min.x - layoutConfig.gap.markerLabel.x
              : marker.max.x + layoutConfig.gap.markerLabel.x,
          y: 0,
        })
          .withSizeFromBox(labelBox)
          .offset({
            dy:
              ((1 - labelBox.lines.length) / 2) *
              (layoutConfig.label.lineHeight ?? layoutConfig.label.fontSize),
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
            marker.withPadding({ y: layoutConfig.spacing.marker.y }).with({ label: 'marker' }),
            label.withPadding({ y: layoutConfig.spacing.label.y }).with({ label: 'label' }),
          ],
        };
      });
    },
  },
  horizontal: {
    direction: ['e', 'w'],
    getPositions({ station, direction, side, layoutConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);
      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(layoutConfig),
        height: totalStationHeight(layoutConfig),
      });

      const labelBoxes = getLabelBoxes(station);
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x: marker.x,
          y:
            labelDirection.dy < 0
              ? marker.min.y - layoutConfig.gap.markerLabel.y
              : marker.max.y + layoutConfig.gap.markerLabel.y,
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
            marker
              .withPadding({
                x: layoutConfig.spacing.marker.x,
                y: layoutConfig.gap.markerLabel.y * 2,
              })
              .with({ label: 'marker' }),
            label
              .withPadding({
                x: layoutConfig.spacing.label.x,
                y: layoutConfig.gap.markerLabel.y * 2,
              })
              .with({ label: 'label' }),
          ],
        };
      });
    },
  },
  diagonal: {
    direction: ['ne', 'nw', 'se', 'sw'],
    getPositions({ station, direction, side, layoutConfig, getLabelBoxes }) {
      const labelDirection = directionOffset(direction, side);

      const textAnchor = labelDirection.dx < 0 ? 'end' : 'start';
      const dominantBaseline = labelDirection.dy > 0 ? 'hanging' : 'alphabetic';

      const marker = Point.ORIGIN.withSize({
        width: totalStationWidth(layoutConfig) / Math.SQRT2,
        height: totalStationHeight(layoutConfig) / Math.SQRT2,
      });

      const labelBoxes = getLabelBoxes(station, { textAnchor, dominantBaseline });
      return labelBoxes.map((labelBox): StationPosition => {
        const label = new Point({
          x:
            labelDirection.dx > 0
              ? (totalStationWidth(layoutConfig) / 2 + layoutConfig.gap.markerLabel.y / 2) /
                Math.SQRT2
              : -(totalStationWidth(layoutConfig) / 2 + layoutConfig.gap.markerLabel.y / 2) /
                Math.SQRT2,
          y:
            labelDirection.dy > 0
              ? (totalStationHeight(layoutConfig) / 2 + layoutConfig.gap.markerLabel.y / 2) /
                Math.SQRT2
              : -(totalStationHeight(layoutConfig) / 2 + layoutConfig.gap.markerLabel.y / 2) /
                Math.SQRT2,
        })
          .withSizeFromBox(labelBox)
          .offset({
            dy:
              labelDirection.dy > 0
                ? 0
                : -(layoutConfig.label.lineHeight ?? layoutConfig.label.fontSize) *
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
            marker
              .withPadding(layoutConfig.spacing.marker.scale(Math.SQRT1_2))
              .with({ label: 'marker' }),
            label
              .withPadding({
                x: layoutConfig.spacing.label.x,
                y: layoutConfig.gap.markerLabel.y * 2,
              })
              .with({ label: 'label' }),
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
  stations: readonly Station[];
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
        ? Box.separationFactor(previousPosition.safeAreas, position.safeAreas, lineDirection)
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
