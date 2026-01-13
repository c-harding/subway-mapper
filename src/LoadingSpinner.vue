<!-- A circle with a rotating arc of varying size -->

<template>
  <div :class="$style.spinner">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray="283"
        stroke-dashoffset="75"
      />
    </svg>
  </div>
</template>

<style module>
.spinner > svg {
  display: block;
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
