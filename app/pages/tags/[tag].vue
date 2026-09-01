<script setup lang="ts">
const route = useRoute()
const { getPostsByTag } = useBlogData()

const taggedPosts = getPostsByTag(route.params.tag as string)

useSeoMeta({
  title: () => `${route.params.tag} | Niina's Blog`,
  description: () => `标签「${route.params.tag}」下的所有文章。`,
})
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <header class="mb-4 sm:mb-8">
      <h1 class="text-lg font-bold mb-2 text-[var(--txt-90)]">
        标签: {{ route.params.tag }}
      </h1>
      <p class="text-[var(--txt-50)]">
        共 {{ taggedPosts.length }} 篇文章
      </p>
    </header>

    <div class="space-y-6">
      <article v-for="post in taggedPosts" :key="post._path"
        class="pb-6 border-b border-[var(--line-color)] last:border-0">
        <NuxtLink :to="post._path">
          <h2 class="text-lg font-bold text-[var(--txt-90)] mb-2 hover:text-[var(--primary)] transition-colors">
            {{ post.title }}
          </h2>
        </NuxtLink>

        <div class="flex items-center text-[var(--txt-50)] text-sm">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <span>{{ post.categories || '默认' }}</span>
          <span class="mx-2">·</span>
          <div class="flex gap-2">
            <NuxtLink
              v-for="t in post.tags"
              :key="t"
              :to="`/tags/${t}`"
              class="chip px-2 py-1 rounded-full"
            >
              {{ t }}
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
