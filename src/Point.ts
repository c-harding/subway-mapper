export class Point {
  readonly x: number;
  readonly y: number;

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
    });
  }

  withSizeFromBox(box: { x: number; y: number; width: number; height: number }): RangedPoint {
    return new RangedPoint({
      x: this.x,
      y: this.y,
      minX: this.x + box.x,
      minY: this.y + box.y,
      maxX: this.x + box.x + box.width,
      maxY: this.y + box.y + box.height,
    });
  }

  toBox(): Box {
    return new Box(this, this);
  }
}

export class Box {
  readonly min: Point;
  readonly max: Point;

  constructor(min: Point, max: Point);
  constructor(values: { minX: number; minY: number; maxX: number; maxY: number });
  constructor(
    ...args: [Point, Point] | [{ minX: number; minY: number; maxX: number; maxY: number }]
  ) {
    if (args.length === 1) {
      this.min = new Point({ x: args[0].minX, y: args[0].minY });
      this.max = new Point({ x: args[0].maxX, y: args[0].maxY });
    } else {
      this.min = args[0];
      this.max = args[1];
    }
  }

  get width(): number {
    return this.max.x - this.min.x;
  }

  get height(): number {
    return this.max.y - this.min.y;
  }

  toBox(): Box {
    return this;
  }

  static bounds(points: (Point | Box)[]): Box {
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
    return new Box({ minX, minY, maxX, maxY });
  }

  withPadding(padding: number): Box;
  withPadding(paddingX: number, paddingY: number): Box;
  withPadding(paddingX: number, paddingY = paddingX): Box {
    return new Box({
      minX: this.min.x - paddingX,
      minY: this.min.y - paddingY,
      maxX: this.max.x + paddingX,
      maxY: this.max.y + paddingY,
    });
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

  constructor(values: {
    x: number;
    y: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }) {
    super(values.x, values.y);
    this.box = new Box({
      minX: values.minX,
      minY: values.minY,
      maxX: values.maxX,
      maxY: values.maxY,
    });
  }

  get width(): number {
    return this.box.width;
  }

  get height(): number {
    return this.box.height;
  }

  toBox(): Box {
    return this.box;
  }

  withPadding(padding: number): Box;
  withPadding(paddingX: number, paddingY: number): Box;
  withPadding(paddingX: number, paddingY = paddingX): Box {
    return this.withBox(this.box.withPadding(paddingX, paddingY));
  }
}

export type { RangedPoint };
