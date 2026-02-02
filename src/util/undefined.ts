export function skipUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function definedFilter<T>(value: T | undefined): value is T {
  return value !== undefined;
}
