import type { MapConfig } from './config';
import type { Station } from './model';
import { Box, Point, PointOffset, type RangedPoint } from './Point';

const totalStationWidth = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);
const totalStationHeight = (mapConfig: MapConfig) =>
  Math.max(mapConfig.lineWidth, mapConfig.marker.radius * 2 + mapConfig.marker.strokeWidth * 2);

export interface StationPosition {
  station: Station;
  marker: RangedPoint;
  label: RangedPoint;
  variant: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface LayoutStrategy {
  nextPosition(
    previous: StationPosition | undefined,
    station: Station,
    mapConfig: MapConfig,
    getLabelBox: (props?: { textAnchor?: 'start' | 'middle' | 'end' }) => SVGRect,
  ): StationPosition;
}

const makeVerticalLayoutStrategy = (side: 'left' | 'right'): LayoutStrategy => ({
  nextPosition(previous, station, mapConfig, getLabelBox) {
    const textAnchor = side === 'left' ? 'end' : 'start';
    const labelBox = getLabelBox({ textAnchor });

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
          ? marker.min.x - mapConfig.gap.markerLabel
          : marker.max.x + mapConfig.gap.markerLabel,
      y: marker.y,
    }).withSizeFromBox(labelBox);

    if (previous) {
      const offsetDirection = new PointOffset({ dy: 1 });
      const offset = offsetDirection.scale(
        Math.max(
          Box.separationFactor(previous.marker, marker, offsetDirection, {
            x: 0,
            y: mapConfig.spacing.marker,
          }),
          Box.separationFactor(previous.label, label, offsetDirection, {
            x: 0,
            y: mapConfig.spacing.label,
          }),
          // prevent overlaps between marker and previous label
          Box.separationFactor(previous.label, marker, offsetDirection, {
            x: Infinity,
            y: mapConfig.spacing.label,
          }),
          // prevent overlaps between label and previous marker
          Box.separationFactor(previous.marker, label, offsetDirection, {
            x: Infinity,
            y: mapConfig.spacing.label,
          }),
        ),
      );

      marker = marker.offset(offset);
      label = label.offset(offset);
    }

    return {
      station,
      marker,
      label,
      variant: side,
      textAnchor,
    };
  },
});

const makeHorizontalLayoutStrategy = (side: 'top' | 'bottom'): LayoutStrategy => ({
  nextPosition(previous, station, mapConfig, getLabelBox) {
    const labelBox = getLabelBox();

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
          ? marker.min.y - mapConfig.gap.markerLabel
          : marker.max.y + mapConfig.gap.markerLabel,
    })
      .withSizeFromBox(labelBox)
      .offset({ dy: side === 'top' ? -labelBox.height - labelBox.y : -labelBox.y });

    if (previous) {
      const offsetDirection = new PointOffset({ dx: 1 });
      const offset = offsetDirection.scale(
        Math.max(
          Box.separationFactor(previous.marker, marker, offsetDirection, {
            x: mapConfig.spacing.marker,
            y: 0,
          }),
          Box.separationFactor(previous.label, label, offsetDirection, {
            x: mapConfig.spacing.label,
            y: 0,
          }),
          // prevent overlaps between marker and previous label
          Box.separationFactor(previous.label, marker, offsetDirection, {
            x: mapConfig.spacing.label,
            y: Infinity,
          }),
          // prevent overlaps between label and previous marker
          Box.separationFactor(previous.marker, label, offsetDirection, {
            x: mapConfig.spacing.label,
            y: Infinity,
          }),
        ),
      );

      marker = marker.offset(offset);
      label = label.offset(offset);
    }

    return {
      station,
      marker,
      label,
      variant: side,
    };
  },
});

const denseHorizontalLayoutStrategy: LayoutStrategy = {
  nextPosition(previous, station, mapConfig, getLabelBox) {
    const positions = [
      layoutStrategies.horizontal.nextPosition(previous, station, mapConfig, getLabelBox),
      layoutStrategies.topHorizontal.nextPosition(previous, station, mapConfig, getLabelBox),
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
