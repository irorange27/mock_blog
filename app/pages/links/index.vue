<script setup lang="ts">
import type { FriendLink } from '~/types/post'

useSeoMeta({
  title: '友链 | Niina\'s Blog',
  description: '友情链接列表。',
})

// v2 的 queryContent('/links') 是前缀匹配，links/ 下两个文件的 links 数组会合并展示；
// v3 集合是精确路径，这里用 all() 取整个 links 集合保持同样行为
// 注意：select 里必须包含 body，否则 ContentRenderer 渲染不出页面正文
const { data: linkDocs, status } = await useAsyncData('links-pages', () =>
  queryCollection('links').select('path', 'title', 'links', 'body').all()
)

// 按来源文件分组：主文件（/links）平铺不加标题，其他来源（如 friends_in_shu）
// 用 frontmatter 的 title 作为分组标题，方便不同渠道的友链带自己的标签
const groups = computed(() =>
  (linkDocs.value || [])
    .filter(doc => ((doc.links as FriendLink[]) || []).length > 0)
    .map(doc => ({
      title: doc.path === '/links' ? '' : (doc.title || doc.path),
      links: (doc.links as FriendLink[]) || [],
    }))
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

      <section v-for="group in groups" :key="group.title || 'main'" class="mb-8 last:mb-0">
        <h2
          v-if="group.title"
          class="text-sm font-bold text-[var(--txt-90)] mb-4 flex items-center gap-2"
        >
          <span class="w-1 h-4 rounded-full bg-[var(--primary)]" />
          {{ group.title }}
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FriendLinkItem
            v-for="(link, index) in group.links"
            :key="index"
            :link="link"
          />
        </div>
      </section>
    </div>
  </div>
</template>
