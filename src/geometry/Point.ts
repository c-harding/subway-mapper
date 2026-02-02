import { Padding, type PaddingLike } from './Padding';
import { PointOffset, type PointOffsetLike } from './PointOffset';

export class Point {
  readonly x: number;
  readonly y: number;

  static readonly ORIGIN = new Point(0, 0);

  constructor(x: number, y: number);
  constructor(coords: { x: number; y: number });
  constructor(...args: [number, number] | [{ x: number; y: number }]) {
    if (args.length === 1) {
      this.x = args[0].x;
      this.y = args[0].y;
    } else {
      this.x = args[0];
      this.y = args[1];
    }
  }

  with(props: { x?: number; y?: number }): Point {
    return new Point(props.x ?? this.x, props.y ?? this.y);
  }

  withRange(range: { minX: number; minY: number; maxX: number; maxY: number }): RangedPoint {
    return new RangedPoint({
      x: this.x,
      y: this.y,
      minX: range.minX,
      minY: range.minY,
      maxX: range.maxX,
      maxY: range.maxY,
    });
  }

  withSize(size: { width: number; height: number }): RangedPoint {
    return new RangedPoint({
      x: this.x,
      y: this.y,
      minX: this.x - size.width / 2,
      minY: this.y - size.height / 2,
      maxX: this.x + size.width / 2,
      maxY: this.y + size.height / 2,
    });
  }

  withBox(box: Box): RangedPoint {
    return new RangedPoint({
      x: this.x,
      y: this.y,
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y,
      label: box.label,
    });
  }

  withSizeFromBox(box: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  }): RangedPoint {
    return new RangedPoint({
      x: this.x,
      y: this.y,
      minX: this.x + box.x,
      minY: this.y + box.y,
      maxX: this.x + box.x + box.width,
      maxY: this.y + box.y + box.height,
      label: box.label,
    });
  }

  offset(dx: number, dy: number): Point;
  offset(props: PointOffsetLike): Point;
  offset(...args: [number, number] | [PointOffsetLike]): Point {
    const [dx, dy] = args.length === 1 ? [args[0].dx ?? 0, args[0].dy ?? 0] : args;
    return new Point(this.x + dx, this.y + dy);
  }

  toBox(): Box {
    return new Box(this, this);
  }

  offsetTo(other: Point): PointOffset {
    return new PointOffset(other.x - this.x, other.y - this.y);
  }
}

export interface BoxInput {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Box {
  readonly min: Point;
  readonly max: Point;

  readonly label: string | undefined;

  constructor(min: Point, max: Point, label?: string);
  constructor(values: { minX: number; minY: number; maxX: number; maxY: number; label?: string });
  constructor(
    ...args:
      | [Point, Point, string?]
      | [{ minX: number; minY: number; maxX: number; maxY: number; label?: string }]
  ) {
    if (args.length === 1) {
      this.min = new Point({ x: args[0].minX, y: args[0].minY });
      this.max = new Point({ x: args[0].maxX, y: args[0].maxY });
      this.label = args[0].label;
    } else {
      this.min = args[0];
      this.max = args[1];
      this.label = args[2];
    }
  }

  get width(): number {
    return this.max.x - this.min.x;
  }

  get height(): number {
    return this.max.y - this.min.y;
  }

  get area(): number {
    return this.width * this.height;
  }

  offset(dx: number, dy: number): Box;
  offset(props: PointOffsetLike): Box;
  offset(...args: [number, number] | [PointOffsetLike]): Box {
    const [dx, dy] = args.length === 1 ? [args[0].dx ?? 0, args[0].dy ?? 0] : args;
    return new Box(this.min.offset(dx, dy), this.max.offset(dx, dy), this.label);
  }

  with(props: { minX?: number; minY?: number; maxX?: number; maxY?: number; label?: string }): Box {
    return new Box({
      minX: props.minX ?? this.min.x,
      minY: props.minY ?? this.min.y,
      maxX: props.maxX ?? this.max.x,
      maxY: props.maxY ?? this.max.y,
      label: props.label ?? this.label,
    });
  }

  toBox(): Box {
    return this;
  }

  static bounds(...points: (Point | Box)[]): Box {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      const box = point.toBox();
      minX = Math.min(minX, box.min.x);
      minY = Math.min(minY, box.min.y);
      maxX = Math.max(maxX, box.max.x);
      maxY = Math.max(maxY, box.max.y);
    }
    return new Box({ minX, minY, maxX, maxY, label: undefined });
  }

  withPadding(paddingLike: PaddingLike): Box {
    const padding = new Padding(paddingLike);
    return new Box({
      minX: this.min.x - padding.left,
      minY: this.min.y - padding.top,
      maxX: this.max.x + padding.right,
      maxY: this.max.y + padding.bottom,
      label: this.label,
    });
  }

