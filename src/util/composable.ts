import {
  type MaybeRefOrGetter,
  type WatchCallback,
  type WatchOptions,
  isReactive,
  isRef,
  onUnmounted,
  watch,
} from 'vue';

export function watchMaybeRefOrGetter<T, Immediate extends Readonly<boolean> = false>(
  source: MaybeRefOrGetter<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>,
) {
  if (isRef(source)) {
    return watch(source, cb, options);
  } else if (isReactive(source)) {
    return watch(source as T & object, cb, options);
  } else if (typeof source === 'function') {
    return watch(source as () => T, cb, options);
  } else if (options?.immediate) {
    cb(source as T, undefined as never, onUnmounted);
  }
}
