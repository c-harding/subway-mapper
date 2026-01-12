import type { MapConfig } from './config';
import type { Station } from './model';
import { Box, Point, PointOffset, type RangedPoint } from './Point';
import type { TextBox } from './util/svg';

const totalStationWidth = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);
const totalStationHeight = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);

export interface StationPosition {
  station: Station;
  marker: RangedPoint;
  label: RangedPoint;
  labelLines: string[];
  variant: string;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
  safeAreas: readonly RangedPoint[];
}

export interface LayoutStrategy {
  nextPosition(props: {
    station: Station;
    previous: StationPosition | undefined;
    allPrevious: StationPosition[];
    mapConfig: MapConfig;
    getLabelBoxes: (props?: {
      textAnchor?: 'start' | 'middle' | 'end';
      dominantBaseline?: 'hanging' | 'middle' | 'alphabetic';
    }) => TextBox[];
  }): StationPosition;
}

const makeVerticalLayoutStrategy = (side: 'left' | 'right'): LayoutStrategy => ({
  nextPosition({ station, previous, allPrevious, mapConfig, getLabelBoxes }): StationPosition {
    const textAnchor = side === 'left' ? 'end' : 'start';
    const labelBoxes = getLabelBoxes({ textAnchor });
    const labelBox = labelBoxes.at(0)!; // Use the box with the fewest lines

    let marker = new Point({
      x: previous?.marker.x ?? 0,
      y: previous?.marker.y ?? 0,
    }).withSize({
      width: totalStationWidth(mapConfig),
      height: totalStationHeight(mapConfig),
    });

    let label = new Point({
      x:
        side === 'left'
          ? marker.min.x - mapConfig.gap.markerLabel.x
          : marker.max.x + mapConfig.gap.markerLabel.x,
      y:
        marker.y -
        ((labelBox.lines.length - 1) / 2) *
          (mapConfig.label.lineHeight ?? mapConfig.label.fontSize),
    }).withSizeFromBox(labelBox);

    if (previous) {
      const previousOfVariant = allPrevious.findLast((pos) => pos.variant === side);

      const offsetDirection = new PointOffset({ dy: 1 });
      const offset = offsetDirection.scale(
        Box.separationFactor(
          [...previous.safeAreas, ...(previousOfVariant?.safeAreas ?? [])],
          [marker, label],
          offsetDirection,
        ),
      );

      marker = marker.offset(offset);
      label = label.offset(offset);
    }

    return {
      station,
      labelLines: labelBox.lines,
      marker,
      label,
      variant: side,
      textAnchor,
      safeAreas: [
        marker.withPadding({
          y: mapConfig.spacing.marker.y,
        }),
        label.withPadding({
          y: mapConfig.spacing.label.y,
        }),
      ],
    };
  },
});

