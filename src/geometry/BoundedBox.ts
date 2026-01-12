import { Box } from './Point';

export class BoundedBox {
  readonly minBox: Box;
  readonly maxWidth: number;
  readonly maxHeight: number;

  constructor(props: {
    maxWidth?: number;
    maxHeight?: number;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
  }) {
    this.minBox = new Box({
      minX: props.minX ?? Infinity,
      minY: props.minY ?? Infinity,
      maxX: props.maxX ?? -Infinity,
      maxY: props.maxY ?? -Infinity,
    });
    this.maxWidth = props.maxWidth ?? Infinity;
    this.maxHeight = props.maxHeight ?? Infinity;
  }

  static from(box: Box, dimensions: { maxWidth?: number; maxHeight?: number }): BoundedBox {
    return new BoundedBox({
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y,
      maxWidth: dimensions.maxWidth,
      maxHeight: dimensions.maxHeight,
    });
  }

  toBox(): Box {
    return this.minBox;
  }

  #valid?: boolean;
  get valid(): boolean {
    return (this.#valid ??=
      this.minBox.width <= this.maxWidth && this.minBox.height <= this.maxHeight);
  }

  add(...boxes: Box[]): BoundedBox {
    return BoundedBox.from(Box.bounds(this.minBox, ...boxes), this);
  }

  canFit(...boxes: Box[]): boolean {
    const combinedBox = Box.bounds(this.minBox, ...boxes);
    return combinedBox.width <= this.maxWidth && combinedBox.height <= this.maxHeight;
  }
}