  static overlaps(boxA: Box, boxB: Box): boolean {
    return (
      boxA.max.x > boxB.min.x &&
      boxA.min.x < boxB.max.x &&
      boxA.max.y > boxB.min.y &&
      boxA.min.y < boxB.max.y
    );
  }

  /**
   * Get the distance the new boxes must be moved in order to no longer overlap the old boxes.
   *
   * The movement is in the direction of the given offset,
   * and the return value is a scaling factor to apply to that offset.
   * This scaling factor is zero if the boxes do not overlap, or positive otherwise.
   *
   * Note that offset itself may be negative in either or both dimensions.
   * This indicates that the boxes should be moved upwards or leftwards to separate them.
   */

  static separationFactor(
    oldBoxes: readonly Box[],
    newBoxes: readonly Box[],
    offset: PointOffsetLike,
  ): number {
    let factor = 0;

    let movedNewBoxes = newBoxes;

    while (factor < Infinity) {
      const newFactor = Math.max(
        ...oldBoxes.flatMap((oldBox) =>
          movedNewBoxes.map((newBox) => Box.pairSeparationFactor(oldBox, newBox, offset)),
        ),
      );
      if (newFactor === 0) {
        break;
      }
      factor += newFactor;
      const offsetScaled = new PointOffset(offset).scale(newFactor);
      movedNewBoxes = movedNewBoxes.map(
        (box) => new Box(box.min.offset(offsetScaled), box.max.offset(offsetScaled)),
      );
    }
    return factor;
  }

  /**
   * Get the distance Box B must be moved in order to no longer overlap Box A.
   *
   * The movement is in the direction of the given offset,
   * and the return value is a scaling factor to apply to that offset.
   * This scaling factor is zero if the boxes do not overlap, or positive otherwise.
   *
   * Note that offset itself may be negative in either or both dimensions.
   * This indicates that the boxes should be moved upwards or leftwards to separate them.
   */
  private static pairSeparationFactor(oldBox: Box, newBox: Box, offset: PointOffsetLike): number {
    if (!Box.overlaps(oldBox, newBox)) {
      return 0;
    }

    const factorX = !offset.dx
      ? Infinity
      : Math.max(
          (oldBox.max.x - newBox.min.x) / offset.dx,
          (newBox.max.x - oldBox.min.x) / -offset.dx,
        );
    const factorY = !offset.dy
      ? Infinity
      : Math.max(
          (oldBox.max.y - newBox.min.y) / offset.dy,
          (newBox.max.y - oldBox.min.y) / -offset.dy,
        );
    return Math.min(factorX, factorY);
  }
}

class RangedPoint extends Point implements Box {
  private readonly box: Box;
  get min(): Point {
    return this.box.min;
  }
  get max(): Point {
    return this.box.max;
  }

  get label(): string | undefined {
    return this.box.label;
  }

  constructor(values: {
    x: number;
    y: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    label?: string;
  }) {
    super(values.x, values.y);
    this.box = new Box({
      minX: values.minX,
      minY: values.minY,
      maxX: values.maxX,
      maxY: values.maxY,
      label: values.label,
    });
  }

  get width(): number {
    return this.box.width;
  }

  get height(): number {
    return this.box.height;
  }

  get area(): number {
    return this.box.area;
  }

  toBox(): Box {
    return this.box;
  }

  toPoint(): Point {
    return new Point(this.x, this.y);
  }

  with(props: {
    x?: number;
    y?: number;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
    label?: string;
  }): RangedPoint {
    return new RangedPoint({
      x: props.x ?? this.x,
      y: props.y ?? this.y,
      minX: props.minX ?? this.min.x,
      minY: props.minY ?? this.min.y,
      maxX: props.maxX ?? this.max.x,
      maxY: props.maxY ?? this.max.y,
      label: props.label ?? this.box.label,
    });
  }

  withPadding(paddingLike: PaddingLike): RangedPoint {
    return this.withBox(this.box.withPadding(paddingLike));
  }

  override offset(dx: number, dy: number): RangedPoint;
  override offset(props: { dx?: number; dy?: number }): RangedPoint;
  override offset(...args: [number, number] | [{ dx?: number; dy?: number }]): RangedPoint {
    const [dx, dy] = args.length === 1 ? [args[0].dx ?? 0, args[0].dy ?? 0] : args;
    return new RangedPoint({
      x: this.x + dx,
      y: this.y + dy,
      minX: this.min.x + dx,
      minY: this.min.y + dy,
      maxX: this.max.x + dx,
      maxY: this.max.y + dy,
      label: this.box.label,
    });
  }
}

export type { RangedPoint };
