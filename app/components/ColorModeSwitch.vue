<script setup lang="ts">
const colorMode = useColorMode()
const onClick = () => (colorMode.value === 'light' ? (colorMode.preference = 'dark') : (colorMode.preference = 'light'))
</script>

<template>
  <button 
    aria-label="Color Mode" 
    class="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all"
    @click="onClick"
  >
    <ColorScheme placeholder="...">
      <template v-if="colorMode.value === 'dark'">
        <Icon name="mdi:weather-night" class="w-4 h-4" />
      </template>
      <template v-else>
        <Icon name="mdi:white-balance-sunny" class="w-4 h-4" />
      </template>
    </ColorScheme>
  </button>
</template>
