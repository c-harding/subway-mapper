<script setup lang="ts">
import { computed, ref } from 'vue';

const {
  errorMessage,
  color = 'red',
  error,
  stackTrace: providedStackTrace,
} = defineProps<{
  error?: unknown;
  errorMessage?: string;
  color?: string;
  stackTrace?: string;
}>();

const causes = computed(() => {
  if (!(error instanceof Error)) {
    return [
      {
        cause: undefined,
        message: error ? String(error) : (errorMessage ?? 'An unknown error occurred.'),
        stack: providedStackTrace,
      },
    ];
  }

  const causes: Error[] = [error];
  while (causes[causes.length - 1]?.cause instanceof Error) {
    causes.push(causes[causes.length - 1]?.cause as Error);
  }
  return causes;
});

const causeCount = ref(2);
</script>

<template>
  <div :class="$style.error">
    <div v-for="(cause, i) in causes.slice(0, causeCount)" :key="i" :class="$style.errorStage">
      <div :class="$style.errorRow">
        <div :class="$style.errorIcon">
          <slot name="icon" v-if="i === 0">⚠︎</slot>
          <template v-else>↳</template>
        </div>
        <div :class="$style.errorMessage">
          <slot v-if="i === 0 && $slots.default" />
          <template v-else>{{ cause.message }}</template>
        </div>
      </div>

      <div v-if="i === 0 && $slots.pre" :class="$style.preContainer">
        <slot name="pre" />
      </div>

      <details v-if="cause.stack && i < causeCount - 1">
        <summary>Stack trace</summary>
        <div :class="$style.preContainer">
          <slot name="stackTrace" v-if="i === 0 && $slots.stackTrace"></slot>
          <pre v-else>{{ cause.stack }}</pre>
        </div>
      </details>
    </div>

    <div :class="$style.actionsContainer">
      <div :class="$style.actionsLeft" v-if="causes.length > 1">
        <button :disabled="causeCount > causes.length" @click="causeCount++">+</button>
        <button :disabled="causeCount <= 2" @click="causeCount--">-</button>
      </div>
      <div :class="$style.actionsRight"></div>
      <slot name="actions" />
    </div>
  </div>
</template>

<style module>
.error {
  color: v-bind(color);
  font-weight: bold;
  padding: 1em;
  border: 2px solid currentColor;
  margin: 1em;
  border-radius: 0.5em;

  display: flex;
  flex-direction: column;
  gap: 1em;
}

.errorRow {
  display: flex;
  gap: 1em;
}

.errorIcon {
  font-size: 2em;
  min-height: 1em;
  line-height: 1em;
  align-self: flex-start;
  display: flex;
  align-items: center;
}

.errorMessage {
  flex: 1;
  align-self: center;
}

.preContainer {
  padding: 1em;
  background: #e4e4e4;
  max-height: 50vh;
  overflow: auto;

  > pre:only-child {
    margin: 0;
    overflow: auto;
  }
}

.actionsContainer {
  display: flex;
  gap: 0.5em;
  justify-content: space-between;

  &:not(:has(> :not(:empty))) {
    display: none;
  }

  .actionsLeft {
    display: flex;
    gap: 0.5em;
    justify-content: start;
    flex-wrap: wrap;
    margin-right: auto;
  }

  .actionsRight {
    display: flex;
    gap: 0.5em;
    justify-content: end;
    flex-wrap: wrap;
    margin-left: auto;
  }
}
</style>