const makeHorizontalLayoutStrategy = (side: 'top' | 'bottom'): LayoutStrategy => ({
  nextPosition({ station, previous, allPrevious, mapConfig, getLabelBoxes }): StationPosition {
    const labelBoxes = getLabelBoxes();
    const labelBox = labelBoxes.at(-1)!; // Use the box with the most lines

    // Initial position: place at the same location as previous, or origin if first.
    // Then offset to the right as needed to avoid overlaps.
    let marker = new Point({
      x: previous?.marker.x ?? 0,
      y: previous?.marker.y ?? 0,
    }).withSize({
      width: totalStationWidth(mapConfig),
      height: totalStationHeight(mapConfig),
    });
    let label = new Point({
      x: marker.x,
      y:
        side === 'top'
          ? marker.min.y - mapConfig.gap.markerLabel.y
          : marker.max.y + mapConfig.gap.markerLabel.y,
    })
      .withSizeFromBox(labelBox)
      .offset({ dy: side === 'top' ? -labelBox.height - labelBox.y : -labelBox.y });

    if (previous) {
      const previousOfVariant = allPrevious.findLast((pos) => pos.variant === side);

      const offsetDirection = new PointOffset({ dx: 1 });
      const offset = offsetDirection.scale(
        Box.separationFactor(
          [...previous.safeAreas, ...(previousOfVariant?.safeAreas ?? [])],
          [marker, label],
          offsetDirection,
        ),
      );

      marker = marker.offset(offset);
      label = label.offset(offset);
    }

    return {
      station,
      labelLines: labelBox.lines,
      marker,
      label,
      variant: side,
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
  },
});

const makeDiagonalLayoutStrategy = (
  direction: 'ne' | 'nw' | 'se' | 'sw',
  side: 'left' | 'right',
): LayoutStrategy => ({
  nextPosition({ previous, allPrevious, station, mapConfig, getLabelBoxes }): StationPosition {
    const variant = `${direction}-${side}`;

    const isPrimaryDiagonal = ['nw', 'se'].includes(direction);
    const isBelow = isPrimaryDiagonal === (side === 'left');

    const textAnchor = side === 'left' ? 'end' : 'start';
    const dominantBaseline = isBelow ? 'hanging' : 'alphabetic';

    const labelBoxes = getLabelBoxes({ textAnchor, dominantBaseline });
    const labelBox = labelBoxes.at(0)!; // Use the box with the fewest lines

    const offsetDirection = new PointOffset({
      dx: direction.includes('e') ? 1 : -1,
      dy: direction.includes('n') ? -1 : 1,
    });

    // Initial position: place at the same location as previous, or origin if first.
    // Then offset to the right as needed to avoid overlaps.
    let marker = new Point({
      x: previous?.marker.x ?? 0,
      y: previous?.marker.y ?? 0,
    }).withSize({
      width: totalStationWidth(mapConfig) / Math.SQRT2,
      height: totalStationHeight(mapConfig) / Math.SQRT2,
    });

    const xUnit = side === 'right' ? 1 : -1;
    const yUnit = isBelow ? 1 : -1;

    let label = new Point({
      x:
        marker.x +
        (xUnit * (totalStationWidth(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2)) / Math.SQRT2,
      y:
        marker.y +
        (yUnit * (totalStationHeight(mapConfig) / 2 + mapConfig.gap.markerLabel.y / 2)) /
          Math.SQRT2,
    })
      .withSizeFromBox(labelBox)
      .offset({
        dy: isBelow
          ? 0
          : -(mapConfig.label.lineHeight ?? mapConfig.label.fontSize) * (labelBox.lines.length - 1),
      });

    if (previous) {
      const previousOfVariant = allPrevious.findLast((pos) => pos.variant === variant);

      const offset = offsetDirection.scale(
        Box.separationFactor(
          [...previous.safeAreas, ...(previousOfVariant?.safeAreas ?? [])],
          [marker, label],
          offsetDirection,
        ),
      );

      marker = marker.offset(offset);
      label = label.offset(offset);
    }

    return {
      station,
      labelLines: labelBox.lines,
      marker,
      label,
      variant,
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
  },
});

const denseLayoutStrategy = (layouts: LayoutStrategy[]): LayoutStrategy => {
  if (layouts.length === 0) {
    throw new Error('At least one layout strategy must be provided');
  }
  return {
    nextPosition(props) {
      const positions = layouts.map((layout) => layout.nextPosition(props));

      const { previous } = props;

      const { pos } = positions.reduce(
        (acc, pos) => {
          const box = Box.bounds(
            [pos.marker, previous?.marker].filter((point): point is RangedPoint => !!point),
          );
          if (box.area < acc.area || (box.area === acc.area && pos.variant === previous?.variant)) {
            return { pos, area: box.area };
          } else {
            return acc;
          }
        },
        { pos: undefined as StationPosition | undefined, area: Infinity },
      );

      return pos ?? positions[0]!;
    },
  };
};

export const layoutStrategies = {
  vertical: denseLayoutStrategy([
    makeVerticalLayoutStrategy('right'),
    makeVerticalLayoutStrategy('left'),
  ]),
  leftVertical: makeVerticalLayoutStrategy('left'),
  rightVertical: makeVerticalLayoutStrategy('right'),
  horizontal: denseLayoutStrategy([
    makeHorizontalLayoutStrategy('bottom'),
    makeHorizontalLayoutStrategy('top'),
  ]),
  bottomHorizontal: makeHorizontalLayoutStrategy('bottom'),
  topHorizontal: makeHorizontalLayoutStrategy('top'),
  diagonalNE: denseLayoutStrategy([
    makeDiagonalLayoutStrategy('ne', 'right'),
    makeDiagonalLayoutStrategy('ne', 'left'),
  ]),
  diagonalNELeft: makeDiagonalLayoutStrategy('ne', 'left'),
  diagonalNERight: makeDiagonalLayoutStrategy('ne', 'right'),
  diagonalNW: denseLayoutStrategy([
    makeDiagonalLayoutStrategy('nw', 'right'),
    makeDiagonalLayoutStrategy('nw', 'left'),
  ]),
  diagonalNWLeft: makeDiagonalLayoutStrategy('nw', 'left'),
  diagonalNWRight: makeDiagonalLayoutStrategy('nw', 'right'),
  diagonalSE: denseLayoutStrategy([
    makeDiagonalLayoutStrategy('se', 'right'),
    makeDiagonalLayoutStrategy('se', 'left'),
  ]),
  diagonalSELeft: makeDiagonalLayoutStrategy('se', 'left'),
  diagonalSERight: makeDiagonalLayoutStrategy('se', 'right'),
  diagonalSW: denseLayoutStrategy([
    makeDiagonalLayoutStrategy('sw', 'right'),
    makeDiagonalLayoutStrategy('sw', 'left'),
  ]),
  diagonalSWLeft: makeDiagonalLayoutStrategy('sw', 'left'),
  diagonalSWRight: makeDiagonalLayoutStrategy('sw', 'right'),
} satisfies Record<string, LayoutStrategy>;
