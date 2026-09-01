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
  <div class="card-base p-4 sm:p-8">
    <div v-if="pending" class="text-center text-[var(--txt-75)]">
      加载中...
    </div>

    <div v-else>
      <ContentDoc path="/links" class="prose max-w-none mb-8" />
      
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
