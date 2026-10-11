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

// 按来源文件分组，每组用 frontmatter 的 title 作为分组标题（未写则兜底显示路径）
const groups = computed(() =>
  (linkDocs.value || [])
    .filter(doc => ((doc.links as FriendLink[]) || []).length > 0)
    .map(doc => ({
      title: doc.title || doc.path,
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

      <!-- 每个友链来源是一个带名字的 section（aria-labelledby 指向组标题），
           无障碍树和 DevTools 里都能看出「这是一组同来源的友链」 -->
      <section
        v-for="(group, gi) in groups"
        :key="group.title"
        :aria-labelledby="`links-group-${gi}`"
        class="mb-8 last:mb-0"
      >
        <h2 :id="`links-group-${gi}`" class="text-sm font-bold text-[var(--txt-90)] mb-4">
          {{ group.title }}
        </h2>

        <!-- ul/li：友链组本质是列表，读屏可以播报「N 项列表」 -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6 list-none p-0 m-0">
          <li v-for="link in group.links" :key="link.url">
            <FriendLinkItem :link="link" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
