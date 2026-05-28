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
  <div class="min-h-screen bg-white dark:bg-gray-800 rounded-lg py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
      <div v-if="pending" class="text-center dark:text-gray-300">
        加载中...
      </div>
      
      <div v-else>
        <ContentDoc path="/links" class="prose max-w-none dark:text-gray-100 dark:prose-invert mb-8" />
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FriendLinkItem
            v-for="(link, index) in links"
            :key="index"
            :link="link"
          />
        </div>
      </div>
    </div>
  </div>
</template>
