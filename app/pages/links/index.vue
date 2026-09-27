<script setup lang="ts">
import type { FriendLink } from '~/types/post'

useSeoMeta({
  title: '友链 | Niina\'s Blog',
  description: '友情链接列表。',
})

// v2 的 queryContent('/links') 是前缀匹配，links/ 下两个文件的 links 数组会合并展示；
// v3 集合是精确路径，这里用 all() 取整个 links 集合保持同样行为
const { data: linkDocs, status } = await useAsyncData('links-pages', () =>
  queryCollection('links').select('path', 'links').all()
)

const links = computed(() =>
  (linkDocs.value || []).flatMap(doc => (doc.links as FriendLink[]) || [])
)
const linksPage = computed(() => (linkDocs.value || []).find(doc => doc.path === '/links'))
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <div v-if="status === 'pending'" class="text-center text-[var(--txt-75)]">
      加载中...
    </div>

    <div v-else>
      <ContentRenderer v-if="linksPage" :value="linksPage" class="prose max-w-none mb-8" />

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
