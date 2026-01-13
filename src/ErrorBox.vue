<script setup lang="ts">
const { errorMessage = 'An unknown error occurred.', color = 'red' } = defineProps<{
  errorMessage?: string;
  color?: string;
}>();
</script>

<template>
  <div :class="$style.error">
    <div :class="$style.errorRow">
      <div :class="$style.errorIcon"><slot name="icon">⚠︎</slot></div>
      <div :class="$style.errorMessage">
        <slot>{{ errorMessage }}</slot>
      </div>
    </div>
    <div v-if="$slots.pre" :class="$style.preContainer">
      <slot name="pre" />
    </div>
    <div v-if="$slots.actions" :class="$style.actionsContainer">
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
  gap: 1em;
  justify-content: flex-end;
}
</style>
