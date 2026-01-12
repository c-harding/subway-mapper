export interface PointOffsetLike {
  dx?: number;
  dy?: number;
}

export class PointOffset implements PointOffsetLike {
  readonly dx: number;
  readonly dy: number;

  constructor(dx: number, dy: number);
  constructor(props: PointOffsetLike);
  constructor(...args: [number, number] | [PointOffsetLike]) {
    if (args.length === 1) {
      this.dx = args[0].dx ?? 0;
      this.dy = args[0].dy ?? 0;
    } else {
      this.dx = args[0];
      this.dy = args[1];
    }
  }

  scale(factor: number): PointOffset {
    return new PointOffset(this.dx * factor, this.dy * factor);
  }
}
