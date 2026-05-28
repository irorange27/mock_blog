<template>
  <div class="flex items-center p-4 border rounded-lg shadow-sm dark:border-gray-700 hover:shadow-md transition-shadow">
    <a :href="link.url" target="_blank" rel="noopener noreferrer">
      <img 
        :src="link.avatar" 
        :alt="link.name" 
        class="w-16 h-16 rounded-full object-cover mr-4 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors"
      >
    </a>
    <div class="flex-1">
      <a 
        :href="link.url" 
        target="_blank" 
        rel="noopener noreferrer"
        class="text-lg font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 transition-colors"
      >
        {{ link.name }}
      </a>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ link.description }}
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  link: {
    type: Object,
    required: true,
    validator: (value) => ['name', 'url', 'avatar', 'description'].every(key => key in value)
  }
})
</script>
