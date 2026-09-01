<script setup lang="ts">
defineProps<{ text?: string }>()
</script>

<template><span class="spoiler"><slot>{{ text }}</slot></span></template>
