export function skipUndefined<T>(obj: T): T {
  return (
    typeof obj === 'object' && obj !== null
      ? Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
      : obj
  ) as T;
}

export function definedFilter<T>(value: T | undefined): value is T {
  return value !== undefined;
}
