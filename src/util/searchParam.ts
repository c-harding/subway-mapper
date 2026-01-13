import { useUrlSearchParams } from '@vueuse/core';
import { computed, toRef, toValue, type MaybeRefOrGetter, type WritableComputedRef } from 'vue';

type Nullable<T> = T | null | undefined;

function useUrlSearchParam(paramName: string) {
  return toRef(
    useUrlSearchParams<Record<string, string | undefined>>('history', {
      stringify: (params: URLSearchParams) => params.toString().replace(/=(?=&|$)/g, ''),
    }),
    paramName,
  );
}

export function useBooleanSearchParam(
  paramName: string,
  defaultValue: MaybeRefOrGetter<boolean> = false,
) {
  const param = useUrlSearchParam(paramName);
  return computed({
    get: (): boolean =>
      param.value != undefined ? param.value !== 'false' : toValue(defaultValue),
    set: (value: boolean) => (param.value = value ? '' : undefined),
  });
}

export function useStringSearchParam<Default extends Nullable<string> = string>(
  paramName: string,
  defaultValue: MaybeRefOrGetter<Default>,
): WritableComputedRef<string | Default>;
export function useStringSearchParam(paramName: string): WritableComputedRef<string | undefined>;
export function useStringSearchParam(
  paramName: string,
  defaultValue?: MaybeRefOrGetter<Nullable<string>>,
) {
  const param = useUrlSearchParam(paramName);
  return computed({
    get: (): Nullable<string> => param.value ?? toValue(defaultValue),
    set: (value: Nullable<string>) => (param.value = value != undefined ? value : undefined),
  });
}

export function useNumberSearchParam<Default extends Nullable<number> = number>(
  paramName: string,
  defaultValue: MaybeRefOrGetter<Default>,
): WritableComputedRef<number | Default>;
export function useNumberSearchParam(paramName: string): WritableComputedRef<number | undefined>;
export function useNumberSearchParam(
  paramName: string,
  defaultValue?: MaybeRefOrGetter<Nullable<number>>,
) {
  const param = useUrlSearchParam(paramName);
  return computed({
    get: (): Nullable<number> => (param.value ? Number(param.value) : toValue(defaultValue)),
    set: (value: Nullable<number>) =>
      (param.value = value || value === 0 ? value.toString() : undefined),
  });
}

export function useEnumSearchParam<T, Default extends Nullable<T> = T>(
  paramName: string,
  validValues: readonly T[],
  defaultValue: MaybeRefOrGetter<Default>,
): WritableComputedRef<T | Default>;
export function useEnumSearchParam<T>(
  paramName: string,
  validValues: readonly T[],
): WritableComputedRef<T | undefined>;
export function useEnumSearchParam<T>(
  paramName: string,
  validValues: readonly T[],
  defaultValue?: MaybeRefOrGetter<Nullable<T>>,
): WritableComputedRef<T | undefined | null> {
  const param = useUrlSearchParam(paramName);
  return computed({
    get: (): Nullable<T> =>
      param.value != undefined && validValues.includes(param.value as T)
        ? (param.value as T)
        : toValue(defaultValue),
    set: (value: Nullable<T>) => (param.value = value != undefined ? (value as string) : undefined),
  });
}
