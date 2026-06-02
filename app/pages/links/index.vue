<script setup lang="ts">
useSeoMeta({
  title: '友链 | Niina\'s Blog',
  description: '友情链接列表。',
})

const { data: linksData, pending } = await useAsyncData('links', async () => {
  const allLinks = await queryContent('/links')
    .only(['links'])
    .find()

  return {
    links: allLinks.flatMap(link => link.links)
  }
})

const links = computed(() => linksData.value?.links || [])
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-8">
    <div v-if="pending" class="text-center dark:text-gray-300">
      加载中...
    </div>
    
    <div v-else>
      <ContentDoc path="/links" class="prose max-w-none dark:text-gray-100 mb-8" />
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FriendLinkItem
          v-for="(link, index) in links"
          :key="index"
          :link="link"
        />
      </div>
    </div>
  </div>
</template>
