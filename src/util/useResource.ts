import { useAsyncState, type UseAsyncStateReturn } from '@vueuse/core';
import { toRef, watch, type MaybeRefOrGetter } from 'vue';

type ResourceResult<R> = UseAsyncStateReturn<R, [], true>;

/**
 * Loads a resource based on a request value.
 *
 * If the request is undefined, the loader will not be called and the result will be undefined
 * @param options.request The request value to load the resource for. If this is undefined, the loader will not be called.
 * @param options.hotUrls A function that returns a list of URLs that, when changed in the dev environment, should trigger a reload of the resource.
 * @param options.loader The function that loads the resource based on the request.
 * @param options.defaultValue The default value to use when the request is loading.
 * @param options.resetOnExecute Whether to reset the result to the default value when a new load is triggered. Defaults to true.
 * @param options.delay Optional delay in milliseconds before loading the resource.
 */
export function useResource<T, R>(options: {
  request: MaybeRefOrGetter<T>;
  hotUrls?: NoInfer<(params: { request: Exclude<T, undefined> }) => string[]>;
  loader: (params: { request: Exclude<T, undefined> }) => Promise<R>;
  defaultValue: R;
  resetOnExecute?: boolean;
  delay?: number;
}): ResourceResult<R>;

export function useResource<T, R>(options: {
  request: MaybeRefOrGetter<T>;
  hotUrls?: NoInfer<(params: { request: Exclude<T, undefined> }) => string[]>;
  loader: (params: { request: Exclude<T, undefined> }) => Promise<R>;
  defaultValue?: R | undefined;
  resetOnExecute?: boolean;
  delay?: number;
}): ResourceResult<R | undefined>;

export function useResource<T, R>(options: {
  request: MaybeRefOrGetter<T>;
  hotUrls?: NoInfer<(params: { request: Exclude<T, undefined> }) => string[]>;
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

  if (import.meta.hot && options.hotUrls) {
    import.meta.hot.on('reload-public-assets:asset', (data: { path: string }) => {
      if (request.value === undefined) return;
      const fullUrl = new URL(data.path, location.href).href;
      const hotUrls = options.hotUrls!({ request: request.value }).map(
        (url) => new URL(url, location.href).href,
      );
      if (hotUrls.includes(fullUrl)) {
        result.execute(options.delay);
      }
    });
  }
  return result;
}
