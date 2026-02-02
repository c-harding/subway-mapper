import { useAsyncState, type UseAsyncStateReturn } from '@vueuse/core';
import { toRef, watch, type MaybeRefOrGetter } from 'vue';

type ResourceResult<R> = UseAsyncStateReturn<R, [], true>;

/**
 * Loads a resource based on a request value.
 *
 * If the request is undefined, the loader will not be called and the result will be undefined
 * @param options
 */
export function useResource<T, R>(options: {
  request: () => T;
  loader: (params: { request: Exclude<T, undefined> }) => Promise<R>;
  defaultValue: R;
  resetOnExecute?: boolean;
  delay?: number;
}): ResourceResult<R>;

export function useResource<T, R>(options: {
  request: () => T;
  loader: (params: { request: Exclude<T, undefined> }) => Promise<R>;
  defaultValue?: R | undefined;
  resetOnExecute?: boolean;
  delay?: number;
}): ResourceResult<R | undefined>;

export function useResource<T, R>(options: {
  request: MaybeRefOrGetter<T>;
  loader: (params: { request: Exclude<T, undefined> }) => Promise<R>;
  defaultValue?: R | undefined;
  resetOnExecute?: boolean;
  delay?: number;
}): ResourceResult<R | undefined> {
  const request = toRef(options.request);
  const result = useAsyncState(
    async () =>
      request.value !== undefined
        ? await options.loader({ request: request.value })
        : options.defaultValue,
    options.defaultValue,
    { immediate: true, resetOnExecute: options.resetOnExecute ?? true, delay: options.delay },
  );

  watch(request, () => result.execute(options.delay));
  return result;
}
