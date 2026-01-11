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
  safeAreas: readonly RangedPoint[];
}

export interface LayoutStrategy {
  nextPosition(
    previous: StationPosition | undefined,
    station: Station,
    mapConfig: MapConfig,
    getLabelBoxes: (props?: { textAnchor?: 'start' | 'middle' | 'end' }) => TextBox[],
  ): StationPosition;
}

const makeVerticalLayoutStrategy = (side: 'left' | 'right'): LayoutStrategy => ({
  nextPosition(previous, station, mapConfig, getLabelBoxes): StationPosition {
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
      const offsetDirection = new PointOffset({ dy: 1 });
      const offset = offsetDirection.scale(
        Box.separationFactor(previous.safeAreas, [marker, label], offsetDirection),
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

const makeHorizontalLayoutStrategy = (side: 'top' | 'bottom'): LayoutStrategy => ({
  nextPosition(previous, station, mapConfig, getLabelBoxes): StationPosition {
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
      const offsetDirection = new PointOffset({ dx: 1 });
      const offset = offsetDirection.scale(
        Box.separationFactor(previous.safeAreas, [marker, label], offsetDirection),
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

const denseHorizontalLayoutStrategy: LayoutStrategy = {
  nextPosition(previous, station, mapConfig, getLabelBoxes): StationPosition {
    const positions = [
      layoutStrategies.horizontal.nextPosition(previous, station, mapConfig, getLabelBoxes),
      layoutStrategies.topHorizontal.nextPosition(previous, station, mapConfig, getLabelBoxes),
    ];

    const { pos } = positions.reduce(
      (acc, pos) => {
        const box = Box.bounds(
          [pos.marker, pos.label, previous?.marker, previous?.label].filter(
            Boolean,
          ) as RangedPoint[],
        );
        if (box.width < acc.size || (box.width === acc.size && pos.variant === previous?.variant)) {
          return { pos, size: box.width };
        } else {
          return acc;
        }
      },
      { pos: undefined as StationPosition | undefined, size: Infinity },
    );

    return pos ?? positions[0]!;
  },
};

export const layoutStrategies = {
  vertical: makeVerticalLayoutStrategy('right'),
  leftVertical: makeVerticalLayoutStrategy('left'),
  horizontal: makeHorizontalLayoutStrategy('bottom'),
  topHorizontal: makeHorizontalLayoutStrategy('top'),
  denseHorizontal: denseHorizontalLayoutStrategy,
} satisfies Record<string, LayoutStrategy>;
