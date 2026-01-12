type PaddingX =
  | { left?: number; right?: number; x?: undefined }
  | { x?: number; left?: undefined; right?: undefined };
type PaddingY =
  | { top?: number; bottom?: number; y?: undefined }
  | { y?: number; top?: undefined; bottom?: undefined };

export type PaddingLike = (PaddingX & PaddingY) | number;

export class Padding {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;

  constructor(padding: PaddingLike) {
    if (typeof padding === 'number') {
      this.top = padding;
      this.bottom = padding;
      this.left = padding;
      this.right = padding;
    } else {
      this.top = padding.top ?? padding.y ?? 0;
      this.bottom = padding.bottom ?? padding.y ?? 0;
      this.left = padding.left ?? padding.x ?? 0;
      this.right = padding.right ?? padding.x ?? 0;
    }
  }
}
