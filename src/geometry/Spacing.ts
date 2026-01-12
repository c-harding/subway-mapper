export type SpacingLike = { x?: number; y?: number } | number;

export class Spacing {
  readonly x: number;
  readonly y: number;

  constructor(spacing: SpacingLike) {
    if (typeof spacing === 'number') {
      this.x = spacing;
      this.y = spacing;
    } else {
      this.x = spacing.x ?? 0;
      this.y = spacing.y ?? 0;
    }
  }

  scale(factor: number): Spacing {
    return new Spacing({ x: this.x * factor, y: this.y * factor });
  }
}
