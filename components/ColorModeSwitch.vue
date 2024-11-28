<script setup lang="ts">
const colorMode = useColorMode()
const onClick = () => (colorMode.value === 'light' ? (colorMode.preference = 'dark') : (colorMode.preference = 'light'))
</script>

<template>
  <button arua-label="Color Mode" class="inline-block w-5" @click="onClick">
      <ColorScheme placeholder="...">
        <template v-if="colorMode.value === 'dark'">
          <Icon name="mdi:weather-night" class="w-5 h-5" />
          <span class="sr-only">Dark Mode</span>
        </template>
        <template v-else>
          <Icon name="mdi:white-balance-sunny" class="w-5 h-5" />
          <span class="sr-only">Light Mode</span>
        </template>
      </ColorScheme>
  </button>
</template>