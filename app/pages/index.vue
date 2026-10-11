<script setup lang="ts">
useSeoMeta({
  title: "niina's blog",
  description: "niina's blog homepage。",
})

const route = useRoute()
const router = useRouter()

// 页码进 URL（?page=N），刷新/分享不丢；非法或越界回第 1 页
const currentPage = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 && n <= totalPages.value ? n : 1
})
const postsPerPage = 9

const { posts } = useBlogData()

const totalPages = computed(() => Math.ceil(posts.value.length / postsPerPage))

const currentPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  return posts.value.slice(start, start + postsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    router.push({ query: { ...route.query, page: page > 1 ? String(page) : undefined } })
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    // 换页后旧按钮随列表重建，焦点移回列表容器，读屏从列表重新开始
    nextTick(() => postList.value?.focus())
  }
}

const postList = ref<HTMLElement | null>(null)

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
</script>

<template>
  <div class="space-y-3">
    <h1 class="sr-only">最新文章</h1>
    <ul ref="postList" id="post-list" class="space-y-3 outline-none" tabindex="-1">
      <li v-for="post in currentPosts" :key="post.path">
        <article
          class="card-base px-4 pt-3 pb-4 sm:px-7 sm:pt-4 sm:pb-6 hover:border-[var(--line-strong)] hover:-translate-y-0.5 transition-all duration-200">
          <div>
            <NuxtLink :to="post.path" class="block mb-2">
              <h2 class="text-xl font-bold leading-snug text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors">
                {{ post.title }}
              </h2>
            </NuxtLink>

            <div class="flex flex-wrap items-center text-[var(--txt-30)] text-sm mb-3">
              <span>{{ formatDate(post.date) }}</span>
              <span class="mx-1.5" aria-hidden="true">·</span>
              <ul class="flex flex-wrap gap-1.5">
                <li v-for="tag in post.tags" :key="tag">
                  <NuxtLink
                    :to="`/tags/${tag}`"
                    class="chip px-2.5 py-0.5 text-xs rounded-full"
                  >
                    {{ tag }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <p class="text-[var(--txt-50)] text-sm leading-relaxed line-clamp-2">
              {{ post.description || post.title }}
            </p>
          </div>
        </article>
      </li>
    </ul>

    <nav v-if="totalPages > 1" aria-label="分页" class="flex justify-center items-center gap-2 pt-6">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--txt-30)] hover:text-[var(--txt-90)]"
      >
        ← 上一页
      </button>

      <template v-for="page in totalPages" :key="page">
        <button
          v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
          @click="goToPage(page)"
          :aria-current="currentPage === page ? 'page' : undefined"
          :aria-label="`第 ${page} 页`"
          :class="[
            'w-8 h-8 rounded-lg text-sm transition-all',
            currentPage === page
              ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
              : 'text-[var(--txt-30)] hover:text-[var(--txt-90)] hover:bg-[var(--panel-bg-hover)]',
          ]"
        >
          {{ page }}
        </button>
        <span
          v-else-if="Math.abs(page - currentPage) === 2"
          class="text-[var(--txt-25)]"
          aria-hidden="true"
        >
          …
        </span>
      </template>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--txt-30)] hover:text-[var(--txt-90)]"
      >
        下一页 →
      </button>
    </nav>
  </div>
</template>
