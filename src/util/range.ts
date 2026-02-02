export function range(end: number): Generator<number>;
export function range(start: number, end: number, step?: number): Generator<number>;
export function* range(
  ...args: [end: number] | [start: number, end: number, step?: number]
): Generator<number> {
  const [start, end, step] = args.length === 1 ? [0, args[0], 1] : [args[0], args[1], args[2] ?? 1];
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    yield i;
  }
}

export function* modularRangeInclusive(
  start: number,
  end: number,
  modulus: number,
  step = 1,
): Generator<number> {
  for (let i = start; ; i = (((i + step) % modulus) + modulus) % modulus) {
    yield i;
    if (i === end) {
      break;
    }
  }
}
