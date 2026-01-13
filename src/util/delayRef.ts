import { shallowReadonly, shallowRef, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { watchMaybeRefOrGetter, type Nullable } from './composable';

export function delayRef<T>(
  source: MaybeRefOrGetter<T>,
  delay: number | ((newValue: T, oldValue: T | undefined) => number),
): Readonly<Ref<T | undefined>>;
export function delayRef<T, Default extends Nullable<T> = T>(
  source: MaybeRefOrGetter<T>,
  delay: number | ((newValue: T, oldValue: T | Default) => number),
  initialValue: Default,
): Readonly<Ref<T | Default>>;
export function delayRef<T>(
  source: MaybeRefOrGetter<T>,
  delay: number | ((newValue: T, oldValue: Nullable<T>) => number),
  initialValue: Nullable<T> = undefined,
): Readonly<Ref<Nullable<T>>> {
  const delayed = shallowRef<Nullable<T>>(initialValue);
  let timeout: ReturnType<typeof setTimeout> | null = null;

  watchMaybeRefOrGetter(
    source,
    (newValue, oldValue) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      const delayDuration = typeof delay === 'function' ? delay(newValue, oldValue) : delay;
      timeout = setTimeout(() => {
        delayed.value = newValue;
        timeout = null;
      }, delayDuration);
    },
    { immediate: toValue(source) !== delayed.value },
  );
  return shallowReadonly(delayed);
}
